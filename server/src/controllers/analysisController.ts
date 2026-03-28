import { Request, Response } from "express";
import { analysisQueue, analysisSteps, processCaseAnalysis } from "../jobs/analysisJob.js";
import { prisma } from "../prisma/client.js";
import { calculateRecovery } from "../services/recoveryEngine.js";
import { getNodeType } from "../services/graphBuilder.js";

const AnalysisStatus = {
  QUEUED: "QUEUED"
} as const;

export const analyzeCase = async (req: Request, res: Response) => {
  const caseId = String(req.params.id);

  await prisma.case.update({
    where: { id: caseId },
    data: { analysisStatus: AnalysisStatus.QUEUED }
  });

  try {
    await analysisQueue.add({ caseId });
  } catch {
    setTimeout(() => {
      processCaseAnalysis(caseId).catch(() => undefined);
    }, 50);
  }

  return res.status(202).json({
    status: AnalysisStatus.QUEUED,
    steps: analysisSteps
  });
};

export const getAnalysisStatus = async (req: Request, res: Response) => {
  const caseId = String(req.params.id);
  const record = await prisma.case.findUnique({ where: { id: caseId } });
  if (!record) return res.status(404).json({ message: "Case not found" });

  const progressMap: Record<string, number> = {
    PENDING: 0,
    QUEUED: 10,
    RUNNING: 60,
    DONE: 100,
    FAILED: 100
  } as const;

  return res.json({
    status: record.analysisStatus,
    progress: progressMap[String(record.analysisStatus)] ?? 0,
    currentStep:
      record.analysisStatus === "DONE"
        ? analysisSteps[analysisSteps.length - 1]
        : record.analysisStatus === "RUNNING"
          ? analysisSteps[4]
          : analysisSteps[1]
  });
};

export const getGraph = async (req: Request, res: Response) => {
  const caseId = String(req.params.id);
  const caseRecord = await prisma.case.findUnique({
    where: { id: caseId },
    include: { accounts: true, transactions: true, patternAlerts: true }
  });

  if (!caseRecord) return res.status(404).json({ message: "Case not found" });

  return res.json({
    nodes: caseRecord.accounts.map((account: any) => ({
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
      nodeType: getNodeType(
        account.riskLevel,
        account.chainDepth,
        account.isFrozen,
        account.accountNumber === caseRecord.victimAccount
      ),
      location: account.location,
      isFrozen: account.isFrozen
    })),
    edges: caseRecord.transactions.map((txn: any) => ({
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
      depth: Math.max(...caseRecord.accounts.map((account: any) => account.chainDepth), 0)
    }
  });
};

export const getRisk = async (req: Request, res: Response) => {
  const caseId = String(req.params.id);
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

export const getRecovery = async (req: Request, res: Response) => {
  const caseId = String(req.params.id);
  const caseRecord = await prisma.case.findUnique({
    where: { id: caseId },
    include: { accounts: true, freezeActions: true }
  });

  if (!caseRecord) return res.status(404).json({ message: "Case not found" });

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
    accounts: caseRecord.accounts.map((account: any) => ({
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
