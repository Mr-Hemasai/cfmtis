import { useAuthStore } from "../../store/authStore";
import { MonoBadge } from "../ui/Badge";

export const Topbar = ({ caseId }: { caseId?: string }) => {
  const officer = useAuthStore((state) => state.officer);

  return (
    <header className="fixed left-0 right-0 top-0 z-30 h-[58px] border-b border-border bg-panel/92 px-6 backdrop-blur">
      <div className="flex h-full items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-[12px] border border-bright bg-card shadow-sm">
            <img
              src="/anantapur-police-logo.jpg"
              alt="Ananthapuramu Police logo"
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <div className="font-cond text-[18px] uppercase tracking-[0.24em] text-primary">CFMTIS</div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-secondary">Cyber Fraud Money Trail Intelligence</div>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-cond text-xs uppercase tracking-[0.18em] text-secondary">
          <span className="h-2 w-2 rounded-full bg-green shadow-[0_0_0_4px_rgba(79,138,99,0.12)]" />
          Analysis Engine Online
        </div>

        <div className="flex items-center gap-3">
          {caseId && <MonoBadge>CASE: {caseId}</MonoBadge>}
          <div className="text-right text-sm text-secondary">
            <div>{officer?.name ?? "Officer"}</div>

          </div>
        </div>
      </div>
    </header>
  );
};
