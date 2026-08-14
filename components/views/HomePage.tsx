"use client";

import { useCallback, useState } from "react";
import {
  ArrowRight,
  Camera,
  Gift,
  HeartHandshake,
  Images,
  Sparkles,
  TimerReset,
} from "lucide-react";
import ArchiveOpening from "@/components/ui/ArchiveOpening";
import ArchiveContainer from "@/components/ui/ArchiveContainer";
import ArchiveFeatureCard from "@/components/ui/ArchiveFeatureCard";
import ArchiveShell from "@/components/ui/ArchiveShell";
import CharacterBlink from "@/components/ui/CharacterBlink";
import CharacterFrame from "@/components/ui/CharacterFrame";
import GlowButton from "@/components/ui/GlowButton";
import SectionBadge from "@/components/ui/SectionBadge";

const HOME_FEATURES = [
  {
    number: "01",
    title: "Memory Gallery",
    description:
      "Kumpulan momen berharga yang pernah kita lewati dan simpan bersama.",
    href: "/gallery",
    icon: <Images size={18} />,
  },
  {
    number: "02",
    title: "Photobooth",
    description:
      "Tempat membuat foto baru, sedikit kocak, manis, dan benar-benar hari ini.",
    href: "/photobooth",
    icon: <Camera size={18} />,
  },
  {
    number: "03",
    title: "Friendship Wall",
    description:
      "Pesan, cerita, dan kata-kata kecil yang ingin tetap tinggal untuk Aulia.",
    href: "/wall",
    icon: <HeartHandshake size={18} />,
  },
  {
    number: "04",
    title: "Time Capsule",
    description:
      "Sesuatu untuk masa depan, disimpan hari ini sampai waktunya tiba.",
    href: "/capsule",
    icon: <TimerReset size={18} />,
  },
];

