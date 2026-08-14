"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { Menu, X } from "lucide-react";

import { publicNavigation } from "@/data/archive-navigation";
import MusicPlayer from "@/components/ui/MusicPlayer";

export default function MobileNavigation() {
  const [open, setOpen] = useState(false);

  // Lock body scroll ketika mobile navigation terbuka
  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  // Tutup dengan tombol Escape
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      {/* MOBILE MENU BUTTON */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Buka navigasi"
          aria-expanded={open}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--archive-border)] bg-white/[0.035] text-[var(--archive-text)] backdrop-blur-xl"
        >
          <Menu size={18} />
        </button>
      </div>

      {/* MOBILE NAVIGATION OVERLAY */}
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] h-[100dvh] w-screen overflow-y-auto bg-[#070b21]/98 px-5 py-5 backdrop-blur-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Navigasi utama"
          >
            {/* HEADER */}
            <div className="flex items-center justify-between">
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="archive-display text-xl tracking-[0.22em] text-[var(--archive-gold-soft)]"
              >
                THE ARCHIVE
              </Link>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup navigasi"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--archive-border)] text-[var(--archive-text)] transition-colors hover:bg-white/[0.05]"
              >
                <X size={18} />
              </button>
            </div>

            {/* NAVIGATION */}
            <nav className="mt-14 space-y-2">
              {publicNavigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between border-b border-white/[0.07] py-5"
                >
                  <div>
                    <span className="text-[9px] uppercase tracking-[0.22em] text-[var(--archive-gold-soft)]/60">
                      {item.number}
                    </span>

                    <p className="archive-display mt-1 text-3xl text-[var(--archive-text)]">
                      {item.label}
                    </p>
                  </div>

                  <span className="text-[var(--archive-pink-soft)]">→</span>
                </Link>
              ))}
            </nav>

            {/* MUSIC PLAYER */}
            <div className="mt-10 w-full pb-8">
              <MusicPlayer mobile />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
