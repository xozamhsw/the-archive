"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

interface MemoryItem {
  id: string;
  date: string;
  title: string;
  story: string;
  imageUrl: string;
}

const dummyMemories: MemoryItem[] = [
  {
    id: "1",
    date: "2022",
    title: "Awal Bertemu",
    story:
      "Momen pertama kali kita kenal — siapa sangka dari situ bisa jadi sahabat sampai sekarang.",
    imageUrl: "https://picsum.photos/seed/memory1/600/400",
  },
  {
    id: "2",
    date: "2023",
    title: "Nongkrong Bareng",
    story:
      "Cerita panjang, tawa, dan quality time yang selalu bikin hari jadi lebih ringan.",
    imageUrl: "https://picsum.photos/seed/memory2/600/400",
  },
  {
    id: "3",
    date: "2024",
    title: "Momen Seru",
    story: "Salah satu kenangan paling berkesan yang nggak akan terlupakan.",
    imageUrl: "https://picsum.photos/seed/memory3/600/400",
  },
  {
    id: "4",
    date: "2025",
    title: "Terus Bertumbuh",
    story:
      "Meski sibuk masing-masing, kita tetap saling support dan menjaga komunikasi.",
    imageUrl: "https://picsum.photos/seed/memory4/600/400",
  },
];

function MemoryCard({ memory, index }: { memory: MemoryItem; index: number }) {
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 90%", "center 55%"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 20,
  });

  const opacity = useTransform(smoothProgress, [0, 1], [0, 1]);
  const scale = useTransform(smoothProgress, [0, 1], [0.9, 1]);
  const y = useTransform(smoothProgress, [0, 1], [50, 0]);
  const imageScale = useTransform(smoothProgress, [0, 1], [1.15, 1]);

  // Tilt natural, selang-seling kiri/kanan biar tidak kaku
  const tilt = index % 2 === 0 ? -1.5 : 1.5;

  return (
    <motion.div ref={ref} style={{ opacity, scale, y }} className="relative">
      <span className="absolute -left-[41px] top-1 w-4 h-4 rounded-full bg-[#A78BFA] border-4 border-[#F5F1FA]" />

      <p className="text-[#6D4FC2] font-medium text-sm mb-2">{memory.date}</p>

      <motion.div
        style={{ rotate: tilt }}
        whileHover={{ scale: 1.03, rotate: 0 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="rounded-2xl overflow-hidden mb-3 shadow-md cursor-pointer"
      >
        <motion.div style={{ scale: imageScale }}>
          <Image
            src={memory.imageUrl}
            alt={memory.title}
            width={600}
            height={400}
            className="w-full h-auto object-cover"
          />
        </motion.div>
      </motion.div>

      <h2 className="text-lg font-semibold text-[#3B2E52] mb-1">
        {memory.title}
      </h2>
      <p className="text-[#3B2E52]/70 text-sm leading-relaxed max-w-md">
        {memory.story}
      </p>
    </motion.div>
  );
}

export default function GalleryPage() {
  return (
    <main className="min-h-screen bg-[#F5F1FA] px-6 py-20">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-24"
        >
          <p className="text-[#6D4FC2]/60 text-sm tracking-widest mb-2">
            MEMORY GALLERY
          </p>
          <h1 className="text-3xl font-bold text-[#3B2E52]">Kenangan Kita</h1>
        </motion.div>

        <div className="relative border-l-2 border-[#D8C8F0] pl-8 space-y-32">
          {dummyMemories.map((memory, index) => (
            <MemoryCard key={memory.id} memory={memory} index={index} />
          ))}
        </div>

        <div className="text-center mt-24">
          <Link
            href="/photobooth"
            className="inline-block bg-[#A78BFA] text-white px-8 py-3 rounded-full font-medium hover:bg-[#6D4FC2] transition"
          >
            Lanjut ke Photobooth
          </Link>
        </div>
      </div>
    </main>
  );
}
