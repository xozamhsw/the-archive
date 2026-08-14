"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { archiveJourney } from "@/data/archive-navigation";

export default function JourneyNavigation() {
  const pathname = usePathname();
  const currentIndex = archiveJourney.findIndex((item) => item.href === pathname);

  if (currentIndex === -1) {
    return null;
  }

  const previous = currentIndex > 0 ? archiveJourney[currentIndex - 1] : null;
  const next =
    currentIndex < archiveJourney.length - 1
      ? archiveJourney[currentIndex + 1]
      : null;

  return (
    <div className="grid gap-3 border-t border-white/[0.07] py-8 sm:grid-cols-2">
      {previous ? (
        <Link
          href={previous.href}
          className="group flex items-center gap-4 rounded-2xl border border-transparent px-4 py-4 transition hover:border-[var(--archive-border)] hover:bg-white/[0.025]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--archive-border)] text-[var(--archive-pink-soft)] transition group-hover:-translate-x-1">
            <ArrowLeft size={15} />
          </span>
          <div>
            <p className="text-[9px] uppercase tracking-[0.2em] text-[var(--archive-muted)]">
              Sebelumnya · {previous.number}
            </p>
            <p className="archive-display mt-1 text-xl text-[var(--archive-text)]">
              {previous.title}
            </p>
          </div>
        </Link>
      ) : (
        <div />
      )}

      {next && (
        <Link
          href={next.href}
          className="group flex items-center justify-end gap-4 rounded-2xl border border-transparent px-4 py-4 text-right transition hover:border-[var(--archive-border)] hover:bg-white/[0.025]"
        >
          <div>
            <p className="text-[9px] uppercase tracking-[0.2em] text-[var(--archive-muted)]">
              Selanjutnya · {next.number}
            </p>
            <p className="archive-display mt-1 text-xl text-[var(--archive-text)]">
              {next.title}
            </p>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--archive-border)] text-[var(--archive-pink-soft)] transition group-hover:translate-x-1">
            <ArrowRight size={15} />
          </span>
        </Link>
      )}
    </div>
  );
}
