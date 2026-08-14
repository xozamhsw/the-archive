"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Heart, MapPin, Star } from "lucide-react";

import type { MemoryItem } from "@/types/gallery";

interface ArchiveMemoryCardProps {
  memory: MemoryItem;
  index: number;
  onOpen: (memory: MemoryItem) => void;
}

export default function ArchiveMemoryCard({
  memory,
  index,
  onOpen,
}: ArchiveMemoryCardProps) {
  const [isLiked, setIsLiked] = useState(false);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(index, 8) * 0.05 }}
      whileHover={{ y: -4 }}
      onClick={() => onOpen(memory)}
      className={`group relative cursor-pointer overflow-hidden rounded-2xl border border-[var(--archive-border)] bg-white/[0.03] shadow-[0_18px_40px_-24px_rgba(0,0,0,0.65)] transition-colors hover:border-[var(--archive-gold)]/40 ${
        memory.featured ? "sm:col-span-2" : ""
      }`}
    >
      <div
        className={`relative w-full overflow-hidden ${
          memory.featured ? "aspect-[2/1]" : "aspect-[4/5]"
        }`}
      >
        <Image
          src={memory.imageUrl}
          alt={memory.title}
          fill
          sizes={
            memory.featured
              ? "(max-width: 640px) 100vw, 66vw"
              : "(max-width: 640px) 100vw, 33vw"
          }
          loading={index < 3 ? "eager" : "lazy"}
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b0e27] via-[#0b0e27]/10 to-transparent opacity-90" />

        {memory.featured && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--archive-gold)]/40 bg-[#0b0e27]/70 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--archive-gold-soft)] backdrop-blur-sm">
            <Star
              size={11}
              className="fill-[var(--archive-gold)] text-[var(--archive-gold)]"
            />
            Momen Favorit
          </span>
        )}

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setIsLiked((prev) => !prev);
          }}
          aria-label={
            isLiked ? "Batal sukai kenangan ini" : "Sukai kenangan ini"
          }
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-[#0b0e27]/60 text-white/80 backdrop-blur-sm transition-colors hover:text-[var(--archive-pink-soft)]"
        >
          <Heart
            size={14}
            className={
              isLiked
                ? "fill-[var(--archive-pink-soft)] text-[var(--archive-pink-soft)]"
                : ""
            }
          />
        </button>

        <div className="absolute inset-x-0 bottom-0 p-4">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--archive-gold-soft)]/80">
            {memory.date}
          </p>
          <h3 className="archive-display text-base leading-snug text-[var(--archive-text)] sm:text-lg">
            {memory.title}
          </h3>

          {memory.location && (
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-[var(--archive-muted)]">
              <MapPin size={11} />
              {memory.location}
            </p>
          )}
        </div>
      </div>
    </motion.article>
  );
}
