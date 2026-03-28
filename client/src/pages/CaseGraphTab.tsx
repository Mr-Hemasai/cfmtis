import { useOutletContext } from "react-router-dom";
import { GraphCanvas } from "../components/graph/GraphCanvas";
import { NodeDetailCard } from "../components/graph/NodeDetailCard";
import { useFreeze } from "../hooks/useFreeze";
import { useCaseStore } from "../store/caseStore";
import { useGraphStore } from "../store/graphStore";
import { formatINR } from "../utils/format";

export const CaseGraphTab = () => {
  const { analysisDone } = useOutletContext<{ analysisDone: boolean }>();
  const summary = useGraphStore((state) => state.summary);
  const selectedNode = useGraphStore((state) => state.selectedNode);
  const alerts = useCaseStore((state) => state.patternAlerts);
  const { freezeAccount } = useFreeze();

  if (!analysisDone) {
    return <div className="panel-card p-6 font-mono text-dim">Run analysis from the Complaint tab</div>;
  }

  return (
    <div className="grid h-[calc(100vh-146px)] grid-cols-[1fr_280px] gap-6">
      <section className="relative panel-card overflow-hidden p-4">
        <div className="absolute left-4 top-4 z-10 grid gap-2">
          <div className="rounded-[3px] border border-border bg-panel/90 px-3 py-2 font-mono text-xs">
            Victim Account: {summary?.victimAccount}
          </div>
          <div className="rounded-[3px] border border-border bg-panel/90 px-3 py-2 font-mono text-xs">
            Fraud Amount: {formatINR(summary?.fraudAmount ?? 0)}
          </div>
          <div className="rounded-[3px] border border-border bg-panel/90 px-3 py-2 font-mono text-xs">
            {summary?.accounts ?? 0} Accounts · {summary?.transfers ?? 0} Transfers
          </div>
          <div className="rounded-[3px] border border-border bg-panel/90 px-3 py-2 font-mono text-xs">
            Depth: {summary?.depth ?? 0} Levels
          </div>
        </div>
        <GraphCanvas />
      </section>

      <aside className="flex h-full flex-col gap-4">
        <div className="panel-card p-4">
          <div className="flex flex-wrap gap-2">
            {["Reset View", "Show Labels", "Highlight Suspects", "Color By Depth"].map((item) => (
              <button key={item} className="rounded-[3px] border border-border px-3 py-2 font-cond text-xs uppercase tracking-[0.2em] text-secondary hover:bg-hover">
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="panel-card p-4">
          <div className="section-header">Node Legend</div>
          <div className="mt-4 grid gap-3 text-sm text-secondary">
            {[
              ["Victim", "bg-red"],
              ["Mule", "bg-orange"],
              ["Suspect", "bg-purple"],
              ["Transfer", "bg-yellow"],
              ["Frozen", "bg-slate-500"],
              ["Recovered", "bg-green"]
            ].map(([label, className]) => (
              <div key={label} className="flex items-center gap-3">
                <span className={`h-3 w-3 rounded-full ${className}`} />
                {label}
              </div>
            ))}
          </div>
        </div>

        <NodeDetailCard node={selectedNode} onFreeze={freezeAccount} />

        <div className="panel-card flex-1 p-4">
          <div className="section-header">Pattern Alerts</div>
          <div className="mt-4 grid gap-3">
            {alerts.map((alert, index) => (
              <div
                key={alert.id}
                className="rounded-[4px] border-l-2 bg-card/90 p-3 text-sm"
                style={{
                  borderColor:
                    alert.severity === "CRITICAL"
                      ? "var(--accent-red)"
                      : alert.severity === "HIGH"
                        ? "var(--accent-orange)"
                        : "var(--accent-yellow)",
                  animation: `pulse-number 0.35s ease ${index * 0.1}s both`
                }}
              >
                <div className="font-cond uppercase tracking-[0.18em] text-primary">{alert.type.split("_").join(" ")}</div>
                <div className="mt-1 text-secondary">{alert.message}</div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
};