export default function HomePage() {
  const [openingVisible, setOpeningVisible] = useState(true);

  const handleOpeningComplete = useCallback(() => {
    setOpeningVisible(false);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#070b21]">
      {/* =====================================================
          MAIN HOMEPAGE
          Hidden selama opening berlangsung supaya homepage
          tidak sempat terlihat sebelum door muncul.
      ====================================================== */}
      <div
        className={[
          "transition-none",
          openingVisible ? "invisible" : "visible",
        ].join(" ")}
      >
        <ArchiveShell>
          <main className="relative overflow-hidden">
            {/* =====================================================
                HERO
            ====================================================== */}
            <section className="relative">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 overflow-hidden"
              >
                <div className="archive-ambient-pulse absolute left-[46%] top-[14%] h-[420px] w-[420px] rounded-full bg-[#9c5d94]/[0.07] blur-[90px] sm:h-[560px] sm:w-[560px]" />

                <div className="absolute -left-20 bottom-[4%] h-[250px] w-[330px] rounded-[50%] bg-[#8c4c79]/[0.08] blur-[80px]" />

                <svg
                  viewBox="0 0 1440 280"
                  preserveAspectRatio="none"
                  className="absolute inset-x-0 bottom-0 h-[240px] w-full opacity-90"
                >
                  <path
                    d="M0,202 C145,150 228,210 342,165 C470,114 530,188 650,148 C785,102 845,182 963,148 C1085,111 1194,177 1440,114 L1440,280 L0,280 Z"
                    fill="#0b0e27"
                  />

                  <path
                    d="M0,225 C158,194 248,238 390,202 C520,169 616,229 760,195 C925,156 1045,222 1182,191 C1291,167 1362,187 1440,169 L1440,280 L0,280 Z"
                    fill="#080b20"
                  />
                </svg>
              </div>

              <ArchiveContainer
                size="wide"
                className="relative z-10 grid min-h-[calc(100svh-76px)] items-center gap-14 py-14 lg:grid-cols-[0.92fr_1.08fr] lg:gap-12 lg:py-16 xl:gap-20"
              >
                {/* LEFT */}
                <div className="relative z-20 mx-auto w-full max-w-2xl text-center lg:mx-0 lg:text-left">
                  <SectionBadge icon={<Gift size={12} />}>
                    Digital Birthday Gift
                  </SectionBadge>

                  <h1 className="archive-display mt-7 text-[clamp(3.15rem,7.5vw,7rem)] leading-[0.88] tracking-[-0.055em] text-[var(--archive-text)]">
                    Ada hadiah kecil
                    <span className="mt-2 block bg-[linear-gradient(100deg,#f8d7df_0%,#e9a3bd_48%,#f3ba91_100%)] bg-clip-text text-transparent">
                      yang dibuat
                    </span>
                    <span className="relative mt-2 block w-fit bg-[linear-gradient(100deg,#f5cfda_0%,#edb1c5_52%,#f0b286_100%)] bg-clip-text text-transparent lg:mx-0">
                      khusus untukmu
                      <Sparkles
                        size={22}
                        className="absolute -right-7 top-0 text-[var(--archive-gold)] sm:-right-10 sm:top-2 sm:h-7 sm:w-7"
                      />
                    </span>
                  </h1>

                  <p className="mx-auto mt-7 max-w-xl text-sm leading-7 text-[var(--archive-muted)] sm:text-[15px] sm:leading-8 lg:mx-0">
                    Bukan hadiah yang mewah, tapi sebuah ruang kecil berisi
                    kenangan, cerita, dan hal-hal manis yang ingin tetap kamu
                    ingat.
                  </p>

                  <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:justify-start">
                    <GlowButton
                      href="/gallery"
                      className="min-w-[190px]"
                      icon={
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.12]">
                          <ArrowRight size={14} />
                        </span>
                      }
                    >
                      Buka The Archive
                    </GlowButton>

                    <GlowButton
                      href="#journey"
                      variant="secondary"
                      className="min-w-[170px]"
                      icon={
                        <Sparkles
                          size={14}
                          className="text-[var(--archive-gold)]"
                        />
                      }
                    >
                      Mulai Perjalanan
                    </GlowButton>
                  </div>

                  <div className="mt-7 flex items-center justify-center gap-3 lg:justify-start">
                    <div className="flex -space-x-2">
                      {["A", "A", "M"].map((letter, index) => (
                        <span
                          key={`${letter}-${index}`}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-[#0b102a] bg-[linear-gradient(145deg,#c86e9e,#e6a07e)] text-[8px] font-bold text-white shadow-md"
                        >
                          {letter}
                        </span>
                      ))}
                    </div>

                    <p className="text-[10px] leading-5 text-[var(--archive-muted)]">
                      Dibuat dengan hati,
                      <span className="text-[var(--archive-pink-soft)]">
                        {" "}
                        khusus untuk Aulia ♥
                      </span>
                    </p>
                  </div>
                </div>

                {/* RIGHT */}
                <div className="relative mx-auto w-full max-w-[680px] lg:mx-0 lg:ml-auto">
                  <div
                    aria-hidden="true"
                    className="absolute -left-14 top-[16%] hidden h-px w-20 rotate-[-34deg] bg-gradient-to-r from-transparent to-[var(--archive-gold)]/50 lg:block"
                  />

                  <div
                    aria-hidden="true"
                    className="absolute -left-4 top-[13%] hidden h-1.5 w-1.5 rounded-full bg-[var(--archive-gold)] shadow-[0_0_12px_rgba(239,189,130,0.8)] lg:block"
                  />

                  <CharacterFrame
                    label="Aulia · Personal Archive"
                    speechTitle="Hai! Aku Aulia"
                    speechText="Selamat datang di ruang kecil ini. Ada banyak hal yang menunggumu di dalam."
                    className="mx-auto w-full max-w-[560px]"
                  >
                    <CharacterBlink
                      priority
                      imageClassName="object-cover"
                      className="h-full w-full"
                    />
                  </CharacterFrame>
                </div>
              </ArchiveContainer>
            </section>

            {/* =====================================================
                JOURNEY PREVIEW
            ====================================================== */}
            <section
              id="journey"
              className="relative z-20 pb-10 sm:pb-14 lg:-mt-2 lg:pb-16"
            >
              <ArchiveContainer size="wide">
                <div className="mb-5 flex items-center justify-between gap-5">
                  <div className="flex items-center gap-3">
                    <span className="h-px w-8 bg-[var(--archive-gold)]/35" />

                    <p className="text-[8px] font-semibold uppercase tracking-[0.26em] text-[var(--archive-gold-soft)]/58 sm:text-[9px]">
                      Inside The Archive
                    </p>
                  </div>

                  <p className="hidden text-[8px] uppercase tracking-[0.2em] text-[var(--archive-muted)]/55 sm:block">
                    01 — 04
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {HOME_FEATURES.map((feature) => (
                    <ArchiveFeatureCard key={feature.href} {...feature} />
                  ))}
                </div>

                <div className="mt-8 flex items-center justify-center gap-3 text-center">
                  <span className="h-px w-10 bg-[var(--archive-border)]" />

                  <p className="archive-display text-[10px] italic text-[var(--archive-gold-soft)]/55 sm:text-xs">
                    Pelan-pelan ya, setiap halaman dibuat untuk dinikmati.
                  </p>

                  <span className="h-px w-10 bg-[var(--archive-border)]" />
                </div>
              </ArchiveContainer>
            </section>
          </main>
        </ArchiveShell>
      </div>

      {/* =====================================================
          OPENING
      ====================================================== */}
      {openingVisible && <ArchiveOpening onComplete={handleOpeningComplete} />}
    </div>
  );
}
