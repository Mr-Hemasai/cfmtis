import { NavLink } from "react-router-dom";

const tabs = [
  { label: "Complaint & Upload", key: "complaint" },
  { label: "Money Trail Graph", key: "graph" },
  { label: "Risk & Freeze", key: "risk" },
  { label: "Recovery Dashboard", key: "recovery" }
];

export const NavTabs = ({ caseId, analysisDone }: { caseId: string; analysisDone: boolean }) => (
  <nav className="fixed left-0 right-0 top-[52px] z-20 h-[42px] border-b border-border bg-panel/90 px-6 backdrop-blur">
    <div className="flex h-full items-stretch gap-2">
      {tabs.map((tab) => {
        const disabled = !analysisDone && tab.key !== "complaint";
        const to = `/case/${caseId}/${tab.key}`;
        return (
          <NavLink
            key={tab.key}
            to={disabled ? "#" : to}
            className={({ isActive }) =>
              `flex items-center gap-2 border-b-2 px-4 font-cond text-[13px] uppercase tracking-[0.18em] ${
                disabled
                  ? "cursor-not-allowed border-transparent text-dim"
                  : isActive
                    ? "border-cyan bg-cyan/10 text-cyan"
                    : "border-transparent text-secondary hover:bg-hover"
              }`
            }
            onClick={(event) => {
              if (disabled) event.preventDefault();
            }}
          >
            {tab.label}
          </NavLink>
        );
      })}
    </div>
  </nav>
);
