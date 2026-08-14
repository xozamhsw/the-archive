"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MotionConfig, motion } from "framer-motion";

import {
  Archive,
  Camera,
  Clock3,
  Image,
  Lock,
  MessageCircle,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";

import { collection, onSnapshot } from "firebase/firestore";

import { db } from "@/lib/firebase";

/* ============================================
   PAGE
============================================ */

export default function AdminDashboard() {
  const [galleryCount, setGalleryCount] = useState(0);
  const [photoCount, setPhotoCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);

  const [loadingGallery, setLoadingGallery] = useState(true);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);

  /* =========================================
     FIREBASE LISTENERS
  ========================================== */

  useEffect(() => {
    /* ========================================
       MEMORY GALLERY
    ======================================== */

    const unsubscribeGallery = onSnapshot(
      collection(db, "gallery"),
      (snapshot) => {
        setGalleryCount(snapshot.size);
        setLoadingGallery(false);
      },
      (error) => {
        console.error("Dashboard gallery count error:", error);
        setLoadingGallery(false);
      },
    );

    /* ========================================
       PHOTOBOOTH
    ======================================== */

    const unsubscribePhotos = onSnapshot(
      collection(db, "photobooth"),
      (snapshot) => {
        setPhotoCount(snapshot.size);
        setLoadingPhotos(false);
      },
      (error) => {
        console.error("Dashboard photobooth count error:", error);
        setLoadingPhotos(false);
      },
    );

    /* ========================================
       WALL MESSAGES
    ======================================== */

    const unsubscribeMessages = onSnapshot(
      collection(db, "wall"),
      (snapshot) => {
        setMessageCount(snapshot.size);
        setLoadingMessages(false);
      },
      (error) => {
        console.error("Dashboard wall count error:", error);
        setLoadingMessages(false);
      },
    );

    return () => {
      unsubscribeGallery();
      unsubscribePhotos();
      unsubscribeMessages();
    };
  }, []);

  /* =========================================
     RENDER
  ========================================== */

  return (
    <MotionConfig
      reducedMotion={process.env.NODE_ENV === "production" ? "user" : "never"}
    >
      <div className="min-h-screen bg-[#08091F] px-4 pb-16 pt-8 text-white sm:px-6 lg:px-8">
        {/* =====================================
            BACKGROUND ATMOSPHERE
        ====================================== */}

        <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
          <div className="absolute left-[15%] top-[8%] h-72 w-72 rounded-full bg-[#8B5CF6]/5 blur-[120px]" />

          <div className="absolute right-[8%] top-[25%] h-80 w-80 rounded-full bg-[#EC4899]/5 blur-[140px]" />

          <div className="absolute bottom-[8%] left-[40%] h-72 w-72 rounded-full bg-[#6366F1]/5 blur-[130px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-[1450px]">
          {/* =====================================
              HEADER
          ====================================== */}

          <motion.header
            initial={{
              opacity: 0,
              y: 15,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.6,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mb-8"
          >
            <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
              {/* TITLE */}

              <div>
                <div className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#D8B4FE]/65">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-[#C084FC]/20 bg-[#C084FC]/10 text-[#D8B4FE]">
                    <Sparkles size={12} />
                  </span>
                  The Archive · Dashboard
                </div>

                <h1 className="font-serif text-4xl leading-[0.95] tracking-tight text-white sm:text-5xl lg:text-[56px]">
                  Welcome
                  <br />
                  <span className="text-[#F3A9C7]">to The Archive</span>
                </h1>

                <p className="mt-5 max-w-2xl text-sm leading-6 text-white/35">
                  Kelola dan pantau seluruh kenangan, foto, pesan, dan koleksi
                  yang tersimpan di dalam The Archive.
                </p>
              </div>

              {/* STATS */}

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <DashboardStat
                  icon={<Image size={14} />}
                  label="Gallery"
                  value={galleryCount}
                  loading={loadingGallery}
                />

                <DashboardStat
                  icon={<Camera size={14} />}
                  label="Photobooth"
                  value={photoCount}
                  loading={loadingPhotos}
                  accent
                />

                <div className="col-span-2 sm:col-span-1">
                  <DashboardStat
                    icon={<MessageCircle size={14} />}
                    label="Messages"
                    value={messageCount}
                    loading={loadingMessages}
                  />
                </div>
              </div>
            </div>
          </motion.header>

          {/* =====================================
              SYSTEM INFO
          ====================================== */}

          <motion.div
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.5,
              delay: 0.08,
            }}
            className="
              mb-8
              flex
              items-center
              gap-3
              rounded-2xl
              border
              border-white/[0.06]
              bg-white/[0.02]
              px-4
              py-3.5
            "
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#F3A9C7]/10 bg-[#F3A9C7]/5 text-[#F3A9C7]">
              <Sparkles size={14} />
            </span>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">
                Archive Overview
              </p>

              <p className="mt-0.5 text-[10px] text-white/25">
                Semua data dashboard diperbarui secara realtime dari The
                Archive.
              </p>
            </div>
          </motion.div>

          {/* =====================================
              OVERVIEW
          ====================================== */}

          <motion.section
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.5,
              delay: 0.12,
            }}
          >
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <div className="mb-1 flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#F3A9C7]/50">
                  <Sparkles size={11} />
                  Overview
                </div>

                <h2 className="font-serif text-2xl text-white/90">
                  Archive Collection
                </h2>

                <p className="mt-1 text-[10px] text-white/25">
                  Ringkasan seluruh koleksi yang tersedia di The Archive.
                </p>
              </div>

              <span className="hidden rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-[8px] font-medium uppercase tracking-[0.12em] text-white/25 sm:inline-flex">
                Live Data
              </span>
            </div>

            {/* =====================================
                MAIN CARDS
            ====================================== */}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {/* =================================
                  MEMORY GALLERY
              ================================== */}

              <DashboardCard
                href="/admin/manage-gallery"
                icon={<Image size={19} />}
                label="Memory Gallery"
                description="Kenangan yang tampil pada timeline."
                value={galleryCount}
                loading={loadingGallery}
              />

              {/* =================================
                  PHOTOBOOTH
              ================================== */}

              <DashboardCard
                href="/admin/monitoring-photo"
                icon={<Camera size={19} />}
                label="Active Photobooth"
                description="Foto yang masih tampil pada Photobooth."
                value={photoCount}
                loading={loadingPhotos}
                accent
              />

              {/* =================================
                  WALL
              ================================== */}

              <DashboardCard
                href="/admin/wall"
                icon={<MessageCircle size={19} />}
                label="Friendship Wall"
                description="Pesan yang tersimpan dari pengunjung."
                value={messageCount}
                loading={loadingMessages}
                accent
              />

              {/* =================================
                  PRIVATE ARCHIVE
              ================================== */}

              <Link
                href="/admin/photo-archive"
                className="
                  group
                  relative
                  overflow-hidden
                  rounded-[24px]
                  border
                  border-white/[0.07]
                  bg-[#0D0E28]/75
                  p-5
                  shadow-[0_15px_50px_rgba(0,0,0,0.18)]
                  backdrop-blur-xl
                  transition-all
                  duration-500
                  hover:-translate-y-1
                  hover:border-[#F3A9C7]/15
                  hover:bg-[#10112D]
                  hover:shadow-[0_25px_65px_rgba(0,0,0,0.28)]
                  sm:p-6
                "
              >
                {/* CARD GLOW */}

                <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-[#D86D9E]/[0.06] blur-[55px] transition duration-500 group-hover:bg-[#D86D9E]/[0.12]" />

                <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-[#F3A9C7]/25 to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />

                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-white/40 transition group-hover:border-[#F3A9C7]/15 group-hover:bg-[#F3A9C7]/5 group-hover:text-[#F3A9C7]">
                      <Archive size={18} />
                    </div>

                    <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.13em] text-white/40">
                      Private
                    </span>
                  </div>

                  <div className="mt-6">
                    <p className="text-lg font-semibold tracking-[-0.02em] text-white/90">
                      Buka Arsip
                    </p>

                    <p className="mt-1 text-sm font-medium text-white/60">
                      Private Photo Archive
                    </p>

                    <p className="mt-1.5 text-xs leading-5 text-white/25">
                      Foto yang tetap tersimpan sebagai kenangan pribadi.
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between">
                    <span className="text-[8px] uppercase tracking-[0.15em] text-[#F3A9C7]/35">
                      Cloudinary Archive
                    </span>

                    <ArrowUpRight
                      size={14}
                      className="text-white/20 transition group-hover:text-[#F3A9C7]/60"
                    />
                  </div>
                </div>
              </Link>
            </div>
          </motion.section>

          {/* =====================================
              QUICK ACCESS
          ====================================== */}

          <motion.section
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.5,
              delay: 0.18,
            }}
            className="mt-10"
          >
            <div className="mb-5">
              <div className="mb-1 flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#F3A9C7]/50">
                <ArrowUpRight size={11} />
                Navigation
              </div>

              <h2 className="font-serif text-2xl text-white/90">
                Quick Access
              </h2>

              <p className="mt-1 text-[10px] text-white/25">
                Akses cepat ke bagian lain dari The Archive.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {/* TIME CAPSULE */}

              <QuickAccessCard
                href="/admin/monitoring-capsule"
                icon={<Clock3 size={18} />}
                title="Time Capsule"
                description="Kelola pesan dan kenangan masa depan."
              />

              {/* MEMORY GALLERY */}

              <QuickAccessCard
                href="/admin/manage-gallery"
                icon={<Image size={18} />}
                title="Memory Gallery"
                description="Kelola koleksi foto dan kenangan."
              />

              {/* FRIENDSHIP WALL */}

              <QuickAccessCard
                href="/admin/wall"
                icon={<MessageCircle size={18} />}
                title="Friendship Wall"
                description="Lihat dan kelola pesan pengunjung."
              />
            </div>
          </motion.section>

          {/* =====================================
              PRIVATE ARCHIVE INFO
          ====================================== */}

          <motion.section
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.5,
              delay: 0.24,
            }}
            className="
              mt-10
              overflow-hidden
              rounded-[24px]
              border
              border-white/[0.07]
              bg-[#0D0E28]/60
              backdrop-blur-xl
            "
          >
            <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-[#F3A9C7]/60">
                  <Lock size={17} />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-white/80">
                      Private Photo Archive
                    </h2>

                    <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-2 py-0.5 text-[7px] font-semibold uppercase tracking-[0.12em] text-white/25">
                      Private
                    </span>
                  </div>

                  <p className="mt-1.5 max-w-2xl text-xs leading-6 text-white/25">
                    Foto yang dihapus oleh user dari The Archive tidak lagi
                    muncul di Monitoring Photobooth, tetapi file aslinya tetap
                    disimpan sebagai kenangan di private archive.
                  </p>
                </div>
              </div>

              <Link
                href="/admin/photo-archive"
                className="
                  inline-flex
                  min-h-10
                  flex-shrink-0
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  border
                  border-[#F3A9C7]/15
                  bg-[#F3A9C7]/5
                  px-4
                  py-2.5
                  text-xs
                  font-semibold
                  text-[#F3A9C7]/70
                  transition-all
                  duration-300
                  hover:border-[#F3A9C7]/25
                  hover:bg-[#F3A9C7]/10
                  hover:text-[#F3A9C7]
                "
              >
                Lihat Private Archive
                <ArrowUpRight size={13} />
              </Link>
            </div>
          </motion.section>

          {/* =====================================
              FOOTER
          ====================================== */}

          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            transition={{
              delay: 0.35,
            }}
            className="mt-10 flex items-center justify-center gap-3"
          >
            <span className="h-px w-10 bg-gradient-to-r from-transparent to-white/[0.08]" />

            <span className="text-[8px] uppercase tracking-[0.2em] text-[#A98B9B]/25">
              The Archive · Dashboard
            </span>

            <span className="h-px w-10 bg-gradient-to-l from-transparent to-white/[0.08]" />
          </motion.div>
        </div>
      </div>
    </MotionConfig>
  );
}

/* ============================================
   DASHBOARD STAT
============================================ */

function DashboardStat({
  icon,
  label,
  value,
  accent = false,
  loading = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: boolean;
  loading?: boolean;
}) {
  return (
    <div className="min-w-[105px] rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 backdrop-blur-xl">
      <div
        className={`mb-2 flex items-center gap-2 ${
          accent ? "text-[#F3A9C7]" : "text-white/25"
        }`}
      >
        {icon}

        <span className="text-[8px] uppercase tracking-[0.12em]">{label}</span>
      </div>

      {loading ? (
        <div className="h-5 w-8 animate-pulse rounded bg-white/[0.06]" />
      ) : (
        <p className="text-xl font-semibold leading-none text-white/85">
          {value}
        </p>
      )}
    </div>
  );
}

/* ============================================
   DASHBOARD CARD
============================================ */

function DashboardCard({
  href,
  icon,
  label,
  description,
  value,
  loading = false,
  accent = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  value: number;
  loading?: boolean;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className="
        group
        relative
        overflow-hidden
        rounded-[24px]
        border
        border-white/[0.07]
        bg-[#0D0E28]/75
        p-5
        shadow-[0_15px_50px_rgba(0,0,0,0.18)]
        backdrop-blur-xl
        transition-all
        duration-500
        hover:-translate-y-1
        hover:border-[#F3A9C7]/15
        hover:bg-[#10112D]
        hover:shadow-[0_25px_65px_rgba(0,0,0,0.28)]
        sm:p-6
      "
    >
      {/* CARD GLOW */}

      <div
        className="
          pointer-events-none
          absolute
          -right-16
          -top-16
          h-36
          w-36
          rounded-full
          bg-[#D86D9E]/[0.045]
          blur-[55px]
          transition
          duration-500
          group-hover:bg-[#D86D9E]/[0.1]
        "
      />

      {/* BOTTOM LINE */}

      <div
        className="
          pointer-events-none
          absolute
          bottom-0
          left-0
          h-px
          w-full
          bg-gradient-to-r
          from-transparent
          via-[#F3A9C7]/25
          to-transparent
          opacity-0
          transition
          duration-500
          group-hover:opacity-100
        "
      />

      <div className="relative">
        {/* TOP */}

        <div className="flex items-start justify-between gap-4">
          <div
            className={`
              flex
              h-11
              w-11
              items-center
              justify-center
              rounded-xl
              border
              transition
              duration-300
              ${
                accent
                  ? "border-[#F3A9C7]/10 bg-[#F3A9C7]/[0.04] text-[#F3A9C7]/65 group-hover:border-[#F3A9C7]/20 group-hover:bg-[#F3A9C7]/[0.07] group-hover:text-[#F3A9C7]"
                  : "border-white/[0.07] bg-white/[0.025] text-white/30 group-hover:border-[#F3A9C7]/15 group-hover:bg-[#F3A9C7]/5 group-hover:text-[#F3A9C7]"
              }
            `}
          >
            {icon}
          </div>

          <ArrowUpRight
            size={16}
            className="text-white/15 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#F3A9C7]/60"
          />
        </div>

        {/* CONTENT */}

        <div className="mt-6">
          {loading ? (
            <div className="h-9 w-16 animate-pulse rounded-lg bg-white/[0.06]" />
          ) : (
            <p className="text-4xl font-semibold tracking-[-0.04em] text-white/90">
              {value}
            </p>
          )}

          <p className="mt-2 text-sm font-semibold text-white/75">{label}</p>

          <p className="mt-1.5 text-xs leading-5 text-white/25">
            {description}
          </p>
        </div>

        {/* FOOTER */}

        <div className="mt-6 flex items-center justify-between">
          <span className="text-[8px] uppercase tracking-[0.15em] text-white/15 transition group-hover:text-[#F3A9C7]/35">
            The Archive
          </span>

          <span className="text-[8px] uppercase tracking-[0.12em] text-white/15">
            View Collection
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ============================================
   QUICK ACCESS CARD
============================================ */

function QuickAccessCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="
        group
        flex
        items-center
        gap-4
        rounded-[20px]
        border
        border-white/[0.07]
        bg-white/[0.02]
        p-4
        backdrop-blur-xl
        transition-all
        duration-300
        hover:-translate-y-0.5
        hover:border-[#F3A9C7]/15
        hover:bg-white/[0.035]
      "
    >
      <div
        className="
          flex
          h-10
          w-10
          flex-shrink-0
          items-center
          justify-center
          rounded-xl
          border
          border-white/[0.07]
          bg-white/[0.025]
          text-white/30
          transition
          duration-300
          group-hover:border-[#F3A9C7]/15
          group-hover:bg-[#F3A9C7]/5
          group-hover:text-[#F3A9C7]
        "
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white/75 transition group-hover:text-white/90">
          {title}
        </p>

        <p className="mt-0.5 text-xs leading-5 text-white/25">{description}</p>
      </div>

      <ArrowUpRight
        size={14}
        className="flex-shrink-0 text-white/15 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#F3A9C7]/60"
      />
    </Link>
  );
}
