import type { ReactNode } from "react";

export default function SectionBadge({
  children,
  icon,
}: {
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--archive-border)] bg-white/[0.035] px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--archive-pink-soft)] shadow-[0_0_30px_rgba(221,132,177,0.08)] backdrop-blur-md">
      {icon}
      <span>{children}</span>
    </div>
  );
}
