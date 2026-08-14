interface PageNumberProps {
  number: string;
  title: string;
  description?: string;
  className?: string;
}

export default function PageNumber({
  number,
  title,
  description,
  className = "",
}: PageNumberProps) {
  return (
    <aside
      className={`hidden xl:flex xl:w-[180px] xl:shrink-0 xl:flex-col xl:items-center xl:pt-8 ${className}`}
    >
      <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-[var(--archive-border)]">
        <span className="absolute -top-1 h-2 w-2 rounded-full bg-[var(--archive-gold)] shadow-[0_0_18px_rgba(239,189,130,0.65)]" />
        <span className="archive-display text-3xl text-[var(--archive-gold-soft)]">
          {number}
        </span>
      </div>

      <p className="mt-5 text-center text-xs font-semibold uppercase tracking-[0.24em] text-[var(--archive-gold-soft)]">
        {title}
      </p>

      {description && (
        <p className="mt-5 max-w-[150px] text-center text-[11px] leading-5 text-[var(--archive-muted)]">
          {description}
        </p>
      )}
    </aside>
  );
}
