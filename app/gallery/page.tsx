"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

import { db } from "@/lib/firebase";

interface MemoryItem {
  id: string;
  date: string;
  title: string;
  story: string;
  imageUrl: string;
}

interface MemoryCardProps {
  memory: MemoryItem;
  index: number;
}

function MemoryCard({ memory, index }: MemoryCardProps) {
  const ref = useRef<HTMLDivElement | null>(null);

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

  const tilt = index % 2 === 0 ? -1.5 : 1.5;

  return (
    <motion.div
      ref={ref}
      style={{
        opacity,
        scale,
        y,
      }}
      className="relative"
    >
      {/* DATE */}
      <p className="mb-2 text-sm font-medium text-[#6D4FC2]">{memory.date}</p>

      {/* IMAGE */}
      <motion.div
        style={{
          rotate: tilt,
        }}
        whileHover={{
          scale: 1.03,
          rotate: 0,
        }}
        whileTap={{
          scale: 0.98,
        }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 15,
        }}
        className="mb-3 cursor-pointer overflow-hidden rounded-2xl shadow-md"
      >
        <motion.div
          style={{
            scale: imageScale,
          }}
        >
          <Image
            src={memory.imageUrl}
            alt={memory.title}
            width={600}
            height={400}
            loading={index === 0 ? "eager" : "lazy"}
            sizes="(max-width: 768px) 100vw, 600px"
            className="h-auto w-full"
          />
        </motion.div>
      </motion.div>

      {/* TITLE */}
      <h2 className="mb-1 text-lg font-semibold text-[#3B2E52]">
        {memory.title}
      </h2>

      {/* STORY */}
      <p className="max-w-md text-sm leading-relaxed text-[#3B2E52]/70">
        {memory.story}
      </p>
    </motion.div>
  );
}

export default function GalleryPage() {
  const [memories, setMemories] = useState<MemoryItem[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const galleryQuery = query(
      collection(db, "gallery"),
      orderBy("date", "asc"),
    );

    const unsubscribe = onSnapshot(
      galleryQuery,
      (snapshot) => {
        const galleryItems = snapshot.docs.map((snapshotDoc) => ({
          id: snapshotDoc.id,
          ...snapshotDoc.data(),
        })) as MemoryItem[];

        setMemories(galleryItems);

        setError(null);

        setLoading(false);
      },
      (snapshotError) => {
        console.error("Gallery snapshot error:", snapshotError);

        setError("Gagal memuat kenangan. Silakan coba lagi.");

        setLoading(false);
      },
    );

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#F5F1FA] px-6 py-16">
      <div className="mx-auto max-w-2xl">
        {/* =========================
            HEADER
        ========================== */}
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
            duration: 0.6,
          }}
          className="mb-24 text-center"
        >
          <p className="mb-3 text-sm font-medium tracking-[0.2em] text-[#6D4FC2]/60">
            MEMORY GALLERY
          </p>

          <h1 className="text-3xl font-semibold text-[#3B2E52] sm:text-4xl">
            Kenangan Kita
          </h1>
        </motion.div>

        {/* =========================
            LOADING
        ========================== */}
        {loading && (
          <p className="text-center text-sm text-[#3B2E52]/50">Memuat...</p>
        )}

        {/* =========================
            ERROR
        ========================== */}
        {!loading && error && (
          <div className="mb-10 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-600">
            {error}
          </div>
        )}

        {/* =========================
            EMPTY STATE
        ========================== */}
        {!loading && !error && memories.length === 0 && (
          <p className="text-center text-sm text-[#3B2E52]/50">
            Belum ada kenangan yang ditambahkan.
          </p>
        )}

        {/* =========================
            MEMORY TIMELINE
        ========================== */}
        {!loading && !error && memories.length > 0 && (
          <div className="relative space-y-32 border-l-2 border-[#D8C8F0] pl-8">
            {memories.map((memory, index) => (
              <MemoryCard key={memory.id} memory={memory} index={index} />
            ))}
          </div>
        )}

        {/* =========================
            NEXT BUTTON
        ========================== */}
        {!loading && memories.length > 0 && (
          <div className="mt-24 text-center">
            <Link
              href="/photobooth"
              className="inline-block rounded-full bg-[#A78BFA] px-8 py-3 font-medium text-white transition hover:bg-[#6D4FC2]"
            >
              Lanjut ke Photobooth
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
