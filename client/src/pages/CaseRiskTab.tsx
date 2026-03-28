import { useOutletContext } from "react-router-dom";
import { RiskTable } from "../components/risk/RiskTable";
import { Button } from "../components/ui/Button";
import { useFreeze } from "../hooks/useFreeze";
import { useCaseStore } from "../store/caseStore";
import { formatINR, riskColor } from "../utils/format";

export const CaseRiskTab = () => {
  const { analysisDone } = useOutletContext<{ analysisDone: boolean }>();
  const items = useCaseStore((state) => state.riskData);
  const { freezeAccount, freezeCritical } = useFreeze();
  const recoveryTotals = useCaseStore((state) => state.recoveryData.totals);
  const factors = [
    { label: "Rapid Splitting", value: 82, level: "HIGH" },
    { label: "Transaction Velocity", value: 61, level: "MEDIUM" },
    { label: "New Account (<30d)", value: 74, level: "HIGH" },
    { label: "Location Mismatch", value: 36, level: "LOW" },
    { label: "Chain Depth (>3)", value: 57, level: "MEDIUM" }
  ];

  if (!analysisDone) {
    return <div className="panel-card p-6 font-mono text-dim">Run analysis from the Complaint tab</div>;
  }

  const criticalCount = items.filter((item) => item.riskLevel === "CRITICAL").length;
  const frozenCount = items.filter((item) => item.isFrozen).length;

  return (
    <div className="grid grid-cols-[1fr_320px] gap-6">
      <RiskTable items={items} onFreeze={freezeAccount} />
      <aside className="flex flex-col gap-4">
        <div className="panel-card p-4">
          <div className="section-header">Risk Factors</div>
          <div className="mt-4 grid gap-4">
            {factors.map((factor) => (
              <div key={factor.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{factor.label}</span>
                  <span className="font-mono" style={{ color: riskColor(factor.level) }}>{factor.level}</span>
                </div>
                <div className="risk-bar h-2">
                  <span style={{ width: `${factor.value}%`, background: riskColor(factor.level) }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="panel-card p-4">
          <div className="section-header">Freeze Summary</div>
          <div className="mt-4 grid gap-2 font-mono text-sm text-secondary">
            <div className="flex justify-between"><span>Accounts Analyzed</span><span>{items.length}</span></div>
            <div className="flex justify-between"><span>Recommended Freeze</span><span>{criticalCount}</span></div>
            <div className="flex justify-between"><span>Under Review</span><span>{items.filter((item) => item.riskLevel === "HIGH").length}</span></div>
            <div className="flex justify-between"><span>Frozen</span><span>{frozenCount}</span></div>
            <div className="my-1 border-t border-border" />
            <div className="flex justify-between text-primary"><span>Amount Secured</span><span>{formatINR(recoveryTotals?.frozen ?? 0)}</span></div>
          </div>
          <Button variant="danger" fullWidth className="mt-4" onClick={freezeCritical}>
            Freeze All Critical Accounts
          </Button>
        </div>
      </aside>
    </div>
  );
};
