export type Officer = {
  id: string;
  badgeNumber: string;
  name: string;
  rank: string;
  department: string;
  role: "ADMIN" | "OFFICER" | "VIEWER";
};

export type CaseRecord = {
  id: string;
  complaintId: string;
  fraudType: string;
  fraudAmount: number;
  victimAccount: string;
  victimName: string;
  victimMobile: string;
  bankName: string;
  fraudTimestamp: string;
  description: string;
  status: "ACTIVE" | "PENDING" | "CLOSED" | "ARCHIVED";
  analysisStatus: "PENDING" | "QUEUED" | "RUNNING" | "DONE" | "FAILED";
};

export type CaseSummary = {
  id: string;
  complaintId: string;
  victimName: string;
  fraudAmount: number;
  fraudType: string;
  status: "ACTIVE" | "PENDING" | "CLOSED" | "ARCHIVED";
  riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  analysisStatus: "PENDING" | "QUEUED" | "RUNNING" | "DONE" | "FAILED";
  createdAt: string;
  officer: {
    name: string;
    rank: string;
  };
};

export type GraphNode = {
  id: string;
  accountNumber: string;
  label: string;
  bankName: string;
  holderName: string;
  amountReceived: number;
  currentBalance: number;
  chainDepth: number;
  riskScore: number;
  riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  nodeType: "Victim" | "Mule" | "Suspect" | "Transfer" | "Frozen" | "Recovered";
  location: string | null;
  isFrozen: boolean;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  amount: number;
  timestamp: string;
  referenceId?: string | null;
};

export type PatternAlert = {
  id: string;
  type: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  message: string;
};

export type RiskAccount = {
  id: string;
  accountNumber: string;
  holderName: string;
  bankName: string;
  currentBalance: number;
  amountReceived: number;
  chainDepth: number;
  riskScore: number;
  riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  accountStatus: string;
  isFrozen: boolean;
  createdDaysAgo?: number | null;
  location?: string | null;
  transactionVelocity?: number | null;
  fragmentationScore?: number | null;
};

export type RecoveryTotals = {
  fraudAmount: number;
  recoverable: number;
  atRisk: number;
  lost: number;
  frozen: number;
  accountsTraced: number;
  recoveryPct: number;
};
