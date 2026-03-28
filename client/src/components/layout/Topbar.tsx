import { useAuthStore } from "../../store/authStore";
import { MonoBadge } from "../ui/Badge";

export const Topbar = ({ caseId }: { caseId?: string }) => {
  const officer = useAuthStore((state) => state.officer);

  return (
    <header className="fixed left-0 right-0 top-0 z-30 h-[52px] border-b border-border bg-panel/95 px-6 backdrop-blur">
      <div className="flex h-full items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="grid h-7 w-7 place-items-center rounded-[4px] border border-bright bg-card font-cond text-xs tracking-[0.18em] text-primary">
            CF
          </div>
          <div>
            <div className="font-cond text-[18px] uppercase tracking-[0.24em] text-primary">CFMTIS</div>
          </div>
        </div>

        <div className="flex items-center gap-2 font-cond text-xs uppercase tracking-[0.18em] text-secondary">
          <span className="h-2 w-2 rounded-full bg-green" />
          Analysis Engine Online
        </div>

        <div className="flex items-center gap-3">
          {caseId && <MonoBadge>CASE: {caseId}</MonoBadge>}
          <div className="text-right text-sm text-secondary">
            <div>{officer?.name ?? "Officer"}</div>
            <div className="font-mono text-[11px] text-dim">{officer?.rank ?? "Inspector"}</div>
          </div>
        </div>
      </div>
    </header>
  );
};
