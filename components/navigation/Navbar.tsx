"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { publicNavigation } from "@/data/archive-navigation";
import ArchiveContainer from "@/components/ui/ArchiveContainer";
import MusicPlayer from "@/components/ui/MusicPlayer";
import MobileNavigation from "./MobileNavigation";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="relative z-50 border-b border-white/[0.045] bg-[#070b21]/35 backdrop-blur-xl">
      <ArchiveContainer size="wide" className="flex h-[76px] items-center justify-between gap-6">
        <Link
          href="/"
          className="archive-display shrink-0 text-[15px] tracking-[0.28em] text-[var(--archive-gold-soft)] sm:text-base"
        >
          ✦ THE ARCHIVE ✦
        </Link>

        <nav className="hidden items-center gap-7 lg:flex xl:gap-9">
          {publicNavigation.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative py-2 text-[11px] font-medium transition ${
                  active
                    ? "text-[var(--archive-text)]"
                    : "text-[var(--archive-muted)] hover:text-[var(--archive-text)]"
                }`}
              >
                {item.label}

                {active && (
                  <span className="absolute inset-x-0 -bottom-1 mx-auto h-px w-8 bg-[var(--archive-gold)] shadow-[0_0_10px_rgba(239,189,130,0.55)]" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="hidden lg:block">
          <MusicPlayer />
        </div>

        <MobileNavigation />
      </ArchiveContainer>
    </header>
  );
}
