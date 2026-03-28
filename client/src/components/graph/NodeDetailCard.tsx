import { GraphNode } from "../../types";
import { formatINR, riskColor } from "../../utils/format";
import { Button } from "../ui/Button";
import { RiskPill } from "../ui/Badge";

export const NodeDetailCard = ({
  node,
  onFreeze
}: {
  node: GraphNode | null;
  onFreeze: (accountId: string) => void;
}) => {
  if (!node) {
    return <div className="panel-card p-4 font-mono text-sm text-dim">Select a node to inspect trace details.</div>;
  }

  return (
    <div className="panel-card p-4">
      <div className="font-mono text-sm text-cyan">{node.accountNumber}</div>
      <div className="mt-1 text-lg text-primary">{node.holderName}</div>
      <div className="mt-1 text-sm text-secondary">{node.bankName}</div>
      <div className="mt-4 grid gap-2 text-sm text-secondary">
        <div>Amount Received: {formatINR(node.amountReceived)}</div>
        <div>Balance: {formatINR(node.currentBalance)}</div>
        <div>Depth: {node.chainDepth}</div>
        <div>Location: {node.location ?? "Unknown"}</div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <RiskPill level={node.riskLevel} />
        <span className="font-mono text-sm" style={{ color: riskColor(node.riskLevel) }}>
          {Math.round(node.riskScore)}
        </span>
      </div>
      <div className="risk-bar mt-3 h-2">
        <span style={{ width: `${node.riskScore}%`, background: riskColor(node.riskLevel) }} />
      </div>
      <Button
        variant="danger"
        fullWidth
        disabled={node.isFrozen}
        className="mt-4"
        onClick={() => onFreeze(node.id)}
      >
        {node.isFrozen ? "Frozen" : "Freeze Account"}
      </Button>
    </div>
  );
};
