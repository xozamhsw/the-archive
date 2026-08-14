"use client";

import { useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";
import { jsPDF } from "jspdf";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  Download,
  Heart,
  Sparkles,
  Star,
  BookOpen,
  MapPin,
  Images,
} from "lucide-react";

import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

import { db } from "@/lib/firebase";

import ArchiveShell from "@/components/ui/ArchiveShell";
import ArchiveContainer from "@/components/ui/ArchiveContainer";
import SectionBadge from "@/components/ui/SectionBadge";
import PageNumber from "@/components/ui/PageNumber";
import JourneyNavigation from "@/components/navigation/JourneyNavigation";

/* =========================================
    TYPES
========================================= */

interface MemoryItem {
  id: string;
  date: string;
  title: string;
  story: string;
  imageUrl: string;
  location?: string;
  featured?: boolean;
}

/* =========================================
    HELPERS
========================================= */

function formatDate(date: string) {
  if (!date) {
    return "Kenangan";
  }

  return date;
}

/**
 * Mengambil gambar dari URL kemudian mengubahnya
 * menjadi Data URL agar bisa digunakan oleh jsPDF.
 *
 * Penting:
 * URL gambar harus mengizinkan CORS.
 */
async function imageUrlToDataUrl(imageUrl: string): Promise<{
  dataUrl: string;
  format: "JPEG" | "PNG";
} | null> {
  if (!imageUrl) {
    return null;
  }

  try {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error(`Gagal mengambil gambar: ${response.status}`);
    }

    const blob = await response.blob();

    return await new Promise((resolve) => {
      const reader = new FileReader();

      reader.onloadend = () => {
        const result = reader.result;

        if (typeof result !== "string") {
          resolve(null);
          return;
        }

        const mimeType = blob.type.toLowerCase();

        if (mimeType.includes("png")) {
          resolve({
            dataUrl: result,
            format: "PNG",
          });
        } else {
          resolve({
            dataUrl: result,
            format: "JPEG",
          });
        }
      };

      reader.onerror = () => {
        resolve(null);
      };

      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Gagal memuat gambar untuk PDF:", imageUrl, error);

    return null;
  }
}

/**
 * Membuat gambar menjadi proporsi yang sesuai
 * dengan area foto pada PDF.
 */
function calculateImageDimensions(
  imageWidth: number,
  imageHeight: number,
  maxWidth: number,
  maxHeight: number,
) {
  const ratio = Math.min(maxWidth / imageWidth, maxHeight / imageHeight);

  return {
    width: imageWidth * ratio,
    height: imageHeight * ratio,
  };
}

/**
 * Mendapatkan dimensi asli gambar.
 */
async function getImageDimensions(dataUrl: string): Promise<{
  width: number;
  height: number;
} | null> {
  return await new Promise((resolve) => {
    const image = new window.Image();

    image.onload = () => {
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };

    image.onerror = () => {
      resolve(null);
    };

    image.src = dataUrl;
  });
}

/* =========================================
    ENDING PAGE
========================================= */

export default function EndingPage() {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);

  /* =========================================
      FIREBASE
  ========================================== */

  useEffect(() => {
    const galleryQuery = query(
      collection(db, "gallery"),
      orderBy("date", "asc"),
    );

    const unsubscribe = onSnapshot(
      galleryQuery,
      (snapshot) => {
        const galleryItems = snapshot.docs.map((snapshotDoc) => {
          const data = snapshotDoc.data();

          return {
            id: snapshotDoc.id,
            date: data.date ?? "",
            title: data.title ?? "",
            story: data.story ?? "",
            imageUrl: data.imageUrl ?? "",
            location: data.location ?? "",
            featured: data.featured === true,
          } as MemoryItem;
        });

        setMemories(galleryItems);
        setError(null);
        setLoading(false);
      },
      (snapshotError) => {
        console.error("Ending gallery snapshot error:", snapshotError);

        setError("Gagal memuat kenangan dari arsip.");

        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  /* =========================================
      ENDING HIGHLIGHTS
  ========================================== */

  const endingMemories = useMemo(() => {
    if (memories.length === 0) {
      return [];
    }

    /*
     * Featured diprioritaskan.
     * Setelah itu kenangan lainnya mengikuti
     * urutan tanggal dari Gallery.
     */
    const featured = memories.filter((memory) => memory.featured === true);

    const regular = memories.filter((memory) => memory.featured !== true);

    return [...featured, ...regular].slice(0, 4);
  }, [memories]);

  /* =========================================
      CONFETTI
  ========================================== */

  useEffect(() => {
    const duration = 3000;
    const end = Date.now() + duration;

    const colors = ["#A78BFA", "#F5A9D0", "#D8C8F0", "#FFFFFF"];

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: {
          x: 0,
          y: 0.65,
        },
        colors,
      });

      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: {
          x: 1,
          y: 0.65,
        },
        colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    confetti({
      particleCount: 100,
      spread: 90,
      startVelocity: 30,
      origin: {
        y: 0.65,
      },
      colors,
    });

    frame();

    return () => {
      // Animation akan berhenti otomatis
      // setelah durasi selesai.
    };
  }, []);

  /* =========================================
      DOWNLOAD MEMORY BOOK
  ========================================== */

  async function handleDownloadMemoryBook() {
    if (memories.length === 0 || generating) {
      return;
    }

    setGenerating(true);

    try {
      const doc = new jsPDF({
        unit: "pt",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      /* =====================================
          COVER
      ====================================== */

      doc.setFillColor(8, 10, 25);
      doc.rect(0, 0, pageWidth, pageHeight, "F");

      /*
       * Decorative circle
       */

      doc.setFillColor(25, 20, 55);
      doc.circle(pageWidth / 2, pageHeight / 2 - 45, 150, "F");

      doc.setTextColor(216, 200, 240);
      doc.setFontSize(13);
      doc.setFont("helvetica", "normal");

      doc.text("THE ARCHIVE", pageWidth / 2, 235, {
        align: "center",
      });

      doc.setTextColor(245, 235, 247);
      doc.setFontSize(34);
      doc.setFont("helvetica", "bold");

      doc.text("Memory Book", pageWidth / 2, 290, {
        align: "center",
      });

      doc.setFontSize(15);
      doc.setFont("helvetica", "normal");

      doc.setTextColor(216, 200, 240);

      doc.text(
        "Untuk Aulia, dengan segala kenangan yang pernah ada",
        pageWidth / 2,
        325,
        {
          align: "center",
        },
      );

      doc.setTextColor(167, 139, 250);
      doc.setFontSize(10);

      doc.text(
        new Date().toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        pageWidth / 2,
        355,
        {
          align: "center",
        },
      );

      doc.setTextColor(120, 110, 145);
      doc.setFontSize(9);

      doc.text(`${memories.length} kenangan tersimpan`, pageWidth / 2, 385, {
        align: "center",
      });

      doc.setTextColor(90, 82, 110);
      doc.setFontSize(8);

      doc.text(
        "Some stories are worth keeping forever.",
        pageWidth / 2,
        pageHeight - 65,
        {
          align: "center",
        },
      );

      /* =====================================
          MEMORY PAGES
      ====================================== */

      for (let index = 0; index < memories.length; index++) {
        const memory = memories[index];

        doc.addPage();

        /* ===================================
            BACKGROUND
        =================================== */

        doc.setFillColor(8, 10, 25);
        doc.rect(0, 0, pageWidth, pageHeight, "F");

        /* ===================================
            HEADER
        =================================== */

        doc.setTextColor(100, 90, 125);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");

        doc.text(
          `THE ARCHIVE • ${String(index + 1).padStart(2, "0")}`,
          pageWidth - 60,
          45,
          {
            align: "right",
          },
        );

        /* ===================================
            DATE
        =================================== */

        doc.setTextColor(167, 139, 250);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");

        doc.text(formatDate(memory.date), 60, 75);

        /* ===================================
            FEATURED
        =================================== */

        let headerY = 75;

        if (memory.featured) {
          doc.setTextColor(216, 200, 240);
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");

          doc.text("FEATURED MEMORY", 60, 92);

          headerY = 92;
        }

        /* ===================================
            TITLE
        =================================== */

        doc.setTextColor(245, 235, 247);
        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");

        const titleLines = doc.splitTextToSize(
          memory.title || "Tanpa Judul",
          pageWidth - 120,
        );

        doc.text(titleLines, 60, headerY + 35);

        let contentY = headerY + 35 + titleLines.length * 28 + 18;

        /* ===================================
            PHOTO
        =================================== */

        if (memory.imageUrl) {
          const imageData = await imageUrlToDataUrl(memory.imageUrl);

          if (imageData) {
            const imageDimensions = await getImageDimensions(imageData.dataUrl);

            if (imageDimensions) {
              /*
               * Area foto
               */

              const photoX = 60;
              const photoY = contentY;

              const maxPhotoWidth = pageWidth - 120;

              const maxPhotoHeight = 250;

              const dimensions = calculateImageDimensions(
                imageDimensions.width,
                imageDimensions.height,
                maxPhotoWidth,
                maxPhotoHeight,
              );

              /*
               * Background frame
               */

              doc.setFillColor(15, 17, 38);

              doc.roundedRect(
                photoX - 6,
                photoY - 6,
                maxPhotoWidth + 12,
                dimensions.height + 12,
                12,
                12,
                "F",
              );

              /*
               * Gambar asli
               */

              doc.addImage(
                imageData.dataUrl,
                imageData.format,
                photoX + (maxPhotoWidth - dimensions.width) / 2,
                photoY,
                dimensions.width,
                dimensions.height,
              );

              contentY += dimensions.height + 30;
            }
          }
        }

        /* ===================================
            STORY
        =================================== */

        if (memory.story) {
          doc.setTextColor(185, 177, 200);
          doc.setFontSize(11);
          doc.setFont("helvetica", "normal");

          const storyLines = doc.splitTextToSize(memory.story, pageWidth - 120);

          /*
           * Pastikan story tidak keluar
           * dari area halaman.
           */

          const maxStoryLines = 10;

          const visibleStoryLines = storyLines.slice(0, maxStoryLines);

          doc.text(visibleStoryLines, 60, contentY);

          contentY += visibleStoryLines.length * 17 + 20;
        }

        /* ===================================
            LOCATION
        =================================== */

        if (memory.location) {
          doc.setTextColor(167, 139, 250);
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");

          doc.text(`Lokasi: ${memory.location}`, 60, contentY);

          contentY += 25;
        }

        /* ===================================
            DIVIDER
        =================================== */

        doc.setDrawColor(55, 45, 80);

        doc.line(
          60,
          Math.min(contentY, pageHeight - 95),
          pageWidth - 60,
          Math.min(contentY, pageHeight - 95),
        );

        /* ===================================
            FOOTER
        =================================== */

        doc.setTextColor(90, 82, 110);
        doc.setFontSize(8);

        doc.text(
          "Some stories are worth keeping forever.",
          pageWidth / 2,
          pageHeight - 55,
          {
            align: "center",
          },
        );
      }

      /* =====================================
          CLOSING PAGE
      ====================================== */

      doc.addPage();

      doc.setFillColor(23, 18, 45);
      doc.rect(0, 0, pageWidth, pageHeight, "F");

      /*
       * Decorative circle
       */

      doc.setFillColor(38, 27, 65);
      doc.circle(pageWidth / 2, pageHeight / 2 - 40, 145, "F");

      doc.setTextColor(245, 235, 247);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");

      doc.text("Terima Kasih, Aulia.", pageWidth / 2, pageHeight / 2 - 55, {
        align: "center",
      });

      doc.setTextColor(216, 200, 240);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");

      const closingText = doc.splitTextToSize(
        `Sebanyak ${memories.length} kenangan telah disimpan di dalam arsip kecil ini. Semoga setiap cerita, tawa, dan momen yang pernah kita lalui selalu memiliki tempat untuk dikenang.`,
        pageWidth - 150,
      );

      doc.text(closingText, pageWidth / 2, pageHeight / 2 - 10, {
        align: "center",
      });

      doc.setTextColor(167, 139, 250);
      doc.setFontSize(10);

      doc.text("THE ARCHIVE • FOR AULIA", pageWidth / 2, pageHeight - 70, {
        align: "center",
      });

      doc.save("the-archive-memory-book.pdf");
    } catch (error) {
      console.error("Gagal membuat Memory Book:", error);

      alert("Terjadi kesalahan saat membuat Memory Book. Silakan coba lagi.");
    } finally {
      setGenerating(false);
    }
  }

  /* =========================================
      RENDER
  ========================================== */

  return (
    <ArchiveShell>
      <main className="relative overflow-hidden">
        {/* =====================================
            AMBIENT BACKGROUND
        ====================================== */}

        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute inset-0
            overflow-hidden
          "
        >
          {/* Purple glow */}

          <div
            className="
              archive-ambient-pulse
              absolute
              left-[5%]
              top-[10%]
              h-[280px]
              w-[280px]
              rounded-full
              bg-[#9c5d94]/[0.055]
              blur-[100px]
              sm:h-[420px]
              sm:w-[420px]
            "
          />

          {/* Gold glow */}

          <div
            className="
              absolute
              right-[8%]
              top-[20%]
              h-[240px]
              w-[240px]
              rounded-full
              bg-[var(--archive-gold)]/[0.035]
              blur-[100px]
            "
          />

          {/* Pink glow */}

          <div
            className="
              absolute
              bottom-[10%]
              left-[45%]
              h-[300px]
              w-[300px]
              rounded-full
              bg-[#b76ca3]/[0.035]
              blur-[120px]
            "
          />
        </div>

        {/* =====================================
            HEADER
        ====================================== */}

        <section className="relative pt-10 pb-8 sm:pt-14 sm:pb-10">
          <ArchiveContainer size="wide">
            <div className="flex flex-col gap-7 xl:flex-row xl:gap-10">
              {/* Page Number */}

              <PageNumber
                number="05"
                title="Ending"
                description="Sampai jumpa di kenangan berikutnya."
                className="hidden xl:flex"
              />

              {/* Main Content */}

              <div className="min-w-0 flex-1">
                <motion.div
                  initial={{
                    opacity: 0,
                    y: -12,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    duration: 0.7,
                  }}
                >
                  {/* Badge */}

                  <SectionBadge icon={<Heart size={11} />}>
                    Untuk Aulia
                  </SectionBadge>

                  {/* Title */}

                  <h1
                    className="
                      archive-display
                      mt-4
                      max-w-3xl
                      text-[clamp(2.6rem,6vw,5rem)]
                      leading-[0.92]
                      tracking-[-0.045em]
                      text-[var(--archive-text)]
                    "
                  >
                    Terima Kasih
                    <br />
                    Telah Menjadi
                    <br />
                    Bagian Terindah
                  </h1>

                  {/* Description */}

                  <p
                    className="
                      mt-5
                      max-w-xl
                      text-sm
                      leading-relaxed
                      text-[var(--archive-muted)]/70
                    "
                  >
                    Terima kasih untuk setiap tawa, cerita, dukungan, dan waktu
                    berharga yang telah kita lalui bersama.
                    <br />
                    Kenangan ini akan selalu menjadi cahaya di hari-hari kita.
                  </p>

                  {/* Quote */}

                  <motion.div
                    initial={{
                      opacity: 0,
                      y: 15,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    transition={{
                      duration: 0.7,
                      delay: 0.2,
                    }}
                    className="
                      mt-6
                      max-w-xl
                      rounded-2xl
                      border
                      border-[var(--archive-gold)]/[0.12]
                      bg-white/[0.018]
                      px-5
                      py-4
                      backdrop-blur-sm
                    "
                  >
                    <div className="flex gap-3">
                      <Sparkles
                        size={14}
                        className="
                          mt-0.5
                          shrink-0
                          text-[var(--archive-gold-soft)]
                        "
                      />

                      <p
                        className="
                          text-xs
                          italic
                          leading-relaxed
                          text-[var(--archive-muted)]/70
                        "
                      >
                        &ldquo;Beberapa orang datang sebagai cerita, dan kau
                        adalah cerita terbekas.&rdquo;
                      </p>
                    </div>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </ArchiveContainer>
        </section>

        {/* =====================================
            ENDING CONTENT
        ====================================== */}

        <section className="relative pb-8">
          <ArchiveContainer size="wide">
            <div
              className="
                grid
                grid-cols-1
                gap-5
                lg:grid-cols-[1fr_0.9fr]
                xl:gap-7
              "
            >
              {/* =================================
                  CHARACTER / VISUAL
              ================================== */}

              <motion.div
                initial={{
                  opacity: 0,
                  x: 30,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                }}
                transition={{
                  duration: 0.8,
                  delay: 0.15,
                }}
                className="
                  group
                  relative
                  min-h-[430px]
                  overflow-hidden
                  rounded-[26px]
                  border
                  border-white/[0.08]
                  bg-[#0b0e24]
                  shadow-[0_20px_70px_rgba(0,0,0,0.25)]
                  lg:min-h-[560px]
                "
              >
                {/* Decorative arch */}

                <div
                  className="
                    absolute
                    left-1/2
                    top-[8%]
                    h-[78%]
                    w-[75%]
                    -translate-x-1/2
                    rounded-t-[45%]
                    border
                    border-[var(--archive-gold)]/[0.18]
                    bg-[radial-gradient(
                      ellipse_at_center,
                      rgba(116,76,142,0.22),
                      rgba(8,10,25,0.15)_55%,
                      transparent_75%
                    )]
                  "
                />

                {/* Moon */}

                <div
                  className="
                    absolute
                    left-[22%]
                    top-[16%]
                    h-12
                    w-12
                    rounded-full
                    bg-[#f7d8cf]
                    opacity-80
                    blur-[0.3px]
                  "
                />

                <div
                  className="
                    absolute
                    left-[27%]
                    top-[13%]
                    h-12
                    w-12
                    rounded-full
                    bg-[#151633]
                  "
                />

                {/* Character */}

                <div
                  className="
                    absolute
                    inset-x-0
                    bottom-0
                    top-[7%]
                    flex
                    items-end
                    justify-center
                  "
                >
                  <div
                    className="
                      relative
                      h-[92%]
                      w-[82%]
                      max-w-[470px]
                    "
                  >
                    <Image
                      src="/assets/aulia-character.png"
                      alt="Aulia"
                      fill
                      priority
                      sizes="
                        (max-width: 1024px) 80vw,
                        470px
                      "
                      className="
                        object-contain
                        object-bottom
                        drop-shadow-[0_15px_35px_rgba(0,0,0,0.35)]
                        transition-transform
                        duration-[1200ms]
                        ease-out
                        group-hover:scale-[1.025]
                      "
                    />
                  </div>
                </div>

                {/* Bottom gradient */}

                <div
                  className="
                    absolute
                    inset-x-0
                    bottom-0
                    h-40
                    bg-gradient-to-t
                    from-[#080a19]
                    via-[#080a19]/70
                    to-transparent
                  "
                />

                {/* Caption */}

                <div
                  className="
                    absolute
                    inset-x-0
                    bottom-0
                    z-10
                    p-5
                    sm:p-6
                  "
                >
                  <div className="flex items-center gap-2">
                    <Star
                      size={12}
                      className="
                        fill-[var(--archive-gold)]
                        text-[var(--archive-gold)]
                      "
                    />

                    <p
                      className="
                        text-[9px]
                        uppercase
                        tracking-[0.18em]
                        text-[var(--archive-gold-soft)]
                      "
                    >
                      A Little Memory
                    </p>
                  </div>

                  <p
                    className="
                      mt-2
                      text-sm
                      text-[var(--archive-muted)]/70
                    "
                  >
                    Semoga senyum ini selalu menemukan alasan untuk kembali.
                  </p>
                </div>
              </motion.div>

              {/* =================================
                  MEMORY BOOK PANEL
              ================================== */}

              <motion.div
                initial={{
                  opacity: 0,
                  y: 25,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.7,
                  delay: 0.25,
                }}
                className="
                  flex
                  flex-col
                  rounded-[26px]
                  border
                  border-white/[0.08]
                  bg-[#0b0e24]
                  p-5
                  shadow-[0_20px_70px_rgba(0,0,0,0.2)]
                  sm:p-6
                  lg:p-7
                "
              >
                {/* Header */}

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="
                        flex
                        h-9
                        w-9
                        items-center
                        justify-center
                        rounded-xl
                        border
                        border-[var(--archive-gold)]/20
                        bg-[var(--archive-gold)]/[0.06]
                      "
                    >
                      <BookOpen
                        size={15}
                        className="
                          text-[var(--archive-gold-soft)]
                        "
                      />
                    </div>

                    <div>
                      <p
                        className="
                          text-[8px]
                          uppercase
                          tracking-[0.18em]
                          text-[var(--archive-muted)]/45
                        "
                      >
                        The Archive
                      </p>

                      <h2
                        className="
                          mt-0.5
                          text-lg
                          font-medium
                          text-[var(--archive-text)]
                        "
                      >
                        Kenangan Kita
                      </h2>
                    </div>
                  </div>

                  {/* Total memory */}

                  {!loading && !error && memories.length > 0 && (
                    <div
                      className="
                          flex
                          items-center
                          gap-1.5
                          rounded-full
                          border
                          border-white/[0.07]
                          bg-white/[0.02]
                          px-2.5
                          py-1
                        "
                    >
                      <Images
                        size={10}
                        className="
                            text-[var(--archive-gold-soft)]
                          "
                      />

                      <span
                        className="
                            text-[9px]
                            text-[var(--archive-muted)]/60
                          "
                      >
                        {memories.length}
                      </span>
                    </div>
                  )}
                </div>

                {/* =================================
                    LOADING
                ================================== */}

                {loading && (
                  <div
                    className="
                      flex
                      min-h-[280px]
                      flex-1
                      flex-col
                      items-center
                      justify-center
                    "
                  >
                    <div
                      className="
                        h-6
                        w-6
                        animate-spin
                        rounded-full
                        border-2
                        border-[var(--archive-gold)]
                        border-t-transparent
                      "
                    />

                    <p
                      className="
                        mt-3
                        text-xs
                        text-[var(--archive-muted)]/55
                      "
                    >
                      Memuat kenangan...
                    </p>
                  </div>
                )}

                {/* =================================
                    ERROR
                ================================== */}

                {!loading && error && (
                  <div
                    className="
                      flex
                      min-h-[280px]
                      flex-1
                      flex-col
                      items-center
                      justify-center
                      text-center
                    "
                  >
                    <BookOpen size={22} className="text-red-400/60" />

                    <p
                      className="
                        mt-3
                        text-sm
                        text-red-400/80
                      "
                    >
                      {error}
                    </p>

                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="
                        mt-3
                        text-[10px]
                        text-[var(--archive-gold-soft)]
                        hover:underline
                      "
                    >
                      Coba lagi
                    </button>
                  </div>
                )}

                {/* =================================
                    EMPTY
                ================================== */}

                {!loading && !error && memories.length === 0 && (
                  <div
                    className="
                        flex
                        min-h-[280px]
                        flex-1
                        flex-col
                        items-center
                        justify-center
                        text-center
                      "
                  >
                    <div
                      className="
                          flex
                          h-12
                          w-12
                          items-center
                          justify-center
                          rounded-full
                          border
                          border-white/10
                          bg-white/[0.02]
                        "
                    >
                      <Images
                        size={19}
                        className="
                            text-[var(--archive-muted)]/50
                          "
                      />
                    </div>

                    <p
                      className="
                          mt-3
                          text-sm
                          text-[var(--archive-text)]/80
                        "
                    >
                      Belum ada kenangan
                    </p>

                    <p
                      className="
                          mt-1
                          max-w-[230px]
                          text-[10px]
                          leading-relaxed
                          text-[var(--archive-muted)]/45
                        "
                    >
                      Kenangan yang ditambahkan ke Gallery akan muncul di sini
                      secara otomatis.
                    </p>
                  </div>
                )}

                {/* =================================
                    REAL MEMORY DATA
                ================================== */}

                {!loading && !error && memories.length > 0 && (
                  <>
                    <div className="mt-6 space-y-0">
                      {endingMemories.map((memory, index) => (
                        <motion.div
                          key={memory.id}
                          initial={{
                            opacity: 0,
                            x: -10,
                          }}
                          animate={{
                            opacity: 1,
                            x: 0,
                          }}
                          transition={{
                            duration: 0.45,
                            delay: 0.35 + index * 0.08,
                          }}
                          className="
                                group
                                relative
                                flex
                                items-center
                                gap-3
                                border-b
                                border-white/[0.05]
                                py-4
                                first:pt-0
                                last:border-b-0
                              "
                        >
                          {/* Photo */}

                          <div
                            className="
                                  relative
                                  h-14
                                  w-14
                                  shrink-0
                                  overflow-hidden
                                  rounded-xl
                                  border
                                  border-white/[0.08]
                                  bg-white/[0.025]
                                "
                          >
                            {memory.imageUrl ? (
                              <Image
                                src={memory.imageUrl}
                                alt={memory.title || "Memory"}
                                fill
                                sizes="56px"
                                className="
                                      object-cover
                                      transition-transform
                                      duration-500
                                      group-hover:scale-110
                                    "
                              />
                            ) : (
                              <div
                                className="
                                      flex
                                      h-full
                                      w-full
                                      items-center
                                      justify-center
                                    "
                              >
                                <Images
                                  size={15}
                                  className="
                                        text-[var(--archive-muted)]/30
                                      "
                                />
                              </div>
                            )}

                            {/* Featured badge */}

                            {memory.featured && (
                              <div
                                className="
                                      absolute
                                      right-1
                                      top-1
                                      flex
                                      h-4
                                      w-4
                                      items-center
                                      justify-center
                                      rounded-full
                                      bg-[#0b0e24]/85
                                      backdrop-blur-sm
                                    "
                              >
                                <Star
                                  size={8}
                                  className="
                                        fill-[var(--archive-gold)]
                                        text-[var(--archive-gold)]
                                      "
                                />
                              </div>
                            )}
                          </div>

                          {/* Content */}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p
                                className="
                                      text-[8px]
                                      font-medium
                                      uppercase
                                      tracking-[0.15em]
                                      text-[var(--archive-gold-soft)]/70
                                    "
                              >
                                {formatDate(memory.date)}
                              </p>

                              {memory.featured && (
                                <span
                                  className="
                                        rounded-full
                                        border
                                        border-[var(--archive-gold)]/15
                                        bg-[var(--archive-gold)]/[0.04]
                                        px-1.5
                                        py-0.5
                                        text-[6px]
                                        uppercase
                                        tracking-[0.1em]
                                        text-[var(--archive-gold-soft)]/60
                                      "
                                >
                                  Featured
                                </span>
                              )}
                            </div>

                            <p
                              className="
                                    mt-1
                                    truncate
                                    text-sm
                                    text-[var(--archive-text)]
                                  "
                            >
                              {memory.title || "Tanpa Judul"}
                            </p>

                            {memory.location && (
                              <div
                                className="
                                      mt-1
                                      flex
                                      items-center
                                      gap-1
                                      text-[8px]
                                      text-[var(--archive-muted)]/40
                                    "
                              >
                                <MapPin size={9} />

                                <span className="truncate">
                                  {memory.location}
                                </span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* More memories indicator */}

                    {memories.length > 4 && (
                      <p
                        className="
                            mt-3
                            text-center
                            text-[8px]
                            uppercase
                            tracking-[0.14em]
                            text-[var(--archive-muted)]/30
                          "
                      >
                        + {memories.length - 4} kenangan lainnya
                      </p>
                    )}

                    {/* Divider */}

                    <div
                      className="
                          my-5
                          h-px
                          bg-gradient-to-r
                          from-transparent
                          via-white/[0.08]
                          to-transparent
                        "
                    />

                    {/* Message */}

                    <div
                      className="
                          rounded-2xl
                          border
                          border-white/[0.05]
                          bg-white/[0.015]
                          p-4
                        "
                    >
                      <p
                        className="
                            text-xs
                            leading-relaxed
                            text-[var(--archive-muted)]/65
                          "
                      >
                        Setiap kenangan yang tersimpan di sini adalah bagian
                        dari perjalanan yang pernah kita lalui. Tidak peduli
                        seberapa sederhana momennya, semuanya layak untuk
                        dikenang.
                      </p>
                    </div>

                    {/* Download */}

                    <button
                      type="button"
                      onClick={handleDownloadMemoryBook}
                      disabled={generating}
                      className="
                          group/button
                          mt-5
                          flex
                          min-h-11
                          w-full
                          items-center
                          justify-center
                          gap-2.5
                          rounded-full
                          border
                          border-[var(--archive-gold)]/25
                          bg-[var(--archive-gold)]/[0.07]
                          px-5
                          py-3
                          text-xs
                          font-medium
                          text-[var(--archive-gold-soft)]
                          transition-all
                          duration-300
                          hover:border-[var(--archive-gold)]/40
                          hover:bg-[var(--archive-gold)]/[0.12]
                          hover:shadow-[0_8px_30px_rgba(180,120,180,0.12)]
                          disabled:cursor-not-allowed
                          disabled:opacity-50
                        "
                    >
                      <Download
                        size={14}
                        className="
                            transition-transform
                            duration-300
                            group-hover/button:-translate-y-0.5
                          "
                      />

                      {generating
                        ? "Menyiapkan Memory Book..."
                        : "Simpan Kenangan Ini"}
                    </button>
                  </>
                )}
              </motion.div>
            </div>

            {/* =================================
                CLOSING MESSAGE
            ================================== */}

            <motion.div
              initial={{
                opacity: 0,
                y: 15,
              }}
              whileInView={{
                opacity: 1,
                y: 0,
              }}
              viewport={{
                once: true,
              }}
              transition={{
                duration: 0.7,
              }}
              className="
                relative
                mt-6
                overflow-hidden
                rounded-2xl
                border
                border-white/[0.06]
                bg-white/[0.012]
                px-5
                py-5
                text-center
              "
            >
              <div
                className="
                  pointer-events-none
                  absolute
                  inset-x-[20%]
                  top-0
                  h-px
                  bg-gradient-to-r
                  from-transparent
                  via-[var(--archive-gold)]/30
                  to-transparent
                "
              />

              <Heart
                size={13}
                className="
                  mx-auto
                  fill-[var(--archive-pink-soft)]
                  text-[var(--archive-pink-soft)]
                "
              />

              <p
                className="
                  mt-2
                  text-xs
                  text-[var(--archive-muted)]/55
                "
              >
                Sampai jumpa di kenangan berikutnya, Aulia.
              </p>

              <p
                className="
                  mt-1
                  text-[8px]
                  uppercase
                  tracking-[0.2em]
                  text-[var(--archive-muted)]/25
                "
              >
                Some stories are worth keeping forever
              </p>
            </motion.div>

            {/* =================================
                NAVIGATION
            ================================== */}

            <div className="mt-8">
              <JourneyNavigation />
            </div>
          </ArchiveContainer>
        </section>
      </main>
    </ArchiveShell>
  );
}
