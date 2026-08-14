import SectionBadge from "./SectionBadge";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}

export default function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className = "",
}: SectionHeadingProps) {
  const centered = align === "center";

  return (
    <div
      className={`${centered ? "mx-auto text-center" : "text-left"} ${className}`}
    >
      {eyebrow && <SectionBadge>{eyebrow}</SectionBadge>}

      <h1 className="archive-display mt-5 text-[clamp(2.6rem,6vw,5.9rem)] leading-[0.92] tracking-[-0.045em] text-[var(--archive-text)]">
        {title}
      </h1>

      {description && (
        <p
          className={`mt-5 max-w-2xl text-sm leading-7 text-[var(--archive-muted)] sm:text-[15px] sm:leading-8 ${
            centered ? "mx-auto" : ""
          }`}
        >
          {description}
        </p>
      )}
    </div>
  );
}
