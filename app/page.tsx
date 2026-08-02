"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

type Stage = "loading" | "door" | "welcome";

export default function HomePage() {
  const [stage, setStage] = useState<Stage>("loading");

  useEffect(() => {
    const timer1 = setTimeout(() => setStage("door"), 2000);
    const timer2 = setTimeout(() => setStage("welcome"), 3800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#F5F1FA] flex items-center justify-center overflow-hidden relative">
      <AnimatePresence mode="wait">
        {stage === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              className="w-10 h-10 border-2 border-[#A78BFA]/30 border-t-[#A78BFA] rounded-full"
            />
            <p className="tracking-widest text-sm text-[#6D4FC2]/70">
              MEMBUKA ARSIP...
            </p>
          </motion.div>
        )}

        {stage === "door" && (
          <div key="door" className="absolute inset-0 flex">
            <motion.div
              initial={{ x: 0, opacity: 1 }}
              animate={{ x: "-100%", opacity: 0.85 }}
              transition={{ duration: 1.8, ease: [0.65, 0, 0.35, 1] }}
              className="w-1/2 h-full bg-gradient-to-r from-[#EDE4FA] to-[#D8C8F0]"
            />
            <motion.div
              initial={{ x: 0, opacity: 1 }}
              animate={{ x: "100%", opacity: 0.85 }}
              transition={{ duration: 1.8, ease: [0.65, 0, 0.35, 1] }}
              className="w-1/2 h-full bg-gradient-to-l from-[#EDE4FA] to-[#D8C8F0]"
            />
          </div>
        )}

        {stage === "welcome" && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col items-center gap-6 text-center px-6"
          >
            <p className="text-[#6D4FC2]/60 text-sm tracking-widest">
              THE ARCHIVE
            </p>
            <h1 className="text-3xl md:text-5xl font-bold text-[#3B2E52]">
              Selamat Datang, Aulia 🌸
            </h1>
            <p className="text-[#3B2E52]/70 max-w-md">
              Sebuah ruang kecil berisi kenangan, cerita, dan hal-hal yang ingin
              kami simpan untukmu — di usia yang ke-20 ini.
            </p>
            <Link
              href="/gallery"
              className="mt-4 bg-[#A78BFA] text-white px-8 py-3 rounded-full font-medium hover:bg-[#6D4FC2] transition"
            >
              Masuk ke Archive
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
