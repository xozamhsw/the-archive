export default function MoonDecoration({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute h-20 w-20 ${className}`}
    >
      <div className="absolute inset-2 rounded-full bg-[var(--archive-gold-soft)] shadow-[0_0_35px_rgba(239,189,130,0.18)]" />
      <div className="absolute -right-0 top-0 h-[72px] w-[72px] rounded-full bg-[var(--archive-night)]" />
    </div>
  );
}
