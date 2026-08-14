"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Heart, Images, MapPin, Search, Sparkles, Star } from "lucide-react";
import Image from "next/image";

import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

import ArchiveShell from "@/components/ui/ArchiveShell";
import ArchiveContainer from "@/components/ui/ArchiveContainer";
import SectionBadge from "@/components/ui/SectionBadge";
import PageNumber from "@/components/ui/PageNumber";
import JourneyNavigation from "@/components/navigation/JourneyNavigation";

interface MemoryItem {
  id: string;
  date: string;
  title: string;
  story: string;
  imageUrl: string;
  location?: string;
  featured?: boolean;
}

interface MemoryCardProps {
  memory: MemoryItem;
  index: number;
  featured?: boolean;
}

function MemoryCard({ memory, index, featured = false }: MemoryCardProps) {
  const [isLiked, setIsLiked] = useState(false);

  return (
    <motion.article
      initial={{
        opacity: 0,
        y: 25,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{
        once: true,
        margin: "-60px",
      }}
      transition={{
        duration: 0.6,
        delay: Math.min(index * 0.06, 0.3),
        ease: [0.22, 1, 0.36, 1],
      }}
      className={`
        group relative isolate overflow-hidden
        rounded-[22px]
        border border-white/[0.08]
        bg-[#0b0e24]
        shadow-[0_15px_50px_rgba(0,0,0,0.22)]
        transition-all duration-500
        hover:border-[var(--archive-gold)]/20
        hover:shadow-[0_20px_60px_rgba(124,72,160,0.18)]
        ${
          featured
            ? "min-h-[430px] sm:min-h-[470px] lg:min-h-[540px]"
            : "min-h-[245px] sm:min-h-[270px]"
        }
      `}
    >
      {/* =========================================
          IMAGE
      ========================================== */}
      <div className="absolute inset-0 overflow-hidden">
        <Image
          src={memory.imageUrl}
          alt={memory.title}
          fill
          priority={index < 2}
          unoptimized
          sizes={
            featured
              ? "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 40vw"
              : "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 30vw"
          }
          className="
            object-cover
            transition-transform
            duration-[1200ms]
            ease-out
            group-hover:scale-[1.07]
          "
        />

        {/* Dark overlay */}
        <div
          className="
            absolute inset-0
            bg-gradient-to-t
            from-[#080a19]
            via-[#080a19]/45
            to-[#080a19]/5
          "
        />

        {/* Subtle purple glow */}
        <div
          className="
            absolute inset-0
            bg-[radial-gradient(
              circle_at_30%_20%,
              rgba(164,110,190,0.16),
              transparent_45%
            )]
            opacity-70
          "
        />
      </div>

      {/* =========================================
          TOP BADGES
      ========================================== */}
      <div className="absolute left-4 right-4 top-4 z-20 flex items-start justify-between">
        <div>
          {memory.featured && (
            <span
              className="
                inline-flex items-center gap-1.5
                rounded-full
                border border-[var(--archive-gold)]/30
                bg-[#0a0d20]/60
                px-2.5 py-1
                text-[8px]
                font-semibold
                uppercase
                tracking-[0.14em]
                text-[var(--archive-gold-soft)]
                backdrop-blur-md
              "
            >
              <Star
                size={9}
                className="
                  fill-[var(--archive-gold)]
                  text-[var(--archive-gold)]
                "
              />
              Featured
            </span>
          )}
        </div>

        {/* Heart */}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setIsLiked((previous) => !previous);
          }}
          aria-label={isLiked ? "Batal menyukai kenangan" : "Sukai kenangan"}
          className="
            flex h-9 w-9
            items-center justify-center
            rounded-full
            border border-white/10
            bg-[#080a19]/45
            text-white/70
            backdrop-blur-md
            transition-all duration-300
            hover:border-white/20
            hover:bg-[#080a19]/70
            hover:text-[var(--archive-pink-soft)]
          "
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
      </div>

      {/* =========================================
          CONTENT
      ========================================== */}
      <div
        className="
          absolute inset-x-0 bottom-0
          z-10
          p-5 sm:p-6
        "
      >
        {/* Date */}
        <p
          className="
            mb-1.5
            text-[9px]
            font-medium
            uppercase
            tracking-[0.16em]
            text-[var(--archive-gold-soft)]/75
          "
        >
          {memory.date}
        </p>

        {/* Title */}
        <h3
          className={`
            font-medium
            leading-tight
            tracking-[-0.02em]
            text-[var(--archive-text)]
            ${
              featured
                ? "text-2xl sm:text-3xl lg:text-[2rem]"
                : "text-lg sm:text-xl"
            }
          `}
        >
          {memory.title}
        </h3>

        {/* Story */}
        <p
          className={`
            mt-2
            max-w-[95%]
            leading-relaxed
            text-[var(--archive-muted)]/75
            ${featured ? "text-sm" : "line-clamp-2 text-xs"}
          `}
        >
          {memory.story}
        </p>

        {/* Location */}
        {memory.location && (
          <div
            className="
              mt-3
              flex items-center gap-1.5
              text-[10px]
              text-[var(--archive-muted)]/55
            "
          >
            <MapPin size={11} />
            <span>{memory.location}</span>
          </div>
        )}
      </div>

      {/* Bottom shine */}
      <div
        className="
          pointer-events-none
          absolute inset-x-0 bottom-0
          h-px
          bg-gradient-to-r
          from-transparent
          via-[var(--archive-gold)]/30
          to-transparent
          opacity-0
          transition-opacity duration-500
          group-hover:opacity-100
        "
      />
    </motion.article>
  );
}

export default function GalleryPage() {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeFilter, setActiveFilter] = useState("Semua Kenangan");

  const [searchQuery, setSearchQuery] = useState("");

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

    return () => unsubscribe();
  }, []);

  /* =========================================
      FILTER + SEARCH
  ========================================== */
  const filteredMemories = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return memories.filter((memory) => {
      const matchesSearch =
        normalizedSearch === "" ||
        memory.title.toLowerCase().includes(normalizedSearch) ||
        memory.story.toLowerCase().includes(normalizedSearch) ||
        memory.location?.toLowerCase().includes(normalizedSearch);

      if (!matchesSearch) {
        return false;
      }

      if (activeFilter === "Featured") {
        return memory.featured === true;
      }

      return true;
    });
  }, [memories, activeFilter, searchQuery]);

  const featuredMemory =
    filteredMemories.find((memory) => memory.featured) ?? filteredMemories[0];

  const regularMemories = filteredMemories.filter(
    (memory) => memory.id !== featuredMemory?.id,
  );

  /* =========================================
      MAIN
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
              left-[8%]
              top-[8%]
              h-[260px]
              w-[260px]
              rounded-full
              bg-[#9c5d94]/[0.045]
              blur-[90px]
              sm:h-[360px]
              sm:w-[360px]
            "
          />

          {/* Gold glow */}
          <div
            className="
              absolute
              right-[5%]
              top-[25%]
              h-[220px]
              w-[220px]
              rounded-full
              bg-[var(--archive-gold)]/[0.025]
              blur-[100px]
            "
          />

          {/* Bottom glow */}
          <div
            className="
              absolute
              bottom-[5%]
              left-[45%]
              h-[250px]
              w-[250px]
              rounded-full
              bg-[#5f4b91]/[0.025]
              blur-[100px]
            "
          />
        </div>

        {/* =====================================
            HEADER
        ====================================== */}
        <section className="relative pt-10 pb-7 sm:pt-14 sm:pb-9">
          <ArchiveContainer size="wide">
            <div className="flex flex-col gap-7 xl:flex-row xl:gap-10">
              {/* Sidebar */}
              <PageNumber
                number="01"
                title="Gallery"
                description="Jelajahi setiap potongan kenangan berharga yang pernah kita ciptakan bersama."
                className="hidden xl:flex"
              />

              {/* Header Content */}
              <div className="min-w-0 flex-1">
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
                >
                  {/* Badge */}
                  <SectionBadge icon={<Images size={11} />}>
                    Koleksi Kenangan
                  </SectionBadge>

                  {/* Title */}
                  <h1
                    className="
                      archive-display
                      mt-4
                      text-[clamp(2.5rem,6vw,4.8rem)]
                      leading-[0.92]
                      tracking-[-0.045em]
                      text-[var(--archive-text)]
                    "
                  >
                    Memory Gallery
                  </h1>

                  {/* Description */}
                  <p
                    className="
                      mt-4
                      max-w-xl
                      text-sm
                      leading-relaxed
                      text-[var(--archive-muted)]/70
                    "
                  >
                    Setiap momen kecil yang kita lewati adalah bintang yang
                    membuat cerita kita begitu indah.
                  </p>

                  {/* Stats */}
                  {!loading && !error && memories.length > 0 && (
                    <div
                      className="
                          mt-6
                          flex flex-wrap
                          items-center
                          gap-5
                        "
                    >
                      {/* Total */}
                      <div className="flex items-center gap-2">
                        <div
                          className="
                              flex h-7 w-7
                              items-center justify-center
                              rounded-lg
                              border border-white/10
                              bg-white/[0.025]
                            "
                        >
                          <Images
                            size={12}
                            className="text-[var(--archive-gold-soft)]"
                          />
                        </div>

                        <div>
                          <p
                            className="
                                text-sm
                                font-semibold
                                text-[var(--archive-text)]
                              "
                          >
                            {memories.length}
                          </p>

                          <p
                            className="
                                text-[8px]
                                uppercase
                                tracking-[0.12em]
                                text-[var(--archive-muted)]/45
                              "
                          >
                            Kenangan
                          </p>
                        </div>
                      </div>

                      {/* Featured */}
                      <div className="flex items-center gap-2">
                        <div
                          className="
                              flex h-7 w-7
                              items-center justify-center
                              rounded-lg
                              border border-white/10
                              bg-white/[0.025]
                            "
                        >
                          <Sparkles
                            size={12}
                            className="text-[var(--archive-gold-soft)]"
                          />
                        </div>

                        <div>
                          <p
                            className="
                                text-sm
                                font-semibold
                                text-[var(--archive-text)]
                              "
                          >
                            {
                              memories.filter((memory) => memory.featured)
                                .length
                            }
                          </p>

                          <p
                            className="
                                text-[8px]
                                uppercase
                                tracking-[0.12em]
                                text-[var(--archive-muted)]/45
                              "
                          >
                            Featured
                          </p>
                        </div>
                      </div>

                      {/* Likes */}
                      <div className="flex items-center gap-2">
                        <div
                          className="
                              flex h-7 w-7
                              items-center justify-center
                              rounded-lg
                              border border-white/10
                              bg-white/[0.025]
                            "
                        >
                          <Heart
                            size={12}
                            className="text-[var(--archive-pink-soft)]"
                          />
                        </div>

                        <div>
                          <p
                            className="
                                text-sm
                                font-semibold
                                text-[var(--archive-text)]
                              "
                          >
                            ∞
                          </p>

                          <p
                            className="
                                text-[8px]
                                uppercase
                                tracking-[0.12em]
                                text-[var(--archive-muted)]/45
                              "
                          >
                            Kenangan
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>
            </div>
          </ArchiveContainer>
        </section>

        {/* =====================================
            GALLERY
        ====================================== */}
        <section className="relative pb-8">
          <ArchiveContainer size="wide">
            {/* Loading */}
            {loading && (
              <div
                className="
                  flex
                  min-h-[420px]
                  items-center
                  justify-center
                "
              >
                <div className="flex flex-col items-center gap-3">
                  <div
                    className="
                      h-6 w-6
                      animate-spin
                      rounded-full
                      border-2
                      border-[var(--archive-gold)]
                      border-t-transparent
                    "
                  />

                  <p
                    className="
                      text-xs
                      text-[var(--archive-muted)]
                    "
                  >
                    Memuat kenangan...
                  </p>
                </div>
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div
                className="
                  rounded-2xl
                  border border-red-500/20
                  bg-red-500/[0.04]
                  px-5 py-6
                  text-center
                "
              >
                <p className="text-sm text-red-400">{error}</p>

                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="
                    mt-3
                    text-xs
                    text-[var(--archive-gold-soft)]
                    hover:underline
                  "
                >
                  Coba lagi
                </button>
              </div>
            )}

            {/* Empty */}
            {!loading && !error && memories.length === 0 && (
              <div
                className="
                    flex
                    min-h-[350px]
                    flex-col
                    items-center
                    justify-center
                    rounded-3xl
                    border border-white/[0.06]
                    bg-white/[0.015]
                    px-4 py-10
                    text-center
                  "
              >
                <div
                  className="
                      mb-4
                      flex h-14 w-14
                      items-center justify-center
                      rounded-full
                      border border-white/10
                      bg-white/[0.025]
                    "
                >
                  <Images size={22} className="text-[var(--archive-muted)]" />
                </div>

                <h3
                  className="
                      text-base
                      font-medium
                      text-[var(--archive-text)]
                    "
                >
                  Belum ada kenangan
                </h3>

                <p
                  className="
                      mt-1
                      text-sm
                      text-[var(--archive-muted)]/60
                    "
                >
                  Belum ada kenangan yang ditambahkan.
                </p>
              </div>
            )}

            {/* Gallery Content */}
            {!loading && !error && memories.length > 0 && (
              <>
                {/* =================================
                      FEATURED + GRID
                  ================================== */}
                <div
                  className="
                      grid
                      grid-cols-1
                      gap-4
                      md:grid-cols-2
                      xl:grid-cols-3
                    "
                >
                  {/* Featured */}
                  {featuredMemory && (
                    <div
                      className="
                          md:col-span-2
                          xl:col-span-1
                          xl:row-span-2
                        "
                    >
                      <MemoryCard memory={featuredMemory} index={0} featured />
                    </div>
                  )}

                  {/* Regular cards */}
                  {regularMemories.map((memory, index) => (
                    <MemoryCard
                      key={memory.id}
                      memory={memory}
                      index={index + 1}
                    />
                  ))}
                </div>

                {/* =================================
                      FILTER + SEARCH
                  ================================== */}
                <div
                  className="
                      mt-7
                      flex
                      flex-col
                      gap-3
                      xl:flex-row
                      xl:items-center
                      xl:justify-between
                    "
                >
                  {/* Filters */}
                  <div
                    className="
                        flex
                        flex-wrap
                        items-center
                        gap-2
                      "
                  >
                    {[
                      {
                        label: "Semua Kenangan",
                        value: "Semua Kenangan",
                      },
                      {
                        label: "Featured",
                        value: "Featured",
                      },
                    ].map((filter) => {
                      const active = activeFilter === filter.value;

                      return (
                        <button
                          key={filter.value}
                          type="button"
                          onClick={() => setActiveFilter(filter.value)}
                          className={`
                              rounded-full
                              border
                              px-3.5 py-1.5
                              text-[9px]
                              transition-all
                              duration-300
                              ${
                                active
                                  ? "border-[var(--archive-gold)]/30 bg-[var(--archive-gold)]/[0.08] text-[var(--archive-gold-soft)]"
                                  : "border-white/[0.07] bg-white/[0.015] text-[var(--archive-muted)]/60 hover:border-white/15 hover:text-[var(--archive-muted)]"
                              }
                            `}
                        >
                          {filter.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Search */}
                  <div
                    className="
                        relative
                        w-full
                        xl:max-w-[230px]
                      "
                  >
                    <Search
                      size={13}
                      className="
                          pointer-events-none
                          absolute
                          left-3
                          top-1/2
                          -translate-y-1/2
                          text-[var(--archive-muted)]/45
                        "
                    />

                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Cari kenangan..."
                      className="
                          h-9
                          w-full
                          rounded-full
                          border
                          border-white/[0.07]
                          bg-white/[0.02]
                          pl-9 pr-4
                          text-[10px]
                          text-[var(--archive-text)]
                          outline-none
                          placeholder:text-[var(--archive-muted)]/35
                          transition-all
                          focus:border-[var(--archive-gold)]/30
                          focus:bg-white/[0.035]
                        "
                    />
                  </div>
                </div>

                {/* No search result */}
                {filteredMemories.length === 0 && (
                  <div
                    className="
                        mt-5
                        rounded-2xl
                        border border-white/[0.06]
                        bg-white/[0.015]
                        px-5 py-8
                        text-center
                      "
                  >
                    <Search
                      size={18}
                      className="
                          mx-auto
                          text-[var(--archive-muted)]/40
                        "
                    />

                    <p
                      className="
                          mt-2
                          text-sm
                          text-[var(--archive-muted)]/70
                        "
                    >
                      Kenangan tidak ditemukan.
                    </p>
                  </div>
                )}

                {/* Bottom decoration */}
                <div
                  className="
                      mt-8
                      flex
                      items-center
                      justify-center
                      gap-3
                    "
                >
                  <span
                    className="
                        h-px w-12
                        bg-gradient-to-r
                        from-transparent
                        to-white/10
                      "
                  />

                  <span
                    className="
                        text-[7px]
                        uppercase
                        tracking-[0.2em]
                        text-[var(--archive-muted)]/20
                      "
                  >
                    {filteredMemories.length} Kenangan
                  </span>

                  <span
                    className="
                        h-px w-12
                        bg-gradient-to-l
                        from-transparent
                        to-white/10
                      "
                  />
                </div>
              </>
            )}

            {/* =====================================
                NAVIGATION
            ====================================== */}
            {!loading && memories.length > 0 && (
              <div className="mt-8">
                <JourneyNavigation />
              </div>
            )}
          </ArchiveContainer>
        </section>
      </main>
    </ArchiveShell>
  );
}
