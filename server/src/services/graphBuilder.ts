type RiskLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

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
  riskLevel: RiskLevel;
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

export const getNodeType = (
  riskLevel: RiskLevel,
  chainDepth: number,
  isFrozen: boolean,
  isVictim: boolean
): GraphNode["nodeType"] => {
  if (isVictim) return "Victim";
  if (isFrozen) return "Frozen";
  if (riskLevel === "CRITICAL") return "Suspect";
  if (riskLevel === "HIGH") return "Mule";
  if (chainDepth >= 3) return "Transfer";
  return "Recovered";
};
