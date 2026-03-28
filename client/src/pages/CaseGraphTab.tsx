import { useMemo, useState } from "react";
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
  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);
  const selectedNode = useGraphStore((state) => state.selectedNode);
  const selectedEdge = useGraphStore((state) => state.selectedEdge);
  const markNodeInnocent = useGraphStore((state) => state.markNodeInnocent);
  const alerts = useCaseStore((state) => state.patternAlerts);
  const { freezeAccount } = useFreeze();
  const safeAlerts = alerts.filter(Boolean);
  const graphAvailable = analysisDone || nodes.length > 0 || Boolean(summary);
  const [selectedLevel, setSelectedLevel] = useState<"ALL" | number>("ALL");
  const availableLevels = useMemo(
    () => [...new Set(nodes.map((node) => node.chainDepth))].sort((left, right) => left - right),
    [nodes]
  );
  const filteredNodes = useMemo(
    () => (selectedLevel === "ALL" ? nodes : nodes.filter((node) => node.chainDepth === selectedLevel)),
    [nodes, selectedLevel]
  );
  const visibleIds = useMemo(() => new Set(filteredNodes.map((node) => node.id)), [filteredNodes]);
  const filteredEdges = useMemo(
    () =>
      selectedLevel === "ALL"
        ? edges
        : edges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target)),
    [edges, selectedLevel, visibleIds]
  );
  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.accountNumber, node])), [nodes]);
  const selectedSource = selectedEdge ? nodeMap.get(selectedEdge.source) : null;
  const selectedTarget = selectedEdge ? nodeMap.get(selectedEdge.target) : null;

  if (!graphAvailable) {
    return <div className="panel-card p-6 font-mono text-dim">Run analysis from the Complaint tab</div>;
  }

  return (
    <div className="grid h-[calc(100vh-118px)] grid-cols-[minmax(0,1fr)_260px] gap-5">
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
        <GraphCanvas nodes={filteredNodes} edges={filteredEdges} />
      </section>

      <aside className="flex h-full flex-col gap-4">
        <div className="panel-card p-4">
          <div className="section-header">Level Filter</div>
          <div className="mt-4">
            <select
              className="w-full rounded-[8px] border border-border bg-card px-3 py-3 font-mono text-sm text-primary outline-none transition focus:border-cyan"
              value={String(selectedLevel)}
              onChange={(event) =>
                setSelectedLevel(event.target.value === "ALL" ? "ALL" : Number(event.target.value))
              }
            >
              <option value="ALL">All Levels</option>
              {availableLevels.map((level) => (
                <option key={level} value={level}>
                  Level {level}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4 font-mono text-xs text-secondary">
            Showing {filteredNodes.length} entities and {filteredEdges.length} links
          </div>
        </div>

        <NodeDetailCard node={selectedNode} onFreeze={freezeAccount} onMarkInnocent={markNodeInnocent} />

        <div className="panel-card p-4">
          <div className="section-header">Transaction</div>
          {!selectedEdge ? (
            <div className="mt-4 font-mono text-sm text-dim">Select an edge to inspect transaction details.</div>
          ) : (
            <div className="mt-4 grid gap-3 text-sm">
              <div className="rounded-[8px] border border-border bg-card px-3 py-3">
                <div className="font-cond text-xs uppercase tracking-[0.18em] text-secondary">From</div>
                <div className="mt-1 font-mono text-primary">{selectedEdge.source}</div>
                <div className="mt-1 text-secondary">{selectedSource?.holderName ?? "Unknown holder"}</div>
              </div>
              <div className="rounded-[8px] border border-border bg-card px-3 py-3">
                <div className="font-cond text-xs uppercase tracking-[0.18em] text-secondary">To</div>
                <div className="mt-1 font-mono text-primary">{selectedEdge.target}</div>
                <div className="mt-1 text-secondary">{selectedTarget?.holderName ?? "Unknown holder"}</div>
              </div>
              <div className="rounded-[8px] border border-border bg-card px-3 py-3 text-secondary">
                <div>Amount: {formatINR(selectedEdge.amount)}</div>
                <div className="mt-2">
                  Time: {selectedEdge.timestamp ? new Date(selectedEdge.timestamp).toLocaleString("en-IN") : "Unknown"}
                </div>
                {selectedEdge.referenceId && <div className="mt-2">Reference: {selectedEdge.referenceId}</div>}
              </div>
            </div>
          )}
        </div>

        <div className="panel-card flex-1 p-4">
          <div className="section-header">Pattern Alerts</div>
          <div className="mt-4 grid gap-3">
            {safeAlerts.map((alert, index) => (
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
                <div className="font-cond uppercase tracking-[0.18em] text-primary">
                  {String(alert.type ?? "ANALYZER_ALERT").split("_").join(" ")}
                </div>
                <div className="mt-1 text-secondary">{alert.message}</div>
              </div>
            ))}
            {safeAlerts.length === 0 && (
              <div className="font-mono text-sm text-dim">No pattern alerts generated for this case.</div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};
