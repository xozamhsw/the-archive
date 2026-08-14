import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

interface CharacterFrameProps {
  children: ReactNode;
  label?: string;
  speechTitle?: string;
  speechText?: string;
  className?: string;
}

export default function CharacterFrame({
  children,
  label = "Aulia · Chapter 20",
  speechTitle,
  speechText,
  className = "",
}: CharacterFrameProps) {
  return (
    <div className={`relative ${className}`}>
      <div
        aria-hidden="true"
        className="absolute -inset-7 rounded-[3rem] bg-[radial-gradient(circle_at_50%_45%,rgba(214,119,168,0.16),transparent_65%)] blur-2xl"
      />

      <div className="relative rounded-[2.15rem] border border-[var(--archive-border-strong)] bg-[#11152f]/70 p-[7px] shadow-[0_35px_100px_rgba(0,0,0,0.36),0_0_70px_rgba(218,123,171,0.1)] sm:p-[9px]">
        <div className="pointer-events-none absolute left-1/2 top-0 z-20 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--archive-border-strong)] bg-[#11152f] text-[var(--archive-gold)] shadow-[0_0_28px_rgba(239,189,130,0.12)]">
          <Sparkles size={18} />
        </div>

        <div className="pointer-events-none absolute inset-[17px] z-10 rounded-[1.65rem] border border-white/[0.07]" />

        <div className="relative aspect-[4/5] overflow-hidden rounded-[1.72rem] bg-[#15183b]">
          {children}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-[#090c21]/78 via-[#090c21]/18 to-transparent" />

          <div className="pointer-events-none absolute bottom-5 left-5 z-20 rounded-full border border-white/[0.08] bg-[#0d1029]/62 px-3 py-1.5 backdrop-blur-md sm:bottom-6 sm:left-6">
            <span className="text-[8px] font-semibold uppercase tracking-[0.2em] text-[var(--archive-gold-soft)]/70">
              {label}
            </span>
          </div>
        </div>
      </div>

      {speechTitle && speechText && (
        <div className="archive-glass absolute -right-3 bottom-[14%] z-30 hidden w-[190px] rounded-[1.15rem] p-4 xl:block">
          <span className="absolute -left-1 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 border-b border-l border-[var(--archive-border)] bg-[#141733]" />

          <p className="archive-display text-sm text-[var(--archive-gold-soft)]">
            {speechTitle}
          </p>

          <p className="mt-1.5 text-[10px] leading-5 text-[var(--archive-muted)]">
            {speechText}
          </p>
        </div>
      )}
    </div>
  );
}
