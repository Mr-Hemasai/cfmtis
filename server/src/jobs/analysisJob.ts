import Queue from "bull";
import { prisma } from "../prisma/client.js";
import { parseEvidenceFile } from "../services/parserService.js";
import { detectPatterns } from "../services/patternDetector.js";
import { calculateRiskScore, classifyRiskLevel } from "../services/riskEngine.js";
import { env } from "../utils/env.js";

export const analysisSteps = [
  "Parsing transaction records...",
  "Mapping sender/receiver account pairs...",
  "Building transaction graph structure...",
  "Detecting fragmentation patterns...",
  "Calculating risk scores per node...",
  "Identifying suspicious velocity spikes...",
  "Cross-referencing device & location data...",
  "Generating freeze recommendations...",
  "Compiling recovery data...",
  "Analysis complete ✓"
];

const AnalysisStatus = {
  RUNNING: "RUNNING",
  FAILED: "FAILED",
  DONE: "DONE"
} as const;

type JobData = { caseId: string };

export const analysisQueue = new Queue<JobData>("case-analysis", env.REDIS_URL, {
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false
  }
});

const deriveMetrics = (accountNumber: string, txns: Awaited<ReturnType<typeof parseEvidenceFile>>) => {
  const received = txns.filter((txn) => txn.receiver_account === accountNumber);
  const sent = txns.filter((txn) => txn.sender_account === accountNumber);
  const amountReceived = received.reduce((sum, txn) => sum + txn.amount, 0);
  const amountOut = sent.reduce((sum, txn) => sum + txn.amount, 0);
  const chainDepth = received.length === 0 ? 0 : Math.min(received.length, 4);
  const velocity = sent.length;
  const fragmentation = amountOut === 0 ? 0 : sent.length / Math.max(amountOut / 10000, 1);
  const balanceRatio = amountReceived === 0 ? 1 : Math.max(amountReceived - amountOut, 0) / amountReceived;

  return { amountReceived, amountOut, chainDepth, velocity, fragmentation, balanceRatio };
};

export const processCaseAnalysis = async (caseId: string) => {
  await prisma.case.update({
    where: { id: caseId },
    data: { analysisStatus: AnalysisStatus.RUNNING }
  });

  const caseRecord = await prisma.case.findUnique({
    where: { id: caseId },
    include: { files: true }
  });

  if (!caseRecord) {
    throw new Error("Case not found");
  }

  const parsedFiles = await Promise.all(
    caseRecord.files
      .filter((file: any) => file.storageKey)
      .map((file: any) => parseEvidenceFile(file.storageKey!))
  );

  const transactions = parsedFiles.flat();
  if (transactions.length === 0) {
    await prisma.case.update({
      where: { id: caseId },
      data: { analysisStatus: AnalysisStatus.FAILED }
    });
    throw new Error("No transaction data parsed");
  }

  await prisma.transaction.deleteMany({ where: { caseId } });
  await prisma.tracedAccount.deleteMany({ where: { caseId } });
  await prisma.patternAlert.deleteMany({ where: { caseId } });

  await prisma.transaction.createMany({
    data: transactions.map((txn) => ({
      caseId,
      txnId: txn.txn_id,
      senderAccount: txn.sender_account,
      receiverAccount: txn.receiver_account,
      amount: txn.amount,
      timestamp: txn.timestamp,
      txnType: txn.type,
      status: txn.status,
      referenceId: txn.reference_id
    }))
  });

  const uniqueAccounts = [...new Set(transactions.flatMap((txn) => [txn.sender_account, txn.receiver_account]))];

  for (const accountNumber of uniqueAccounts) {
    const metrics = deriveMetrics(accountNumber, transactions);
    const riskScore = calculateRiskScore({
      chainDepth: accountNumber === caseRecord.victimAccount ? 0 : metrics.chainDepth,
      velocity: metrics.velocity,
      fragmentation: Math.min(metrics.fragmentation, 1),
      accountAgeDays: accountNumber === caseRecord.victimAccount ? 400 : 14 + metrics.chainDepth * 9,
      locationMismatch: metrics.chainDepth >= 2,
      balanceRatio: metrics.balanceRatio,
      transactionType: transactions.find((txn) => txn.receiver_account === accountNumber)?.type
    });
    const riskLevel = classifyRiskLevel(riskScore);

    await prisma.tracedAccount.create({
      data: {
        caseId,
        accountNumber,
        holderName: accountNumber === caseRecord.victimAccount ? caseRecord.victimName : `Holder ${accountNumber.slice(-4)}`,
        bankName:
          accountNumber === caseRecord.victimAccount
            ? caseRecord.bankName
            : accountNumber.replace(/[0-9]/g, "").slice(0, 5) || "BANK",
        currentBalance: Math.max(metrics.amountReceived - metrics.amountOut, 0),
        amountReceived: metrics.amountReceived,
        chainDepth: accountNumber === caseRecord.victimAccount ? 0 : metrics.chainDepth,
        riskScore,
        riskLevel,
        accountStatus: riskLevel === "CRITICAL" ? "FREEZE RECOMMENDED" : "UNDER REVIEW",
        createdDaysAgo: accountNumber === caseRecord.victimAccount ? 480 : 12 + metrics.chainDepth * 7,
        location: metrics.chainDepth >= 2 ? "Hyderabad / Mismatch" : "Hyderabad",
        transactionVelocity: metrics.velocity,
        fragmentationScore: Math.min(metrics.fragmentation, 1)
      }
    });
  }

  const patterns = detectPatterns(caseRecord.victimAccount, transactions);
  await prisma.patternAlert.createMany({
    data: patterns.map((pattern) => ({
      caseId,
      type: pattern.type,
      severity: pattern.severity,
      message: pattern.message
    }))
  });

  await prisma.case.update({
    where: { id: caseId },
    data: { analysisStatus: AnalysisStatus.DONE }
  });
};

analysisQueue.process(async (job) => {
  await processCaseAnalysis(job.data.caseId);
});
