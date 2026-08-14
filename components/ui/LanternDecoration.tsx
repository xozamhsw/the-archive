export default function LanternDecoration({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute ${className}`}
    >
      <div className="relative h-28 w-20">
        <div className="absolute left-1/2 top-0 h-5 w-10 -translate-x-1/2 rounded-t-full border-x border-t border-[var(--archive-gold)]/40" />
        <div className="absolute left-1/2 top-4 h-[78px] w-14 -translate-x-1/2 rounded-[45%_45%_35%_35%] border border-[var(--archive-gold)]/45 bg-[#2a1833]/70 shadow-[0_0_30px_rgba(239,168,126,0.12)]" />
        <div className="absolute left-1/2 top-8 h-10 w-7 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,#ffd8a7_0%,#efa87e_38%,rgba(239,168,126,0.06)_72%)] blur-[0.3px]" />
        <div className="absolute bottom-1 left-1/2 h-4 w-8 -translate-x-1/2 border-x border-b border-[var(--archive-gold)]/35" />
      </div>
    </div>
  );
}
