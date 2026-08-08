"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { collection, onSnapshot } from "firebase/firestore";

import { db } from "@/lib/firebase";

export default function AdminDashboard() {
  const [galleryCount, setGalleryCount] = useState(0);

  const [photoCount, setPhotoCount] = useState(0);

  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
    /**
     * Untuk Dashboard kita hanya membutuhkan jumlah document.
     *
     * Tidak perlu orderBy("createdAt") karena:
     * - lebih ringan
     * - tidak membutuhkan index
     * - document lama tanpa createdAt tetap ikut dihitung
     */

    const unsubscribeGallery = onSnapshot(
      collection(db, "gallery"),
      (snapshot) => {
        setGalleryCount(snapshot.size);
      },
      (error) => {
        console.error("Dashboard gallery count error:", error);
      },
    );

    const unsubscribePhotos = onSnapshot(
      collection(db, "photobooth"),
      (snapshot) => {
        setPhotoCount(snapshot.size);
      },
      (error) => {
        console.error("Dashboard photobooth count error:", error);
      },
    );

    const unsubscribeMessages = onSnapshot(
      collection(db, "wall"),
      (snapshot) => {
        setMessageCount(snapshot.size);
      },
      (error) => {
        console.error("Dashboard wall count error:", error);
      },
    );

    return () => {
      unsubscribeGallery();
      unsubscribePhotos();
      unsubscribeMessages();
    };
  }, []);

  return (
    <div className="p-4 pt-20 sm:p-6 sm:pt-20 lg:p-8">
      <div className="mx-auto max-w-6xl">
        {/* =========================
            HEADER
        ========================== */}
        <header className="mb-8 sm:mb-10">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#6D4FC2]/55">
            The Archive
          </p>

          <h1 className="text-2xl font-bold text-[#3B2E52] sm:text-3xl">
            Dashboard
          </h1>

          <p className="mt-2 text-sm text-[#6D4FC2]/60">
            Selamat datang di panel admin The Archive.
          </p>
        </header>

        {/* =========================
            OVERVIEW TITLE
        ========================== */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#3B2E52]">Overview</h2>

            <p className="mt-1 text-xs text-[#3B2E52]/45">
              Ringkasan konten dan aktivitas terbaru.
            </p>
          </div>
        </div>

        {/* =========================
            DASHBOARD CARDS
        ========================== */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {/* =========================
              MEMORY GALLERY
          ========================== */}
          <Link
            href="/admin/manage-gallery"
            className="group rounded-2xl border border-[#D8C8F0]/30 bg-white/65 p-5 shadow-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#A78BFA]/15 transition group-hover:bg-[#A78BFA]/25">
                <svg
                  className="h-6 w-6 text-[#A78BFA]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>

              <span className="text-lg text-[#6D4FC2]/25 transition group-hover:translate-x-0.5 group-hover:text-[#6D4FC2]/50">
                →
              </span>
            </div>

            <div className="mt-6">
              <p className="text-3xl font-bold tracking-[-0.03em] text-[#3B2E52]">
                {galleryCount}
              </p>

              <p className="mt-1 text-sm font-medium text-[#3B2E52]">
                Memory Gallery
              </p>

              <p className="mt-1 text-xs leading-5 text-[#6D4FC2]/50">
                Kenangan yang tampil pada timeline.
              </p>
            </div>
          </Link>

          {/* =========================
              ACTIVE PHOTOBOOTH
          ========================== */}
          <Link
            href="/admin/monitoring-photo"
            className="group rounded-2xl border border-[#D8C8F0]/30 bg-white/65 p-5 shadow-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#A78BFA]/15 transition group-hover:bg-[#A78BFA]/25">
                <svg
                  className="h-6 w-6 text-[#A78BFA]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />

                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>

              <span className="text-lg text-[#6D4FC2]/25 transition group-hover:translate-x-0.5 group-hover:text-[#6D4FC2]/50">
                →
              </span>
            </div>

            <div className="mt-6">
              <p className="text-3xl font-bold tracking-[-0.03em] text-[#3B2E52]">
                {photoCount}
              </p>

              <p className="mt-1 text-sm font-medium text-[#3B2E52]">
                Foto Aktif
              </p>

              <p className="mt-1 text-xs leading-5 text-[#6D4FC2]/50">
                Hasil Photobooth yang masih tampil.
              </p>
            </div>
          </Link>

          {/* =========================
              PRIVATE PHOTO ARCHIVE
          ========================== */}
          <Link
            href="/admin/photo-archive"
            className="group rounded-2xl border border-[#D8C8F0]/30 bg-white/65 p-5 shadow-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#3B2E52]/10 transition group-hover:bg-[#3B2E52]/15">
                <svg
                  className="h-6 w-6 text-[#3B2E52]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 8h14M5 8a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v1a2 2 0 01-2 2M5 8v11a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                  />
                </svg>
              </div>

              <span className="rounded-full bg-[#3B2E52] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.13em] text-white">
                Private
              </span>
            </div>

            <div className="mt-6">
              <p className="text-lg font-bold tracking-[-0.02em] text-[#3B2E52]">
                Buka Arsip
              </p>

              <p className="mt-1 text-sm font-medium text-[#3B2E52]">
                Private Photo Archive
              </p>

              <p className="mt-1 text-xs leading-5 text-[#6D4FC2]/50">
                Semua foto yang masih tersimpan di Cloudinary.
              </p>
            </div>
          </Link>

          {/* =========================
              WALL MESSAGES
          ========================== */}
          <Link
            href="/admin/wall"
            className="group rounded-2xl border border-[#D8C8F0]/30 bg-white/65 p-5 shadow-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#A78BFA]/15 transition group-hover:bg-[#A78BFA]/25">
                <svg
                  className="h-6 w-6 text-[#A78BFA]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </div>

              <span className="text-lg text-[#6D4FC2]/25 transition group-hover:translate-x-0.5 group-hover:text-[#6D4FC2]/50">
                →
              </span>
            </div>

            <div className="mt-6">
              <p className="text-3xl font-bold tracking-[-0.03em] text-[#3B2E52]">
                {messageCount}
              </p>

              <p className="mt-1 text-sm font-medium text-[#3B2E52]">
                Wall Messages
              </p>

              <p className="mt-1 text-xs leading-5 text-[#6D4FC2]/50">
                Pesan yang tersimpan di Friendship Wall.
              </p>
            </div>
          </Link>
        </div>

        {/* =========================
            PRIVATE ARCHIVE INFO
        ========================== */}
        <section className="mt-8 rounded-2xl border border-[#D8C8F0]/30 bg-white/45 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#3B2E52]/10">
                  🔒
                </span>

                <h2 className="text-sm font-semibold text-[#3B2E52]">
                  Private Photo Archive
                </h2>
              </div>

              <p className="max-w-2xl text-xs leading-6 text-[#3B2E52]/55">
                Foto yang dihapus oleh user dari The Archive tidak lagi muncul
                di Monitoring Photobooth, tetapi file aslinya tetap disimpan
                sebagai kenangan di private archive.
              </p>
            </div>

            <Link
              href="/admin/photo-archive"
              className="inline-flex min-h-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#3B2E52] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#6D4FC2]"
            >
              Lihat Private Archive
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
