import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

interface ArchiveFeatureCardProps {
  number: string;
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
}

export default function ArchiveFeatureCard({
  number,
  title,
  description,
  href,
  icon,
}: ArchiveFeatureCardProps) {
  return (
    <Link
      href={href}
      className="group relative min-h-[170px] overflow-hidden rounded-[1.45rem] border border-[var(--archive-border)] bg-[#111633]/72 p-5 shadow-[0_22px_55px_rgba(0,0,0,0.18)] transition duration-300 hover:-translate-y-1 hover:border-[var(--archive-border-strong)] hover:bg-[#171a3d]/90 hover:shadow-[0_28px_70px_rgba(0,0,0,0.26),0_0_40px_rgba(216,120,168,0.08)] sm:p-6"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(226,143,181,0.12),transparent_68%)] opacity-0 transition duration-300 group-hover:opacity-100"
      />

      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--archive-border-strong)] bg-[linear-gradient(145deg,rgba(209,115,167,0.16),rgba(237,159,120,0.09))] text-[var(--archive-pink-soft)] shadow-[0_0_24px_rgba(221,126,172,0.09)]">
            {icon}
          </div>

          <span className="archive-display text-[11px] tracking-[0.16em] text-[var(--archive-gold)]/55">
            {number}
          </span>
        </div>

        <div className="mt-6 flex flex-1 items-end justify-between gap-5">
          <div>
            <h3 className="archive-display text-[1.12rem] text-[var(--archive-gold-soft)] sm:text-[1.22rem]">
              {title}
            </h3>

            <p className="mt-2 max-w-[250px] text-[11px] leading-5 text-[var(--archive-muted)] sm:text-xs">
              {description}
            </p>
          </div>

          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.07] bg-white/[0.035] text-[var(--archive-pink-soft)] transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:bg-white/[0.07]">
            <ArrowUpRight size={14} />
          </span>
        </div>
      </div>
    </Link>
  );
}
