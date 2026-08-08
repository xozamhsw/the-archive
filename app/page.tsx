"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import Link from "next/link";

type Stage = "loading" | "door" | "welcome";

const DOOR_EASE = [0.76, 0, 0.24, 1] as const;

export default function HomePage() {
  const [stage, setStage] = useState<Stage>("loading");

  useEffect(() => {
    /**
     * Opening dibuat lebih cepat.
     *
     * 0ms
     * ↓
     * Loading
     *
     * 2100ms
     * ↓
     * Door
     *
     * 3600ms
     * ↓
     * Welcome
     */
    const loadingTimer = window.setTimeout(() => {
      setStage("door");
    }, 2100);

    const doorTimer = window.setTimeout(() => {
      setStage("welcome");
    }, 3600);

    return () => {
      window.clearTimeout(loadingTimer);

      window.clearTimeout(doorTimer);
    };
  }, []);

  return (
    <MotionConfig reducedMotion="never">
      <main className="relative min-h-[100svh] overflow-hidden bg-[#F7F3FA]">
        {/* =====================================================
            GLOBAL BACKGROUND
        ====================================================== */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
        >
          <div className="absolute -left-32 -top-32 h-[340px] w-[340px] rounded-full bg-[#DCCDF2]/45 blur-[100px] sm:h-[460px] sm:w-[460px]" />

          <div className="absolute -bottom-40 -right-32 h-[400px] w-[400px] rounded-full bg-[#E7D9F5]/60 blur-[110px] sm:h-[560px] sm:w-[560px]" />

          <div className="absolute right-[8%] top-[8%] h-[180px] w-[180px] rounded-full bg-[#F4DDEC]/30 blur-[80px] sm:h-[260px] sm:w-[260px]" />

          <div
            className="absolute inset-0 opacity-[0.16]"
            style={{
              backgroundImage: `
                linear-gradient(
                  rgba(109, 79, 194, 0.045) 1px,
                  transparent 1px
                ),
                linear-gradient(
                  90deg,
                  rgba(109, 79, 194, 0.045) 1px,
                  transparent 1px
                )
              `,
              backgroundSize: "64px 64px",
              maskImage:
                "radial-gradient(circle at center, black, transparent 82%)",
              WebkitMaskImage:
                "radial-gradient(circle at center, black, transparent 82%)",
            }}
          />
        </div>

        <AnimatePresence mode="wait">
          {/* =====================================================
              STAGE 1
              LOADING
          ====================================================== */}
          {stage === "loading" && (
            <motion.section
              key="loading"
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
              transition={{
                duration: 0.28,
              }}
              className="absolute inset-0 z-30 flex items-center justify-center overflow-hidden px-5"
            >
              {/* AMBIENT */}
              <div aria-hidden="true" className="absolute inset-0">
                <div className="absolute left-1/2 top-1/2 h-[390px] w-[390px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#E1D5F2]/45 blur-[90px] sm:h-[520px] sm:w-[520px]" />

                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_15%,rgba(247,243,250,0.26)_65%,rgba(247,243,250,0.78)_100%)]" />
              </div>

              <div className="relative z-10 flex w-full max-w-md flex-col items-center text-center">
                {/* TITLE */}
                <motion.div
                  initial={{
                    opacity: 0,
                    y: -8,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    duration: 0.4,
                  }}
                  className="mb-8 sm:mb-10"
                >
                  <p className="text-[9px] font-semibold uppercase tracking-[0.34em] text-[#6D4FC2]/40 sm:text-[10px]">
                    The Archive
                  </p>

                  <p className="mt-2 text-[8px] uppercase tracking-[0.22em] text-[#3B2E52]/25 sm:text-[9px]">
                    Private Memory Experience
                  </p>
                </motion.div>

                {/* MONOGRAM */}
                <motion.div
                  initial={{
                    opacity: 0,
                    scale: 0.94,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                  }}
                  transition={{
                    duration: 0.45,
                  }}
                  className="relative flex h-[138px] w-[138px] items-center justify-center sm:h-[160px] sm:w-[160px]"
                >
                  {/* OUTER ORBIT */}
                  <motion.div
                    animate={{
                      rotate: 360,
                    }}
                    transition={{
                      duration: 8,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="absolute inset-0 rounded-full border border-[#A78BFA]/18"
                    style={{
                      willChange: "transform",
                    }}
                  >
                    <span className="absolute left-1/2 top-[-3px] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#9877D2] shadow-[0_0_8px_rgba(152,119,210,0.45)]" />
                  </motion.div>

                  {/* SECOND ORBIT */}
                  <motion.div
                    animate={{
                      rotate: -360,
                    }}
                    transition={{
                      duration: 12,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="absolute inset-[12px] rounded-full border border-dashed border-[#A78BFA]/17"
                    style={{
                      willChange: "transform",
                    }}
                  />

                  {/* CENTER */}
                  <div className="absolute inset-[27px] rounded-full border border-white/80 bg-white/55 shadow-[0_10px_30px_rgba(94,67,130,0.06)]" />

                  <div className="relative flex flex-col items-center">
                    <p className="text-xl font-semibold tracking-[-0.06em] text-[#60459D] sm:text-2xl">
                      AAM
                    </p>

                    <span className="mt-1 h-px w-5 bg-[#A78BFA]/40" />

                    <p className="mt-1.5 text-[6px] font-semibold uppercase tracking-[0.2em] text-[#6D4FC2]/35 sm:text-[7px]">
                      Personal
                    </p>
                  </div>
                </motion.div>

                {/* COPY */}
                <motion.div
                  initial={{
                    opacity: 0,
                    y: 8,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    delay: 0.15,
                    duration: 0.4,
                  }}
                  className="mt-8"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.27em] text-[#60459D]/60 sm:text-xs">
                    Mempersiapkan sesuatu...
                  </p>

                  <p className="mx-auto mt-3 max-w-xs text-[10px] leading-5 text-[#3B2E52]/32 sm:text-[11px]">
                    Sedikit waktu. Arsip ini sedang dipersiapkan khusus untukmu.
                  </p>
                </motion.div>

                {/* PROGRESS */}
                <div className="mt-8 w-full max-w-[180px] sm:max-w-[210px]">
                  <div className="h-px overflow-hidden bg-[#6D4FC2]/10">
                    <motion.div
                      initial={{
                        scaleX: 0,
                      }}
                      animate={{
                        scaleX: 1,
                      }}
                      transition={{
                        duration: 1.7,
                        ease: DOOR_EASE,
                      }}
                      style={{
                        transformOrigin: "left center",
                        willChange: "transform",
                      }}
                      className="h-full w-full bg-gradient-to-r from-[#D5C2EF] via-[#8E70C7] to-[#D5C2EF]"
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[7px] font-semibold uppercase tracking-[0.18em] text-[#3B2E52]/22">
                      Loading
                    </span>

                    <motion.span
                      initial={{
                        opacity: 0,
                      }}
                      animate={{
                        opacity: 1,
                      }}
                      transition={{
                        delay: 1.45,
                      }}
                      className="text-[7px] font-semibold uppercase tracking-[0.18em] text-[#6D4FC2]/35"
                    >
                      Ready
                    </motion.span>
                  </div>
                </div>
              </div>
            </motion.section>
          )}

          {/* =====================================================
              STAGE 2
              OPTIMIZED DOOR
          ====================================================== */}
          {stage === "door" && (
            <section
              key="door"
              className="absolute inset-0 z-40 overflow-hidden bg-[#FAF8FC]"
            >
              {/* =================================================
                  BACK LIGHT
                  Tidak lagi memakai blur besar.
              ================================================== */}
              <div className="absolute inset-0 bg-gradient-to-br from-white via-[#FAF8FC] to-[#F0E9F7]" />

              <motion.div
                initial={{
                  scaleX: 0.03,
                  opacity: 0,
                }}
                animate={{
                  scaleX: 1,
                  opacity: [0, 0.8, 0.45],
                }}
                transition={{
                  duration: 0.95,
                  delay: 0.1,
                  ease: DOOR_EASE,
                }}
                style={{
                  transformOrigin: "center",
                  willChange: "transform, opacity",
                }}
                className="absolute inset-y-0 left-[45%] z-[2] w-[10%] bg-white"
              />

              {/* =================================================
                  LEFT DOOR
              ================================================== */}
              <motion.div
                initial={{
                  x: "0%",
                }}
                animate={{
                  x: "-100%",
                }}
                transition={{
                  duration: 1.15,
                  delay: 0.08,
                  ease: DOOR_EASE,
                }}
                style={{
                  willChange: "transform",
                  backfaceVisibility: "hidden",
                }}
                className="absolute inset-y-0 left-0 z-20 w-1/2 overflow-hidden border-r border-[#9172C0]/15 bg-gradient-to-br from-[#EFE7F7] via-[#E5D8F1] to-[#D7C5EA]"
              >
                {/* SIMPLE INNER FRAME */}
                <div className="absolute inset-[14px] border border-white/45 sm:inset-7 lg:inset-10" />

                {/* TOP */}
                <div className="absolute left-6 top-7 sm:left-10 sm:top-10 lg:left-14 lg:top-12">
                  <p className="text-[7px] font-semibold uppercase tracking-[0.34em] text-[#6D4FC2]/34 sm:text-[9px]">
                    Aulia Ayu
                  </p>

                  <div className="mt-3 h-px w-8 bg-[#6D4FC2]/18 sm:w-12" />
                </div>

                {/* GIANT A */}
                <div className="absolute right-[-0.03em] top-1/2 -translate-y-1/2 select-none">
                  <span className="text-[44vw] font-semibold leading-none tracking-[-0.14em] text-white/20 sm:text-[40vw] lg:text-[35vw]">
                    A
                  </span>
                </div>

                {/* BOTTOM */}
                <div className="absolute bottom-7 left-6 sm:bottom-10 sm:left-10 lg:bottom-12 lg:left-14">
                  <p className="text-[7px] font-semibold uppercase tracking-[0.22em] text-[#6D4FC2]/28 sm:text-[8px]">
                    Personal Memory
                  </p>

                  <div className="mt-3 flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-[#8E70C7]/50" />

                    <span className="text-[7px] uppercase tracking-[0.18em] text-[#3B2E52]/22">
                      Part 01
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* =================================================
                  RIGHT DOOR
              ================================================== */}
              <motion.div
                initial={{
                  x: "0%",
                }}
                animate={{
                  x: "100%",
                }}
                transition={{
                  duration: 1.15,
                  delay: 0.08,
                  ease: DOOR_EASE,
                }}
                style={{
                  willChange: "transform",
                  backfaceVisibility: "hidden",
                }}
                className="absolute inset-y-0 right-0 z-20 w-1/2 overflow-hidden border-l border-[#9172C0]/15 bg-gradient-to-bl from-[#EFE7F7] via-[#E5D8F1] to-[#D7C5EA]"
              >
                {/* SIMPLE INNER FRAME */}
                <div className="absolute inset-[14px] border border-white/45 sm:inset-7 lg:inset-10" />

                {/* TOP */}
                <div className="absolute right-6 top-7 text-right sm:right-10 sm:top-10 lg:right-14 lg:top-12">
                  <p className="text-[7px] font-semibold uppercase tracking-[0.34em] text-[#6D4FC2]/34 sm:text-[9px]">
                    Mahardika
                  </p>

                  <div className="ml-auto mt-3 h-px w-8 bg-[#6D4FC2]/18 sm:w-12" />
                </div>

                {/* GIANT M */}
                <div className="absolute left-[0.03em] top-1/2 -translate-y-1/2 select-none">
                  <span className="text-[44vw] font-semibold leading-none tracking-[-0.14em] text-white/20 sm:text-[40vw] lg:text-[35vw]">
                    M
                  </span>
                </div>

                {/* BOTTOM */}
                <div className="absolute bottom-7 right-6 text-right sm:bottom-10 sm:right-10 lg:bottom-12 lg:right-14">
                  <p className="text-[7px] font-semibold uppercase tracking-[0.22em] text-[#6D4FC2]/28 sm:text-[8px]">
                    Chapter Twenty
                  </p>

                  <div className="mt-3 flex items-center justify-end gap-2">
                    <span className="text-[7px] uppercase tracking-[0.18em] text-[#3B2E52]/22">
                      Age
                    </span>

                    <span className="h-1 w-1 rounded-full bg-[#8E70C7]/50" />

                    <span className="text-[7px] font-semibold text-[#6D4FC2]/30">
                      20
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* =================================================
                  CENTER SEAL
              ================================================== */}
              <motion.div
                initial={{
                  opacity: 1,
                  scale: 1,
                }}
                animate={{
                  opacity: 0,
                  scale: 0.88,
                }}
                transition={{
                  duration: 0.38,
                  delay: 0.18,
                  ease: "easeOut",
                }}
                style={{
                  willChange: "transform, opacity",
                }}
                className="pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2"
              >
                <div className="relative flex h-[70px] w-[70px] items-center justify-center rounded-full border border-[#8F70C0]/20 bg-[#FAF8FC] shadow-[0_10px_30px_rgba(80,54,111,0.1)] sm:h-[82px] sm:w-[82px]">
                  <div className="absolute inset-[6px] rounded-full border border-dashed border-[#8F70C0]/15" />

                  <div className="relative text-center">
                    <p className="text-[10px] font-semibold tracking-[-0.03em] text-[#6D4FC2]/65 sm:text-[11px]">
                      AAM
                    </p>

                    <p className="mt-1 text-[5px] font-semibold uppercase tracking-[0.2em] text-[#6D4FC2]/30 sm:text-[6px]">
                      Archive
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* CENTER LINE */}
              <motion.div
                initial={{
                  opacity: 0.45,
                }}
                animate={{
                  opacity: 0,
                }}
                transition={{
                  duration: 0.35,
                  delay: 0.15,
                }}
                className="pointer-events-none absolute inset-y-0 left-1/2 z-[21] w-px -translate-x-1/2 bg-[#8E70C7]/25"
              />
            </section>
          )}

          {/* =====================================================
              STAGE 3
              WELCOME
          ====================================================== */}
          {stage === "welcome" && (
            <motion.section
              key="welcome"
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              transition={{
                duration: 0.55,
              }}
              className="relative z-10 flex min-h-[100svh] items-center px-5 py-16 sm:px-8 sm:py-20 lg:px-12"
            >
              <div className="mx-auto w-full max-w-6xl">
                {/* TOP META */}
                <motion.div
                  initial={{
                    opacity: 0,
                    y: -10,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    delay: 0.1,
                    duration: 0.45,
                  }}
                  className="mb-10 flex items-center justify-between sm:mb-14"
                >
                  <div className="flex items-center gap-3">
                    <span className="h-px w-7 bg-[#6D4FC2]/35 sm:w-10" />

                    <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-[#6D4FC2]/45 sm:text-[10px]">
                      The Archive
                    </p>
                  </div>

                  <p className="text-[8px] font-semibold uppercase tracking-[0.22em] text-[#6D4FC2]/30 sm:text-[9px]">
                    For Aulia · 20
                  </p>
                </motion.div>

                {/* HERO */}
                <div className="grid items-center gap-10 lg:grid-cols-[1fr_0.7fr] lg:gap-16 xl:gap-24">
                  {/* LEFT */}
                  <div>
                    <motion.div
                      initial={{
                        opacity: 0,
                        y: 12,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      transition={{
                        delay: 0.15,
                        duration: 0.5,
                      }}
                    >
                      <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#D7C8EA]/70 bg-white/60 px-3.5 py-2 shadow-sm sm:mb-6">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#A78BFA]" />

                        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#6D4FC2]/55">
                          Arsip berhasil dibuka
                        </span>
                      </div>
                    </motion.div>

                    <motion.h1
                      initial={{
                        opacity: 0,
                        y: 16,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      transition={{
                        delay: 0.2,
                        duration: 0.55,
                      }}
                      className="max-w-3xl text-[clamp(2.9rem,8.8vw,6.3rem)] font-semibold leading-[0.92] tracking-[-0.065em] text-[#392D49]"
                    >
                      Selamat Datang,
                      <span className="relative mt-1 block w-fit text-[#7859BD] sm:mt-2">
                        Aulia
                        <span className="absolute -right-7 -top-1 text-[0.28em] sm:-right-10">
                          🌸
                        </span>
                      </span>
                    </motion.h1>

                    <motion.p
                      initial={{
                        opacity: 0,
                        y: 14,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      transition={{
                        delay: 0.3,
                        duration: 0.55,
                      }}
                      className="mt-7 max-w-lg text-sm leading-7 text-[#3B2E52]/58 sm:mt-8 sm:text-[15px] sm:leading-8"
                    >
                      Sebuah ruang kecil berisi kenangan, cerita, dan hal-hal
                      yang ingin kami simpan untukmu — di usia yang ke-20 ini.
                    </motion.p>

                    <motion.div
                      initial={{
                        opacity: 0,
                        y: 14,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      transition={{
                        delay: 0.38,
                        duration: 0.55,
                      }}
                      className="mt-8 flex flex-col gap-4 sm:mt-10 sm:flex-row sm:items-center"
                    >
                      <Link
                        href="/gallery"
                        className="group inline-flex min-h-13 items-center justify-center gap-4 rounded-full bg-[#6D4FC2] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_14px_35px_rgba(109,79,194,0.2)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#5D40AD] sm:w-fit sm:px-8"
                      >
                        <span>Masuk ke Archive</span>

                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/12 transition-transform duration-300 group-hover:translate-x-1">
                          →
                        </span>
                      </Link>

                      <p className="text-center text-[10px] leading-5 text-[#3B2E52]/35 sm:text-left">
                        Ada beberapa hal
                        <br className="hidden sm:block" />
                        yang menunggumu di dalam.
                      </p>
                    </motion.div>
                  </div>

                  {/* RIGHT CARD */}
                  <motion.div
                    initial={{
                      opacity: 0,
                      x: 20,
                    }}
                    animate={{
                      opacity: 1,
                      x: 0,
                    }}
                    transition={{
                      delay: 0.25,
                      duration: 0.55,
                    }}
                    className="relative mx-auto w-full max-w-[380px] lg:mx-0 lg:ml-auto"
                  >
                    <div className="absolute inset-0 translate-x-3 translate-y-3 rotate-[3deg] rounded-[2rem] border border-[#CDBAE5]/50 bg-[#DED0EF]/45 sm:translate-x-4 sm:translate-y-4" />

                    <div className="relative overflow-hidden rounded-[1.8rem] border border-white/80 bg-white/70 p-5 shadow-[0_24px_70px_rgba(83,61,111,0.13)] sm:p-6">
                      <div className="relative">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-[8px] font-semibold uppercase tracking-[0.26em] text-[#6D4FC2]/35">
                              Personal Archive
                            </p>

                            <p className="mt-1 text-xs font-medium text-[#3B2E52]/55">
                              No. 020
                            </p>
                          </div>

                          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#D8C8F0] bg-[#F7F3FA]">
                            <span className="text-lg">✦</span>
                          </div>
                        </div>

                        <div className="my-7 h-px bg-gradient-to-r from-[#D8C8F0] via-[#A78BFA]/40 to-transparent" />

                        <div className="relative overflow-hidden rounded-[1.35rem] bg-[#3A2D4C] px-5 py-8 text-white sm:px-6 sm:py-9">
                          <div className="absolute -right-4 -top-8 select-none text-[9rem] font-semibold leading-none tracking-[-0.12em] text-white/[0.035]">
                            20
                          </div>

                          <p className="relative text-[8px] font-semibold uppercase tracking-[0.25em] text-[#D8C8F0]/60">
                            Chapter
                          </p>

                          <div className="relative mt-4 flex items-end justify-between">
                            <p className="text-7xl font-semibold leading-none tracking-[-0.08em] sm:text-8xl">
                              20
                            </p>

                            <div className="pb-2 text-right">
                              <p className="text-[8px] uppercase tracking-[0.18em] text-white/35">
                                Year
                              </p>

                              <p className="mt-1 text-xs font-medium text-white/75">
                                Aulia
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 grid grid-cols-2 gap-3">
                          <div className="rounded-xl border border-[#D8C8F0]/55 bg-[#F7F3FA]/75 px-3 py-3">
                            <p className="text-[8px] uppercase tracking-[0.2em] text-[#6D4FC2]/35">
                              Type
                            </p>

                            <p className="mt-1 text-[11px] font-semibold text-[#3B2E52]/70">
                              Memory
                            </p>
                          </div>

                          <div className="rounded-xl border border-[#D8C8F0]/55 bg-[#F7F3FA]/75 px-3 py-3">
                            <p className="text-[8px] uppercase tracking-[0.2em] text-[#6D4FC2]/35">
                              Access
                            </p>

                            <p className="mt-1 text-[11px] font-semibold text-[#3B2E52]/70">
                              For You
                            </p>
                          </div>
                        </div>

                        <div className="mt-6 flex items-center justify-between border-t border-[#D8C8F0]/45 pt-4">
                          <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-[#6D4FC2]/30">
                            The Archive
                          </p>

                          <div className="flex gap-1">
                            <span className="h-1 w-1 rounded-full bg-[#A78BFA]" />
                            <span className="h-1 w-1 rounded-full bg-[#A78BFA]/45" />
                            <span className="h-1 w-1 rounded-full bg-[#A78BFA]/20" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>

                <motion.footer
                  initial={{
                    opacity: 0,
                  }}
                  animate={{
                    opacity: 1,
                  }}
                  transition={{
                    delay: 0.6,
                    duration: 0.5,
                  }}
                  className="mt-12 flex items-center justify-between border-t border-[#D8C8F0]/35 pt-5 sm:mt-16"
                >
                  <p className="text-[8px] font-medium uppercase tracking-[0.2em] text-[#3B2E52]/25 sm:text-[9px]">
                    Made to be remembered
                  </p>

                  <p className="text-[8px] font-medium uppercase tracking-[0.2em] text-[#3B2E52]/25 sm:text-[9px]">
                    00 / 05
                  </p>
                </motion.footer>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </MotionConfig>
  );
}
