"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";

interface ArchiveOpeningProps {
  onComplete: () => void;
}

type OpeningStage = "prelude" | "door";

const DOOR_EASE = [0.76, 0, 0.24, 1] as const;

export default function ArchiveOpening({ onComplete }: ArchiveOpeningProps) {
  const [stage, setStage] = useState<OpeningStage>("prelude");

  useEffect(() => {
    // Prelude selesai → langsung buka door
    const doorTimer = window.setTimeout(() => {
      setStage("door");
    }, 1250);

    // Door:
    // 0s       → mulai
    // 1.08s    → door selesai
    // 0.15s    → beri sedikit ruang agar transisi terasa selesai
    const completeTimer = window.setTimeout(
      () => {
        onComplete();
      },
      1250 + 1080 + 150,
    );

    return () => {
      window.clearTimeout(doorTimer);
      window.clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <MotionConfig reducedMotion="never">
      <div className="fixed inset-0 z-[100] overflow-hidden">
        <AnimatePresence mode="wait">
          {stage === "prelude" && (
            <motion.section
              key="prelude"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.24 }}
              className="absolute inset-0 flex items-center justify-center overflow-hidden px-6"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(112,67,133,0.25),transparent_36%),radial-gradient(circle_at_24%_68%,rgba(205,100,151,0.09),transparent_30%),linear-gradient(180deg,#070b21_0%,#0b102d_100%)]" />

              {[
                ["12%", "18%", "0.7s"],
                ["78%", "16%", "1.2s"],
                ["86%", "68%", "1.7s"],
                ["22%", "75%", "1.1s"],
                ["65%", "34%", "1.9s"],
                ["38%", "20%", "1.45s"],
              ].map(([left, top, delay]) => (
                <motion.span
                  key={`${left}-${top}`}
                  initial={{ opacity: 0.18, scale: 0.8 }}
                  animate={{
                    opacity: [0.18, 0.8, 0.18],
                    scale: [0.8, 1.25, 0.8],
                  }}
                  transition={{
                    duration: 2.2,
                    delay: Number.parseFloat(delay),
                    repeat: Infinity,
                  }}
                  className="absolute h-1 w-1 rounded-full bg-[var(--archive-gold-soft)]"
                  style={{ left, top }}
                />
              ))}

              <div className="relative z-10 flex w-full max-w-xl flex-col items-center text-center">
                <motion.p
                  initial={{ opacity: 0, y: -7 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.42 }}
                  className="archive-display text-[10px] uppercase tracking-[0.46em] text-[var(--archive-gold)]/72 sm:text-xs"
                >
                  ✦ The Archive ✦
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: 0.12,
                    duration: 0.55,
                    ease: DOOR_EASE,
                  }}
                  className="relative mt-9 flex h-24 w-24 items-center justify-center rounded-full border border-[var(--archive-border-strong)] bg-[#11152f]/80 shadow-[0_0_55px_rgba(220,126,172,0.12)] sm:h-28 sm:w-28"
                >
                  <div className="absolute inset-[7px] rounded-full border border-dashed border-[var(--archive-gold)]/22" />

                  <div>
                    <p className="archive-display text-2xl tracking-[-0.04em] text-[var(--archive-gold-soft)] sm:text-3xl">
                      AAM
                    </p>

                    <p className="mt-1 text-[6px] uppercase tracking-[0.26em] text-[var(--archive-muted)]">
                      Chapter 20
                    </p>
                  </div>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.24, duration: 0.46 }}
                  className="archive-display mt-8 text-xl text-[var(--archive-text)] sm:text-2xl"
                >
                  Ada sesuatu yang disimpan khusus untukmu.
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.37, duration: 0.4 }}
                  className="mt-3 text-[9px] uppercase tracking-[0.22em] text-[var(--archive-muted)] sm:text-[10px]"
                >
                  Aulia Ayu Mahardika · 20
                </motion.p>

                <div className="mt-8 h-px w-[190px] overflow-hidden bg-white/[0.06] sm:w-[240px]">
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{
                      duration: 1.02,
                      ease: DOOR_EASE,
                    }}
                    style={{ transformOrigin: "left center" }}
                    className="h-full w-full bg-gradient-to-r from-[var(--archive-pink)] via-[var(--archive-gold)] to-[var(--archive-pink)]"
                  />
                </div>
              </div>
            </motion.section>
          )}

          {stage === "door" && (
            <section key="door" className="absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 bg-transparent" />

              {/* LEFT DOOR */}
              <motion.div
                initial={{ x: "0%" }}
                animate={{ x: "-100%" }}
                transition={{
                  duration: 1.08,
                  ease: DOOR_EASE,
                }}
                style={{
                  willChange: "transform",
                  backfaceVisibility: "hidden",
                }}
                className="absolute inset-y-0 left-0 z-20 w-1/2 overflow-hidden border-r border-white/[0.05] bg-[linear-gradient(135deg,#111432_0%,#241a43_58%,#3a2147_100%)]"
              >
                <div className="absolute inset-4 border border-white/[0.055] sm:inset-8" />

                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_28%,rgba(226,139,179,0.1),transparent_28%)]" />

                <div className="absolute left-7 top-8 sm:left-12 sm:top-12">
                  <p className="text-[7px] font-semibold uppercase tracking-[0.34em] text-[var(--archive-gold-soft)]/52 sm:text-[9px]">
                    Aulia Ayu
                  </p>

                  <div className="mt-3 h-px w-9 bg-[var(--archive-gold)]/25 sm:w-12" />
                </div>

                <span className="archive-display absolute right-[-0.03em] top-1/2 -translate-y-1/2 select-none text-[44vw] leading-none text-white/[0.035] sm:text-[39vw] lg:text-[34vw]">
                  A
                </span>

                <div className="absolute bottom-8 left-7 sm:bottom-12 sm:left-12">
                  <p className="text-[7px] uppercase tracking-[0.22em] text-[var(--archive-muted)]/55">
                    Personal Memory
                  </p>
                </div>
              </motion.div>

              {/* RIGHT DOOR */}
              <motion.div
                initial={{ x: "0%" }}
                animate={{ x: "100%" }}
                transition={{
                  duration: 1.08,
                  ease: DOOR_EASE,
                }}
                style={{
                  willChange: "transform",
                  backfaceVisibility: "hidden",
                }}
                className="absolute inset-y-0 right-0 z-20 w-1/2 overflow-hidden border-l border-white/[0.05] bg-[linear-gradient(225deg,#111432_0%,#241a43_58%,#3a2147_100%)]"
              >
                <div className="absolute inset-4 border border-white/[0.055] sm:inset-8" />

                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_72%,rgba(235,156,120,0.09),transparent_30%)]" />

                <div className="absolute right-7 top-8 text-right sm:right-12 sm:top-12">
                  <p className="text-[7px] font-semibold uppercase tracking-[0.34em] text-[var(--archive-gold-soft)]/52 sm:text-[9px]">
                    Mahardika
                  </p>

                  <div className="ml-auto mt-3 h-px w-9 bg-[var(--archive-gold)]/25 sm:w-12" />
                </div>

                <span className="archive-display absolute left-[0.03em] top-1/2 -translate-y-1/2 select-none text-[44vw] leading-none text-white/[0.035] sm:text-[39vw] lg:text-[34vw]">
                  M
                </span>

                <div className="absolute bottom-8 right-7 text-right sm:bottom-12 sm:right-12">
                  <p className="text-[7px] uppercase tracking-[0.22em] text-[var(--archive-muted)]/55">
                    Chapter Twenty
                  </p>
                </div>
              </motion.div>

              {/* CENTER BADGE */}
              <motion.div
                initial={{ opacity: 1, scale: 1 }}
                animate={{ opacity: 0, scale: 0.86 }}
                transition={{
                  duration: 0.35,
                  ease: DOOR_EASE,
                }}
                className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2"
              >
                <div className="flex h-[74px] w-[74px] items-center justify-center rounded-full border border-[var(--archive-border-strong)] bg-[#11152f] shadow-[0_0_40px_rgba(218,123,171,0.16)] sm:h-[86px] sm:w-[86px]">
                  <div className="text-center">
                    <p className="archive-display text-sm text-[var(--archive-gold-soft)]">
                      AAM
                    </p>

                    <p className="mt-1 text-[5px] uppercase tracking-[0.2em] text-[var(--archive-muted)]">
                      Archive
                    </p>
                  </div>
                </div>
              </motion.div>
            </section>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
