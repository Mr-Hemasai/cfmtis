import { PropsWithChildren } from "react";

export const KPICard = ({
  accent,
  label,
  value,
  children
}: PropsWithChildren<{ accent: string; label: string; value: string }>) => (
  <div className="panel-card relative overflow-hidden p-5">
    <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: accent }} />
    <div className="font-cond text-xs uppercase tracking-[0.22em] text-secondary">{label}</div>
    <div className="count-up mt-3 text-3xl font-semibold text-primary">{value}</div>
    {children}
  </div>
);
