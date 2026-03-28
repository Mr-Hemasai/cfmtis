import { useEffect } from "react";
import { Link } from "react-router-dom";
import { getCases } from "../api/cases";
import { PageShell } from "../components/layout/PageShell";
import { KPICard } from "../components/recovery/KPICard";
import { RiskPill } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { useCaseStore } from "../store/caseStore";
import { formatINR } from "../utils/format";

export const DashboardPage = () => {
  const cases = useCaseStore((state) => state.cases);
  const setCases = useCaseStore((state) => state.setCases);

  useEffect(() => {
    getCases().then((data) => setCases(data.items));
  }, [setCases]);

  const stats = {
    total: cases.length,
    active: cases.filter((item) => item.status === "ACTIVE").length,
    frozen: 3,
    recovered: 23000
  };

  return (
    <PageShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="font-cond text-3xl uppercase tracking-[0.24em]">Active Case Dashboard</div>
          <div className="mt-1 text-sm text-secondary">Live cyber fraud operations status and active investigations.</div>
        </div>
        <Link to="/case/new">
          <Button variant="primary">New Case</Button>
        </Link>
      </div>
      <div className="mb-6 flex gap-3">
        <Link to="/analyzer/summary" className="text-sm text-blue">Open Analyzer Dashboard</Link>
        <Link to="/analyzer/banks" className="text-sm text-blue">Bank Performance</Link>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KPICard accent="var(--accent-blue)" label="Total Cases This Month" value={String(stats.total)} />
        <KPICard accent="var(--accent-cyan)" label="Active Investigations" value={String(stats.active)} />
        <KPICard accent="var(--accent-orange)" label="Accounts Frozen Today" value={String(stats.frozen)} />
        <KPICard accent="var(--accent-green)" label="Money Recovered" value={formatINR(stats.recovered)} />
      </div>

      <div className="panel-card mt-6 overflow-hidden">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-panel text-xs uppercase tracking-[0.2em] text-secondary">
            <tr>
              {["Case ID", "Victim", "Fraud Amount", "Type", "Status", "Risk Level", "Date", "Action"].map((item) => (
                <th key={item} className="px-4 py-3">{item}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cases.map((item) => (
              <tr key={String(item.id)} className="border-t border-border hover:bg-hover">
                <td className="px-4 py-3 font-mono">{String(item.complaintId)}</td>
                <td className="px-4 py-3">{String(item.victimName)}</td>
                <td className="px-4 py-3">{formatINR(Number(item.fraudAmount))}</td>
                <td className="px-4 py-3">{String(item.fraudType)}</td>
                <td className="px-4 py-3">
                  <span className="rounded-[3px] border border-cyan/30 bg-cyan/10 px-3 py-1 font-mono text-[11px] text-cyan">
                    {String(item.status)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <RiskPill level={String(item.riskLevel)} />
                </td>
                <td className="px-4 py-3 text-secondary">{new Date(String(item.createdAt)).toLocaleDateString("en-IN")}</td>
                <td className="px-4 py-3">
                  <Link to={`/case/${String(item.id)}/complaint`} className="font-cond uppercase tracking-[0.2em] text-blue">
                    Open Case
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
};
