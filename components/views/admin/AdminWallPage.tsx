"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";

import {
  Heart,
  Mail,
  MessageCircle,
  Search,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

interface WallMessage {
  id: string;
  name: string;
  message: string;
  emoji: string;
  ownerUid?: string;
  createdAt: Timestamp | null;
}

/* ============================================
   HELPERS
============================================ */

function formatDate(timestamp: Timestamp | null) {
  if (!timestamp) {
    return "Baru saja";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp.toDate());
}

function isToday(timestamp: Timestamp | null) {
  if (!timestamp) {
    return false;
  }

  const date = timestamp.toDate();
  const today = new Date();

  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/* ============================================
   PAGE
============================================ */

export default function AdminWallPage() {
  /* =========================================
     WALL DATA
  ========================================== */

  const [messages, setMessages] = useState<WallMessage[]>([]);
  const [loading, setLoading] = useState(true);

  /* =========================================
     UI STATE
  ========================================== */

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  /* =========================================
     FIREBASE LISTENER
  ========================================== */

  useEffect(() => {
    const wallQuery = query(
      collection(db, "wall"),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      wallQuery,
      (snapshot) => {
        const data = snapshot.docs.map((snapshotDoc) => {
          const documentData = snapshotDoc.data();

          return {
            id: snapshotDoc.id,
            name: documentData.name ?? "Anonymous",
            message: documentData.message ?? "",
            emoji: documentData.emoji ?? "💌",
            ownerUid: documentData.ownerUid,
            createdAt: documentData.createdAt ?? null,
          };
        }) as WallMessage[];

        setMessages(data);
        setError(null);
        setLoading(false);
      },
      (snapshotError) => {
        console.error("Admin wall listener error:", snapshotError);

        setError("Gagal memuat pesan Friendship Wall.");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  /* =========================================
     FILTER
  ========================================== */

  const filteredMessages = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    if (!keyword) {
      return messages;
    }

    return messages.filter((message) => {
      return (
        message.name.toLowerCase().includes(keyword) ||
        message.message.toLowerCase().includes(keyword) ||
        message.emoji.includes(keyword)
      );
    });
  }, [messages, searchQuery]);

  /* =========================================
     STATISTICS
  ========================================== */

  const todayMessages = useMemo(() => {
    return messages.filter((message) => isToday(message.createdAt)).length;
  }, [messages]);

  const uniquePeople = useMemo(() => {
    const names = new Set(
      messages
        .map((message) => message.name.trim().toLowerCase())
        .filter(Boolean),
    );

    return names.size;
  }, [messages]);

  /* =========================================
     DELETE
  ========================================== */

  async function handleDelete(message: WallMessage) {
    const confirmed = window.confirm(
      `Hapus pesan dari ${message.name}?\n\nPesan ini akan dihapus secara permanen.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(message.id);
    setError(null);

    try {
      await deleteDoc(doc(db, "wall", message.id));
    } catch (deleteError) {
      console.error("Delete wall message error:", deleteError);

      setError("Pesan gagal dihapus. Silakan coba lagi.");
    } finally {
      setDeletingId(null);
    }
  }

  /* =========================================
     RESET SEARCH
  ========================================== */

  function resetSearch() {
    setSearchQuery("");
  }

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
          <div className="absolute left-[18%] top-[8%] h-72 w-72 rounded-full bg-[#8B5CF6]/5 blur-[120px]" />

          <div className="absolute right-[10%] top-[35%] h-80 w-80 rounded-full bg-[#EC4899]/5 blur-[140px]" />

          <div className="absolute bottom-[5%] left-[40%] h-72 w-72 rounded-full bg-[#6366F1]/5 blur-[130px]" />
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
                    <MessageCircle size={12} />
                  </span>
                  The Archive · Messages
                </div>

                <h1 className="font-serif text-4xl leading-[0.95] tracking-tight text-white sm:text-5xl lg:text-[56px]">
                  Manage
                  <br />
                  <span className="text-[#F3A9C7]">Friendship Wall</span>
                </h1>

                <p className="mt-5 max-w-2xl text-sm leading-6 text-white/35">
                  Kelola seluruh pesan dan kata-kata hangat yang ditinggalkan
                  untuk Aulia melalui Friendship Wall.
                </p>
              </div>

              {/* STATS */}

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <WallStat
                  icon={<Mail size={14} />}
                  label="Total Pesan"
                  value={messages.length}
                />

                <WallStat
                  icon={<Sparkles size={14} />}
                  label="Hari Ini"
                  value={todayMessages}
                  accent
                />

                <div className="col-span-2 sm:col-span-1">
                  <WallStat
                    icon={<Users size={14} />}
                    label="Pengirim"
                    value={uniquePeople}
                  />
                </div>
              </div>
            </div>
          </motion.header>

          {/* =====================================
              INFO / ERROR
          ====================================== */}

          <AnimatePresence mode="wait">
            {error ? (
              <motion.div
                key="error"
                initial={{
                  opacity: 0,
                  y: -8,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  y: -8,
                }}
                className="
                  mb-6
                  flex
                  items-start
                  justify-between
                  gap-4
                  rounded-2xl
                  border
                  border-red-400/15
                  bg-red-500/5
                  px-4
                  py-3.5
                  text-xs
                  text-red-300
                  backdrop-blur-xl
                "
              >
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400" />

                  <p>{error}</p>
                </div>

                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="shrink-0 text-white/30 transition hover:text-white"
                  aria-label="Tutup error"
                >
                  <X size={15} />
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="info"
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: 1,
                }}
                className="
                  mb-7
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
                  <Heart size={14} fill="currentColor" />
                </span>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">
                    Friendship Collection
                  </p>

                  <p className="mt-0.5 text-[10px] text-white/25">
                    Semua pesan yang ditambahkan pada Friendship Wall akan
                    tersimpan di The Archive.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* =====================================
              COLLECTION HEADER
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
              delay: 0.08,
            }}
          >
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              {/* COLLECTION TITLE */}

              <div>
                <div className="mb-1 flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#F3A9C7]/50">
                  <MessageCircle size={11} />
                  Collection
                </div>

                <h2 className="font-serif text-2xl text-white/90">
                  Pesan Friendship Wall
                </h2>

                <p className="mt-1 text-[10px] text-white/25">
                  Kelola pesan yang tampil pada halaman Friendship Wall.
                </p>
              </div>

              {/* SEARCH */}

              <div className="relative w-full lg:w-[280px]">
                <Search
                  size={14}
                  className="
                    pointer-events-none
                    absolute
                    left-3.5
                    top-1/2
                    -translate-y-1/2
                    text-white/20
                  "
                />

                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Cari dalam messages..."
                  className="
                    h-10
                    w-full
                    rounded-full
                    border
                    border-white/[0.08]
                    bg-white/[0.025]
                    pl-10
                    pr-10
                    text-xs
                    text-white/80
                    outline-none
                    backdrop-blur-xl
                    transition
                    placeholder:text-white/20
                    focus:border-[#F3A9C7]/30
                    focus:bg-white/[0.04]
                  "
                />

                {searchQuery && (
                  <button
                    type="button"
                    onClick={resetSearch}
                    className="
                      absolute
                      right-2.5
                      top-1/2
                      flex
                      h-6
                      w-6
                      -translate-y-1/2
                      items-center
                      justify-center
                      rounded-full
                      text-white/25
                      transition
                      hover:bg-white/[0.05]
                      hover:text-white/60
                    "
                    aria-label="Hapus pencarian"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* COLLECTION LINE */}

            <div className="mb-5 flex items-center gap-3">
              <span className="text-[9px] uppercase tracking-[0.16em] text-white/20">
                {searchQuery
                  ? `${filteredMessages.length} Results`
                  : `${messages.length} Messages`}
              </span>

              <div className="h-px flex-1 bg-white/[0.05]" />

              <span className="text-[9px] uppercase tracking-[0.16em] text-[#F3A9C7]/35">
                The Archive
              </span>
            </div>
          </motion.section>

          {/* =====================================
              CONTENT
          ====================================== */}

          {loading ? (
            /* =====================================
               LOADING
            ====================================== */

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <WallSkeletonCard key={index} />
              ))}
            </div>
          ) : messages.length === 0 ? (
            /* =====================================
               EMPTY
            ====================================== */

            <EmptyWallState />
          ) : filteredMessages.length === 0 ? (
            /* =====================================
               SEARCH EMPTY
            ====================================== */

            <SearchEmptyState searchQuery={searchQuery} onReset={resetSearch} />
          ) : (
            /* =====================================
               MESSAGE GRID
            ====================================== */

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {filteredMessages.map((message, index) => (
                  <WallMessageCard
                    key={message.id}
                    message={message}
                    index={index}
                    deleting={deletingId === message.id}
                    onDelete={handleDelete}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* =====================================
              FOOTER INFO
          ====================================== */}

          {!loading && messages.length > 0 && (
            <motion.div
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              transition={{
                delay: 0.3,
              }}
              className="mt-8 flex items-center justify-center gap-3"
            >
              <span
                className="
                  h-px
                  w-10
                  bg-gradient-to-r
                  from-transparent
                  to-white/[0.08]
                "
              />

              <span
                className="
                  text-[8px]
                  uppercase
                  tracking-[0.2em]
                  text-[#A98B9B]/25
                "
              >
                {filteredMessages.length} dari {messages.length} pesan
              </span>

              <span
                className="
                  h-px
                  w-10
                  bg-gradient-to-l
                  from-transparent
                  to-white/[0.08]
                "
              />
            </motion.div>
          )}
        </div>
      </div>
    </MotionConfig>
  );
}

/* ============================================
   WALL STAT
============================================ */

function WallStat({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: boolean;
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

      <p className="text-xl font-semibold leading-none text-white/85">
        {value}
      </p>
    </div>
  );
}

/* ============================================
   WALL MESSAGE CARD
============================================ */

interface WallMessageCardProps {
  message: WallMessage;
  index: number;
  deleting: boolean;
  onDelete: (message: WallMessage) => void;
}

function WallMessageCard({
  message,
  index,
  deleting,
  onDelete,
}: WallMessageCardProps) {
  return (
    <motion.article
      layout
      initial={{
        opacity: 0,
        y: 15,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      exit={{
        opacity: 0,
        scale: 0.97,
      }}
      transition={{
        duration: 0.35,
        delay: Math.min(index * 0.04, 0.25),
      }}
      className="
        group
        relative
        overflow-hidden
        rounded-[24px]
        border
        border-white/[0.07]
        bg-[#0D0E28]/75
        shadow-[0_15px_50px_rgba(0,0,0,0.18)]
        backdrop-blur-xl
        transition-all
        duration-500
        hover:-translate-y-1
        hover:bg-[#10112D]
        hover:border-[#F3A9C7]/15
        hover:shadow-[0_25px_65px_rgba(0,0,0,0.28)]
      "
    >
      {/* =====================================
          CARD ATMOSPHERE
      ====================================== */}

      <div
        className="
          pointer-events-none
          absolute
          -right-16
          -top-16
          h-36
          w-36
          rounded-full
          bg-[#D86D9E]/[0.06]
          blur-[55px]
          transition
          duration-500
          group-hover:bg-[#D86D9E]/[0.12]
        "
      />

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

      <div className="relative p-4">
        {/* =====================================
            TOP
        ====================================== */}

        <div className="flex items-start gap-3">
          {/* EMOJI */}

          <div
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              border
              border-[#F3A9C7]/15
              bg-[#F3A9C7]/[0.05]
              text-lg
              shadow-[0_0_25px_rgba(214,90,143,0.04)]
            "
          >
            {message.emoji || "💌"}
          </div>

          {/* USER */}

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-[15px] font-semibold text-white/90">
                  {message.name}
                </h3>

                <p className="mt-1 text-[9px] text-white/25">
                  {formatDate(message.createdAt)}
                </p>
              </div>

              {/* DELETE */}

              <button
                type="button"
                onClick={() => onDelete(message)}
                disabled={deleting}
                className="
                  flex
                  h-8
                  w-8
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-red-400/10
                  bg-red-400/[0.03]
                  text-red-300/40
                  transition
                  hover:border-red-400/20
                  hover:bg-red-400/[0.07]
                  hover:text-red-300
                  disabled:cursor-not-allowed
                  disabled:opacity-30
                "
                aria-label={`Hapus pesan dari ${message.name}`}
              >
                {deleting ? (
                  <span
                    className="
                      h-3
                      w-3
                      animate-spin
                      rounded-full
                      border-2
                      border-red-300/20
                      border-t-red-300
                    "
                  />
                ) : (
                  <Trash2 size={12} />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* =====================================
            DIVIDER
        ====================================== */}

        <div className="my-4 h-px bg-white/[0.05]" />

        {/* =====================================
            MESSAGE
        ====================================== */}

        <p
          className="
            min-h-[96px]
            whitespace-pre-wrap
            break-words
            text-[11px]
            leading-5
            text-white/35
          "
        >
          {message.message}
        </p>

        {/* =====================================
            BOTTOM
        ====================================== */}

        <div className="mt-4 flex items-center justify-between">
          <span
            className="
              inline-flex
              items-center
              gap-1.5
              rounded-full
              border
              border-[#F3A9C7]/10
              bg-[#F3A9C7]/[0.035]
              px-2.5
              py-1
              text-[7px]
              font-medium
              uppercase
              tracking-[0.1em]
              text-[#F3A9C7]/45
            "
          >
            <MessageCircle size={9} />
            Friendship Wall
          </span>

          <Heart
            size={13}
            fill="currentColor"
            className="
              text-[#E56E96]/40
              transition-all
              duration-300
              group-hover:scale-110
              group-hover:text-[#E56E96]/70
            "
          />
        </div>
      </div>
    </motion.article>
  );
}

/* ============================================
   SKELETON
============================================ */

function WallSkeletonCard() {
  return (
    <div className="overflow-hidden rounded-[24px] border border-white/[0.06] bg-[#0D0E28]/70">
      <div className="p-4">
        <div className="flex gap-3">
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-[#F3A9C7]/5" />

          <div className="flex-1">
            <div className="h-3.5 w-28 animate-pulse rounded bg-white/[0.06]" />

            <div className="mt-2 h-2 w-24 animate-pulse rounded bg-white/[0.035]" />
          </div>
        </div>

        <div className="my-4 h-px bg-white/[0.04]" />

        <div className="space-y-2">
          <div className="h-2.5 w-full animate-pulse rounded bg-white/[0.04]" />

          <div className="h-2.5 w-[90%] animate-pulse rounded bg-white/[0.04]" />

          <div className="h-2.5 w-[70%] animate-pulse rounded bg-white/[0.04]" />

          <div className="h-2.5 w-[80%] animate-pulse rounded bg-white/[0.04]" />
        </div>

        <div className="mt-5 flex justify-between">
          <div className="h-5 w-28 animate-pulse rounded-full bg-white/[0.035]" />

          <div className="h-4 w-4 animate-pulse rounded-full bg-white/[0.035]" />
        </div>
      </div>
    </div>
  );
}

/* ============================================
   EMPTY WALL
============================================ */

function EmptyWallState() {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 10,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className="
        flex
        min-h-[400px]
        flex-col
        items-center
        justify-center
        rounded-[28px]
        border
        border-dashed
        border-white/[0.08]
        bg-white/[0.015]
        px-6
        text-center
      "
    >
      <div
        className="
          flex
          h-16
          w-16
          items-center
          justify-center
          rounded-2xl
          border
          border-[#F3A9C7]/10
          bg-[#F3A9C7]/5
          text-[#F3A9C7]/60
        "
      >
        <MessageCircle size={23} />
      </div>

      <p className="mt-5 font-serif text-xl text-white/80">Belum ada pesan</p>

      <p className="mt-2 max-w-xs text-xs leading-5 text-white/25">
        Pesan dari pengunjung Friendship Wall akan muncul di sini.
      </p>
    </motion.div>
  );
}

/* ============================================
   SEARCH EMPTY
============================================ */

function SearchEmptyState({
  searchQuery,
  onReset,
}: {
  searchQuery: string;
  onReset: () => void;
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 10,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className="
        flex
        min-h-[330px]
        flex-col
        items-center
        justify-center
        rounded-[28px]
        border
        border-white/[0.07]
        bg-white/[0.015]
        px-6
        text-center
      "
    >
      <div
        className="
          flex
          h-14
          w-14
          items-center
          justify-center
          rounded-full
          border
          border-white/[0.07]
          bg-white/[0.025]
          text-white/30
        "
      >
        <Search size={18} />
      </div>

      <p className="mt-4 font-serif text-lg text-white/75">
        Pesan tidak ditemukan
      </p>

      <p className="mt-1 text-xs text-white/25">
        Tidak ada hasil untuk "{searchQuery}".
      </p>

      <button
        type="button"
        onClick={onReset}
        className="
          mt-5
          rounded-xl
          border
          border-[#F3A9C7]/15
          bg-[#F3A9C7]/5
          px-4
          py-2
          text-[9px]
          font-semibold
          uppercase
          tracking-[0.1em]
          text-[#F3A9C7]/65
          transition
          hover:border-[#F3A9C7]/25
          hover:bg-[#F3A9C7]/10
          hover:text-[#F3A9C7]
        "
      >
        Reset Pencarian
      </button>
    </motion.div>
  );
}
