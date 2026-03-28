import { RiskAccount } from "../../types";
import { formatINR, riskColor } from "../../utils/format";
import { RiskPill } from "../ui/Badge";
import { Button } from "../ui/Button";

export const RiskTable = ({
  items,
  onFreeze
}: {
  items: RiskAccount[];
  onFreeze: (accountId: string) => void;
}) => (
  <div className="panel-card overflow-hidden">
    <table className="w-full border-collapse text-left text-sm">
      <thead className="bg-panel text-xs uppercase tracking-[0.2em] text-secondary">
        <tr>
          <th className="px-4 py-3">#</th>
          <th className="px-4 py-3">Account No.</th>
          <th className="px-4 py-3">Holder Name</th>
          <th className="px-4 py-3">Bank</th>
          <th className="px-4 py-3">Balance</th>
          <th className="px-4 py-3">Risk Score</th>
          <th className="px-4 py-3">Risk Level</th>
          <th className="px-4 py-3">Reason</th>
          <th className="px-4 py-3">Action</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => (
          <tr key={item.id} className="border-t border-border bg-card/70 hover:bg-hover">
            <td className="px-4 py-3 text-secondary">{index + 1}</td>
            <td className="px-4 py-3 font-mono">{item.accountNumber}</td>
            <td className="px-4 py-3">{item.holderName}</td>
            <td className="px-4 py-3 text-secondary">{item.bankName}</td>
            <td className="px-4 py-3">{formatINR(item.currentBalance)}</td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="w-10 font-mono">{Math.round(item.riskScore)}</span>
                <div className="risk-bar h-2 w-32">
                  <span style={{ width: `${item.riskScore}%`, background: riskColor(item.riskLevel) }} />
                </div>
              </div>
            </td>
            <td className="px-4 py-3">
              <RiskPill level={item.riskLevel} />
            </td>
            <td className="px-4 py-3 text-secondary">
              {item.transactionVelocity && item.transactionVelocity > 5 ? "Rapid withdrawal, " : ""}
              {item.chainDepth > 2 ? "Deep chain node" : "Direct mule"}
            </td>
            <td className="px-4 py-3">
              <Button variant="danger" disabled={item.isFrozen} onClick={() => onFreeze(item.id)}>
                {item.isFrozen ? "Frozen" : "Freeze"}
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
