import { analysisSteps, getCaseAnalysisProgress, triggerCaseAnalysis } from "../jobs/analysisJob.js";
import { prisma } from "../prisma/client.js";
import { calculateRecovery } from "../services/recoveryEngine.js";
import { buildMoneyTrailGraph, getNodeType } from "../services/graphBuilder.js";
import { logger } from "../utils/logger.js";
const toRecord = (value, fallback) => value && typeof value === "object" ? value : fallback;
const normalizeAccount = (value) => String(value ?? "")
    .trim()
    .replace(/\s+/g, "");
const getFrozenAccountNumbers = (caseRecord) => new Set((caseRecord.freezeActions ?? [])
    .map((item) => String(item.accountNumber ?? "").trim())
    .filter(Boolean));
const buildCaseTrailGraph = (caseRecord) => buildMoneyTrailGraph({
    victimAccount: caseRecord.victimAccount,
    fallbackBankName: caseRecord.bankName,
    transfers: (caseRecord.transactions ?? []).map((transaction) => ({
        txnId: transaction.txnId,
        senderAccount: transaction.senderAccount,
        receiverAccount: transaction.receiverAccount,
        amount: transaction.amount,
        timestamp: transaction.timestamp,
        referenceId: transaction.referenceId,
        layerLevel: transaction.layerLevel,
        senderBankName: transaction.senderBankName,
        receiverBankName: transaction.receiverBankName
    })),
    withdrawals: (caseRecord.withdrawals ?? []).map((withdrawal) => ({
        accountNumber: withdrawal.accountNumber,
        amount: withdrawal.amount,
        timestamp: withdrawal.timestamp,
        bankName: withdrawal.bank?.name ?? undefined,
        referenceId: withdrawal.referenceId,
        sourceSheet: withdrawal.sourceSheet
    })),
    smallTransactions: []
});
const toAnalyzerGraph = (caseRecord, analysis) => {
    const trailGraph = buildCaseTrailGraph(caseRecord);
    const patternInsights = toRecord(analysis.patternInsights, {
        repeatedAccounts: [],
        repeatedIfsc: [],
        highFrequencySmallTransactions: 0,
        muleAccounts: []
    });
    const recovery = toRecord(analysis.recovery, {
        recoveredAmount: 0,
        lostAmount: 0
    });
    const risk = toRecord(analysis.risk, {
        score: 0,
        level: "LOW"
    });
    const moneyTrail = toRecord(analysis.moneyTrail, {
        participantProfiles: {}
    });
    const participantProfiles = toRecord(moneyTrail.participantProfiles, {});
    const repeatedAccounts = new Set(patternInsights.repeatedAccounts ?? []);
    const muleAccounts = new Set(patternInsights.muleAccounts ?? []);
    const frozenAccounts = getFrozenAccountNumbers(caseRecord);
    const nodes = trailGraph.nodes.map((node, index) => {
        const accountNumber = String(node.accountNumber ?? node.id ?? `node-${index}`);
        const isVictim = normalizeAccount(accountNumber) === normalizeAccount(trailGraph.rootAccount);
        const isMule = muleAccounts.has(accountNumber);
        const repeated = repeatedAccounts.has(accountNumber);
        const isFrozen = frozenAccounts.has(accountNumber);
        const riskLevel = isVictim
            ? "LOW"
            : isMule || repeated || node.withdrawalDetected
                ? "CRITICAL"
                : node.depth >= 2
                    ? "HIGH"
                    : String(risk.level ?? "MEDIUM");
        const riskScore = isVictim
            ? 10
            : Math.min(100, (node.depth + 1) * 18 +
                node.incomingCount * 8 +
                node.outgoingCount * 10 +
                (node.withdrawalDetected ? 24 : 0) +
                (isMule ? 18 : 0) +
                (repeated ? 12 : 0));
        return {
            id: String(node.id ?? accountNumber),
            accountNumber,
            label: accountNumber,
            bankName: String(node.bank ?? caseRecord.bankName ?? "Unknown Bank"),
            holderName: (isVictim
                ? caseRecord.victimName
                : participantProfiles[accountNumber]?.holderName) ??
                `Linked Entity ${index + 1}`,
            phoneNumber: (isVictim
                ? caseRecord.victimMobile
                : participantProfiles[accountNumber]?.phoneNumber) ??
                null,
            amountReceived: Number(node.totalIncoming ?? 0),
            currentBalance: Math.max(Number(node.totalIncoming ?? 0) - Number(node.totalOutgoing ?? 0), 0),
            chainDepth: Number(node.depth ?? 0),
            riskScore,
            riskLevel,
            nodeType: getNodeType(riskLevel, Number(node.depth ?? 0), isFrozen, isVictim),
            location: null,
            isFrozen
        };
    });
    const edges = trailGraph.edges.map((edge, index) => ({
        id: String(edge.id ?? edge.referenceId ?? `edge-${index}`),
        source: String(edge.from ?? ""),
        target: String(edge.to ?? ""),
        amount: Number(edge.amount ?? 0),
        timestamp: String(edge.timestamp?.toISOString?.() ?? caseRecord.fraudTimestamp),
        referenceId: edge.referenceId ? String(edge.referenceId) : null
    }));
    const alerts = [
        ...[muleAccounts.size > 0
                ? {
                    id: "mule-accounts",
                    type: "MULE_ACCOUNTS",
                    severity: "CRITICAL",
                    message: `${muleAccounts.size} linked accounts show mule-account characteristics.`
                }
                : null],
        ...[(patternInsights.highFrequencySmallTransactions ?? 0) > 100
                ? [{
                        id: "micro-fraud",
                        type: "MICRO_FRAUD",
                        severity: "HIGH",
                        message: "High-frequency low-value transactions suggest organized fraud distribution."
                    }]
                : []],
        ...[trailGraph.graphMode === "RELATIONSHIP_FALLBACK"
                ? {
                    id: "graph-incomplete",
                    type: "INCOMPLETE_MONEY_TRAIL",
                    severity: "HIGH",
                    message: "Transfer-layer data is missing, so the graph is inferred from withdrawals and bank actions."
                }
                : null]
    ].filter(Boolean);
    return {
        nodes,
        edges,
        alerts,
        summary: {
            victimAccount: trailGraph.rootAccount || caseRecord.victimAccount,
            fraudAmount: Number(analysis.totalAmount ?? caseRecord.fraudAmount ?? 0),
            accounts: nodes.length,
            transfers: edges.length,
            depth: Math.max(...nodes.map((node) => Number(node.chainDepth ?? 0)), 0)
        }
    };
};
const toAnalyzerRisk = (caseRecord, analysis) => {
    const trailGraph = buildCaseTrailGraph(caseRecord);
    const patternInsights = toRecord(analysis.patternInsights, {
        repeatedAccounts: [],
        muleAccounts: [],
        highFrequencySmallTransactions: 0
    });
    const risk = toRecord(analysis.risk, {
        score: 0,
        level: "LOW"
    });
    const recovery = toRecord(analysis.recovery, {
        recoveredAmount: 0,
        lostAmount: 0
    });
    const moneyTrail = toRecord(analysis.moneyTrail, {
        participantProfiles: {}
    });
    const participantProfiles = toRecord(moneyTrail.participantProfiles, {});
    const repeatedAccounts = new Set(patternInsights.repeatedAccounts ?? []);
    const muleAccounts = new Set(patternInsights.muleAccounts ?? []);
    const frozenAccounts = getFrozenAccountNumbers(caseRecord);
    const items = trailGraph.nodes
        .map((node, index) => {
        const accountNumber = String(node.accountNumber ?? node.id ?? `account-${index}`);
        const isVictim = normalizeAccount(accountNumber) === normalizeAccount(trailGraph.rootAccount);
        const isMule = muleAccounts.has(accountNumber);
        const isRepeated = repeatedAccounts.has(accountNumber);
        const isFrozen = frozenAccounts.has(accountNumber);
        const riskScore = isVictim
            ? 8
            : Math.min(100, (Number(node.depth ?? 0) + 1) * 18 +
                Number(node.incomingCount ?? 0) * 8 +
                Number(node.outgoingCount ?? 0) * 10 +
                (node.withdrawalDetected ? 24 : 0) +
                (isMule ? 18 : 0) +
                (isRepeated ? 12 : 0));
        const riskLevel = (isVictim
            ? "LOW"
            : isMule || isRepeated || node.withdrawalDetected
                ? "CRITICAL"
                : Number(node.depth ?? 0) >= 2
                    ? "HIGH"
                    : String(risk.level ?? "MEDIUM"));
        return {
            id: String(node.id ?? accountNumber),
            accountNumber,
            holderName: isVictim
                ? caseRecord.victimName
                : participantProfiles[accountNumber]?.holderName ?? `Linked Entity ${index + 1}`,
            bankName: String(node.bank ?? caseRecord.bankName ?? "Unknown Bank"),
            currentBalance: Math.max(Number(node.totalIncoming ?? 0) - Number(node.totalOutgoing ?? 0), 0),
            amountReceived: Number(node.totalIncoming ?? 0),
            chainDepth: Number(node.depth ?? 0),
            riskScore,
            riskLevel,
            accountStatus: isFrozen ? "FROZEN" : isVictim ? "VICTIM ACCOUNT" : isMule ? "FREEZE RECOMMENDED" : "UNDER REVIEW",
            isFrozen,
            createdDaysAgo: null,
            location: null,
            transactionVelocity: Number(node.outgoingCount ?? 0),
            fragmentationScore: Number(node.totalIncoming ?? 0) > 0
                ? Math.min(Number(node.outgoingCount ?? 0) / Math.max(Number(node.totalIncoming ?? 0) / 10000, 1), 1)
                : 0
        };
    });
    return {
        items,
        factors: [
            {
                label: "Money Trail Completeness",
                value: trailGraph.graphMode === "TRANSFER" ? 85 : 30,
                level: trailGraph.graphMode === "TRANSFER" ? "MEDIUM" : "HIGH"
            },
            {
                label: "Withdrawal Completion",
                value: Number(recovery.lostAmount ?? 0) > 0 ? 92 : 35,
                level: Number(recovery.lostAmount ?? 0) > 0 ? "HIGH" : "LOW"
            },
            {
                label: "Organized Micro Fraud",
                value: (patternInsights.highFrequencySmallTransactions ?? 0) > 100 ? 88 : 25,
                level: (patternInsights.highFrequencySmallTransactions ?? 0) > 100 ? "HIGH" : "LOW"
            },
            {
                label: "Hold Intervention",
                value: Number(recovery.recoveredAmount ?? 0) > 0 ? 68 : 20,
                level: Number(recovery.recoveredAmount ?? 0) > 0 ? "MEDIUM" : "LOW"
            },
            {
                label: "Case Severity",
                value: Number(risk.score ?? 0),
                level: String(risk.level ?? "LOW")
            }
        ]
    };
};
const toAnalyzerRecovery = (caseRecord, analysis) => {
    const trailGraph = buildCaseTrailGraph(caseRecord);
    const recovery = toRecord(analysis.recovery, {
        recoveredAmount: 0,
        atRiskAmount: 0,
        lostAmount: 0,
        recoveryRate: 0
    });
    const frozenAccounts = getFrozenAccountNumbers(caseRecord);
    const frozenAmount = trailGraph.nodes.reduce((sum, node) => {
        const accountNumber = String(node.accountNumber ?? node.id ?? "");
        if (!frozenAccounts.has(accountNumber))
            return sum;
        const balance = Math.max(Number(node.totalIncoming ?? 0) - Number(node.totalOutgoing ?? 0), 0);
        return sum + balance;
    }, 0);
    const recoverable = Number(recovery.recoveredAmount ?? 0) + frozenAmount;
    const atRisk = Math.max(Number(recovery.atRiskAmount ?? 0) - frozenAmount, 0);
    const lost = Math.max(Number(recovery.lostAmount ?? 0), 0);
    const accounts = trailGraph.nodes
        .slice(0, 25)
        .map((node) => ({
        accountNumber: String(node.accountNumber ?? node.id ?? ""),
        balance: Math.max(Number(node.totalIncoming ?? 0) - Number(node.totalOutgoing ?? 0), 0),
        status: frozenAccounts.has(String(node.accountNumber ?? node.id ?? ""))
            ? "FROZEN"
            : node.withdrawalDetected
                ? "WITHDRAWN"
                : atRisk > 0
                    ? "AT RISK"
                    : "RECOVERABLE"
    }));
    return {
        totals: {
            fraudAmount: Number(analysis.totalAmount ?? caseRecord.fraudAmount ?? 0),
            recoverable,
            atRisk,
            lost,
            frozen: frozenAmount,
            accountsTraced: accounts.length,
            recoveryPct: Number(analysis.totalAmount ?? caseRecord.fraudAmount ?? 0) > 0
                ? (recoverable / Number(analysis.totalAmount ?? caseRecord.fraudAmount ?? 0)) * 100
                : Number(recovery.recoveryRate ?? 0) * 100
        },
        accounts,
        log: [
            {
                timestamp: caseRecord.createdAt,
                level: "INFO",
                message: "Complaint ingested and workbook evidence linked to the active case."
            },
            {
                timestamp: caseRecord.updatedAt,
                level: "INFO",
                message: "Analyzer completed workbook-wide fraud, withdrawal, and recovery assessment."
            },
            {
                timestamp: new Date(),
                level: Number(recovery.atRiskAmount ?? 0) > 0 ? "WARN" : "INFO",
                message: atRisk > 0
                    ? "Residual funds remain at risk and require immediate bank follow-up."
                    : "Residual at-risk exposure is currently low."
            },
            {
                timestamp: new Date(),
                level: String(analysis.risk?.level ?? "LOW") === "CRITICAL" ? "ALERT" : "INFO",
                message: "Analyzer-based recovery posture is available for investigator review."
            }
        ]
    };
};
const AnalysisStatus = {
    QUEUED: "QUEUED"
};
const setNoStore = (res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
};
export const analyzeCase = async (req, res) => {
    const caseId = String(req.params.id);
    const caseRecord = await prisma.case.findUnique({
        where: { id: caseId },
        include: { files: true }
    });
    if (!caseRecord) {
        return res.status(404).json({ message: "Case not found" });
    }
    if (!caseRecord.files.length) {
        return res.status(400).json({ message: "Upload at least one evidence file before analysis." });
    }
    logger.info({
        caseId,
        complaintId: caseRecord.complaintId,
        fileCount: caseRecord.files.length
    }, "ANALYSIS REQUESTED");
    await prisma.case.update({
        where: { id: caseId },
        data: { analysisStatus: AnalysisStatus.QUEUED }
    });
    await triggerCaseAnalysis(caseId);
    return res.status(202).json({
        status: AnalysisStatus.QUEUED,
        steps: analysisSteps
    });
};
export const getAnalysisStatus = async (req, res) => {
    const caseId = String(req.params.id);
    const record = await prisma.case.findUnique({ where: { id: caseId } });
    if (!record)
        return res.status(404).json({ message: "Case not found" });
    setNoStore(res);
    const progressMap = {
        PENDING: 0,
        QUEUED: 10,
        RUNNING: 60,
        DONE: 100,
        FAILED: 100
    };
    const liveProgress = getCaseAnalysisProgress(caseId);
    return res.json({
        status: liveProgress?.status ?? record.analysisStatus,
        progress: liveProgress?.progress ?? progressMap[String(record.analysisStatus)] ?? 0,
        currentStep: liveProgress?.currentStep ??
            (record.analysisStatus === "DONE"
                ? analysisSteps[analysisSteps.length - 1]
                : record.analysisStatus === "RUNNING"
                    ? analysisSteps[4]
                    : analysisSteps[1]),
        error: liveProgress?.error
    });
};
export const getGraph = async (req, res) => {
    const caseId = String(req.params.id);
    const caseRecord = await prisma.case.findUnique({
        where: { id: caseId },
        include: {
            accounts: true,
            transactions: true,
            withdrawals: { include: { bank: true } },
            patternAlerts: true,
            analysis: true,
            freezeActions: true
        }
    });
    if (!caseRecord)
        return res.status(404).json({ message: "Case not found" });
    setNoStore(res);
    if (caseRecord.analysis) {
        return res.json(toAnalyzerGraph(caseRecord, caseRecord.analysis));
    }
    return res.json({
        nodes: caseRecord.accounts.map((account) => ({
            id: account.id,
            accountNumber: account.accountNumber,
            label: account.accountNumber,
            bankName: account.bankName,
            holderName: account.holderName,
            amountReceived: account.amountReceived,
            currentBalance: account.currentBalance,
            chainDepth: account.chainDepth,
            riskScore: account.riskScore,
            riskLevel: account.riskLevel,
            nodeType: getNodeType(account.riskLevel, account.chainDepth, account.isFrozen, account.accountNumber === caseRecord.victimAccount),
            location: account.location,
            isFrozen: account.isFrozen
        })),
        edges: caseRecord.transactions.map((txn) => ({
            id: txn.id,
            source: txn.senderAccount,
            target: txn.receiverAccount,
            amount: txn.amount,
            timestamp: txn.timestamp,
            referenceId: txn.referenceId
        })),
        alerts: caseRecord.patternAlerts,
        summary: {
            victimAccount: caseRecord.victimAccount,
            fraudAmount: caseRecord.fraudAmount,
            accounts: caseRecord.accounts.length,
            transfers: caseRecord.transactions.length,
            depth: Math.max(...caseRecord.accounts.map((account) => account.chainDepth), 0)
        }
    });
};
export const getRisk = async (req, res) => {
    const caseId = String(req.params.id);
    const caseRecord = await prisma.case.findUnique({
        where: { id: caseId },
        include: { analysis: true, transactions: true, withdrawals: { include: { bank: true } }, freezeActions: true }
    });
    if (!caseRecord)
        return res.status(404).json({ message: "Case not found" });
    setNoStore(res);
    if (caseRecord.analysis) {
        return res.json(toAnalyzerRisk(caseRecord, caseRecord.analysis));
    }
    const accounts = await prisma.tracedAccount.findMany({
        where: { caseId },
        orderBy: { riskScore: "desc" }
    });
    return res.json({
        items: accounts,
        factors: [
            { label: "Rapid Splitting", value: 82, level: "HIGH" },
            { label: "Transaction Velocity", value: 61, level: "MEDIUM" },
            { label: "New Account (<30d)", value: 74, level: "HIGH" },
            { label: "Location Mismatch", value: 36, level: "LOW" },
            { label: "Chain Depth (>3)", value: 57, level: "MEDIUM" }
        ]
    });
};
export const getRecovery = async (req, res) => {
    const caseId = String(req.params.id);
    const caseRecord = await prisma.case.findUnique({
        where: { id: caseId },
        include: { accounts: true, freezeActions: true, transactions: true, withdrawals: { include: { bank: true } }, analysis: true }
    });
    if (!caseRecord)
        return res.status(404).json({ message: "Case not found" });
    setNoStore(res);
    if (caseRecord.analysis) {
        return res.json(toAnalyzerRecovery(caseRecord, caseRecord.analysis));
    }
    const totals = calculateRecovery(caseRecord.fraudAmount, caseRecord.accounts);
    return res.json({
        totals: {
            fraudAmount: caseRecord.fraudAmount,
            recoverable: totals.recoverable,
            atRisk: totals.atRisk,
            lost: totals.lost,
            frozen: totals.frozen,
            accountsTraced: caseRecord.accounts.length,
            recoveryPct: totals.recoveryPct
        },
        accounts: caseRecord.accounts.map((account) => ({
            accountNumber: account.accountNumber,
            balance: account.currentBalance,
            status: account.isFrozen
                ? "FROZEN"
                : account.currentBalance < account.amountReceived * 0.1
                    ? "WITHDRAWN"
                    : "AT RISK"
        })),
        log: [
            { timestamp: caseRecord.createdAt, level: "INFO", message: "Complaint ingested and registered." },
            { timestamp: caseRecord.updatedAt, level: "INFO", message: "Graph structure compiled from uploaded evidence." },
            { timestamp: new Date(), level: "WARN", message: "High-velocity split accounts flagged for immediate review." },
            { timestamp: new Date(), level: "ALERT", message: "Freeze recommendations available for critical accounts." }
        ]
    });
};
