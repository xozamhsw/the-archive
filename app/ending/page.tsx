"use client";

import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { jsPDF } from "jspdf";
import { motion } from "framer-motion";

const MEMORY_HIGHLIGHTS = [
  { date: "2022", title: "Awal Bertemu" },
  { date: "2023", title: "Nongkrong Bareng" },
  { date: "2024", title: "Momen Seru" },
  { date: "2025", title: "Terus Bertumbuh" },
];

export default function EndingPage() {
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const duration = 3000;
    const end = Date.now() + duration;

    const colors = ["#A78BFA", "#F5A9D0", "#D8C8F0", "#FFFFFF"];

    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 60,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 60,
        origin: { x: 1 },
        colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();

    // Ledakan besar di awal
    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.6 },
      colors,
    });
  }, []);

  function handleDownloadMemoryBook() {
    setGenerating(true);

    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // --- Cover page ---
      doc.setFillColor(245, 241, 250);
      doc.rect(0, 0, pageWidth, pageHeight, "F");

      doc.setTextColor(109, 79, 194);
      doc.setFontSize(14);
      doc.text("THE ARCHIVE", pageWidth / 2, 260, { align: "center" });

      doc.setTextColor(59, 46, 82);
      doc.setFontSize(32);
      doc.setFont("helvetica", "bold");
      doc.text("Memory Book", pageWidth / 2, 300, { align: "center" });

      doc.setFontSize(16);
      doc.setFont("helvetica", "normal");
      doc.text("Untuk Aulia, di usia yang ke-20", pageWidth / 2, 335, {
        align: "center",
      });

      doc.setFontSize(11);
      doc.setTextColor(109, 79, 194);
      doc.text(
        new Date().toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        pageWidth / 2,
        365,
        { align: "center" },
      );

      // --- Memory highlights page ---
      doc.addPage();
      doc.setFillColor(245, 241, 250);
      doc.rect(0, 0, pageWidth, pageHeight, "F");

      doc.setTextColor(59, 46, 82);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Kenangan Kita", 60, 80);

      let y = 130;
      MEMORY_HIGHLIGHTS.forEach((item) => {
        doc.setFontSize(11);
        doc.setTextColor(109, 79, 194);
        doc.setFont("helvetica", "bold");
        doc.text(item.date, 60, y);

        doc.setFontSize(14);
        doc.setTextColor(59, 46, 82);
        doc.setFont("helvetica", "normal");
        doc.text(item.title, 60, y + 20);

        doc.setDrawColor(216, 200, 240);
        doc.line(60, y + 35, pageWidth - 60, y + 35);

        y += 65;
      });

      // --- Closing message page ---
      doc.addPage();
      doc.setFillColor(167, 139, 250);
      doc.rect(0, 0, pageWidth, pageHeight, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text(
        "Selamat Ulang Tahun, Aulia!",
        pageWidth / 2,
        pageHeight / 2 - 30,
        {
          align: "center",
        },
      );

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      const closingText = doc.splitTextToSize(
        "Semoga di usia yang baru ini, kamu selalu diberi kesehatan, kebahagiaan, dan hal-hal baik yang datang tanpa diminta. Terima kasih sudah jadi sahabat yang luar biasa.",
        pageWidth - 160,
      );
      doc.text(closingText, pageWidth / 2, pageHeight / 2, {
        align: "center",
      });

      doc.save("the-archive-memory-book.pdf");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#A78BFA] to-[#6D4FC2] flex items-center justify-center px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center max-w-md"
      >
        <p className="text-6xl mb-4">🎉</p>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Selamat Ulang Tahun, Aulia!
        </h1>
        <p className="text-white/90 leading-relaxed mb-10">
          Terima kasih sudah menjelajahi arsip kecil ini. Semoga di usia yang
          baru, semua yang kamu doakan diam-diam segera terwujud. Kami semua
          sayang kamu. 💜
        </p>

        <button
          onClick={handleDownloadMemoryBook}
          disabled={generating}
          className="bg-white text-[#6D4FC2] px-8 py-3 rounded-full font-medium hover:bg-white/90 transition disabled:opacity-60"
        >
          {generating ? "Menyiapkan..." : "Download Memory Book"}
        </button>
      </motion.div>
    </main>
  );
}
