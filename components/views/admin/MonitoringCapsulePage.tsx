"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";

import {
  CalendarClock,
  Clock3,
  Heart,
  Mail,
  MessageCircle,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Unlock,
  Users,
  X,
  LockKeyhole,
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

/* ============================================
   TYPES
============================================ */

interface CapsuleItem {
  id: string;
  message: string;
  unlockDate: Timestamp | null;
  createdAt: Timestamp | null;
  ownerUid?: string;
}

interface FeedbackItem {
  id: string;
  name: string;
  message: string;
  createdAt: Timestamp | null;
  ownerUid?: string;
}

type ActiveTab = "capsules" | "feedback";

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

function formatUnlockDate(timestamp: Timestamp | null) {
  if (!timestamp) {
    return "Tanggal tidak tersedia";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(timestamp.toDate());
}

function isUnlocked(timestamp: Timestamp | null) {
  if (!timestamp) {
    return false;
  }

  return new Date() >= timestamp.toDate();
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

function getInitial(name: string) {
  const safeName = name.trim() || "Anonim";

  return safeName.charAt(0).toUpperCase();
}

function getNameColor(name: string) {
  const colors = ["#A78BFA", "#F3A9C7", "#8B5CF6", "#C084FC", "#E879A8"];

  const safeName = name || "Anonim";

  const sum = safeName
    .split("")
    .reduce(
      (accumulator, character) => accumulator + character.charCodeAt(0),
      0,
    );

  return colors[sum % colors.length];
}

/* ============================================
   PAGE
============================================ */

export default function MonitoringCapsulePage() {
  /* =========================================
     DATA
  ========================================== */

  const [capsules, setCapsules] = useState<CapsuleItem[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);

  const [loadingCapsules, setLoadingCapsules] = useState(true);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);

  /* =========================================
     UI STATE
  ========================================== */

  const [activeTab, setActiveTab] = useState<ActiveTab>("capsules");
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* =========================================
     FIREBASE LISTENERS
  ========================================== */

  useEffect(() => {
    const capsuleQuery = query(
      collection(db, "timeCapsules"),
      orderBy("createdAt", "desc"),
    );

    const feedbackQuery = query(
      collection(db, "feedback"),
      orderBy("createdAt", "desc"),
    );

    const unsubscribeCapsules = onSnapshot(
      capsuleQuery,
      (snapshot) => {
        const data = snapshot.docs.map((snapshotDoc) => {
          const documentData = snapshotDoc.data();

          return {
            id: snapshotDoc.id,
            message: documentData.message ?? "",
            unlockDate: documentData.unlockDate ?? null,
            createdAt: documentData.createdAt ?? null,
            ownerUid: documentData.ownerUid,
          };
        }) as CapsuleItem[];

        setCapsules(data);
        setLoadingCapsules(false);
      },
      (snapshotError) => {
        console.error("Capsule monitoring error:", snapshotError);

        setError("Gagal memuat Time Capsule.");
        setLoadingCapsules(false);
      },
    );

    const unsubscribeFeedbacks = onSnapshot(
      feedbackQuery,
      (snapshot) => {
        const data = snapshot.docs.map((snapshotDoc) => {
          const documentData = snapshotDoc.data();

          return {
            id: snapshotDoc.id,
            name: documentData.name ?? "Anonim",
            message: documentData.message ?? "",
            createdAt: documentData.createdAt ?? null,
            ownerUid: documentData.ownerUid,
          };
        }) as FeedbackItem[];

        setFeedbacks(data);
        setLoadingFeedbacks(false);
      },
      (snapshotError) => {
        console.error("Feedback monitoring error:", snapshotError);

        setError("Gagal memuat Message for Zagar.");
        setLoadingFeedbacks(false);
      },
    );

    return () => {
      unsubscribeCapsules();
      unsubscribeFeedbacks();
    };
  }, []);

  /* =========================================
     LOADING
  ========================================== */

  const loading = loadingCapsules || loadingFeedbacks;

  /* =========================================
     STATISTICS
  ========================================== */

  const unlockedCount = useMemo(() => {
    return capsules.filter((capsule) => isUnlocked(capsule.unlockDate)).length;
  }, [capsules]);

  const lockedCount = capsules.length - unlockedCount;

  const todayCapsules = useMemo(() => {
    return capsules.filter((capsule) => isToday(capsule.createdAt)).length;
  }, [capsules]);

  const todayFeedbacks = useMemo(() => {
    return feedbacks.filter((feedback) => isToday(feedback.createdAt)).length;
  }, [feedbacks]);

  const uniqueFeedbackPeople = useMemo(() => {
    const names = new Set(
      feedbacks
        .map((feedback) => feedback.name.trim().toLowerCase())
        .filter(Boolean),
    );

    return names.size;
  }, [feedbacks]);

  /* =========================================
     FILTER
  ========================================== */

  const filteredCapsules = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    if (!keyword) {
      return capsules;
    }

    return capsules.filter((capsule) => {
      return (
        capsule.message.toLowerCase().includes(keyword) ||
        formatDate(capsule.createdAt).toLowerCase().includes(keyword) ||
        formatUnlockDate(capsule.unlockDate).toLowerCase().includes(keyword)
      );
    });
  }, [capsules, searchQuery]);

  const filteredFeedbacks = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    if (!keyword) {
      return feedbacks;
    }

    return feedbacks.filter((feedback) => {
      return (
        feedback.name.toLowerCase().includes(keyword) ||
        feedback.message.toLowerCase().includes(keyword)
      );
    });
  }, [feedbacks, searchQuery]);

  const activeResults =
    activeTab === "capsules" ? filteredCapsules : filteredFeedbacks;

  const activeTotal =
    activeTab === "capsules" ? capsules.length : feedbacks.length;

  /* =========================================
     DELETE CAPSULE
  ========================================== */

  async function handleDeleteCapsule(item: CapsuleItem) {
    const confirmed = window.confirm(
      `Hapus Time Capsule ini?\n\nPesan akan dihapus secara permanen dari The Archive.`,
    );

    if (!confirmed) {
      return;
    }

    const deleteKey = `capsule-${item.id}`;

    setDeletingKey(deleteKey);
    setError(null);

    try {
      await deleteDoc(doc(db, "timeCapsules", item.id));
    } catch (deleteError) {
      console.error("Delete capsule error:", deleteError);

      setError("Time Capsule gagal dihapus. Silakan coba lagi.");
    } finally {
      setDeletingKey(null);
    }
  }

  /* =========================================
     DELETE FEEDBACK
  ========================================== */

  async function handleDeleteFeedback(item: FeedbackItem) {
    const name = item.name.trim() || "Anonim";

    const confirmed = window.confirm(
      `Hapus pesan dari ${name}?\n\nPesan akan dihapus secara permanen dari The Archive.`,
    );

    if (!confirmed) {
      return;
    }

    const deleteKey = `feedback-${item.id}`;

    setDeletingKey(deleteKey);
    setError(null);

    try {
      await deleteDoc(doc(db, "feedback", item.id));
    } catch (deleteError) {
      console.error("Delete feedback error:", deleteError);

      setError("Pesan gagal dihapus. Silakan coba lagi.");
    } finally {
      setDeletingKey(null);
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
          <div className="absolute left-[12%] top-[5%] h-80 w-80 rounded-full bg-[#8B5CF6]/5 blur-[125px]" />

          <div className="absolute right-[8%] top-[30%] h-96 w-96 rounded-full bg-[#EC4899]/5 blur-[145px]" />

          <div className="absolute bottom-[4%] left-[42%] h-80 w-80 rounded-full bg-[#6366F1]/5 blur-[135px]" />
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
                    <Clock3 size={12} />
                  </span>
                  The Archive · Future Messages
                </div>

                <h1 className="font-serif text-4xl leading-[0.95] tracking-tight text-white sm:text-5xl lg:text-[56px]">
                  Manage
                  <br />
                  <span className="text-[#F3A9C7]">Time Capsule</span>
                </h1>

                <p className="mt-5 max-w-2xl text-sm leading-6 text-white/35">
                  Kelola surat masa depan dan pesan pribadi yang ditinggalkan
                  melalui The Archive.
                </p>
              </div>

              {/* STATS */}

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                <ArchiveStat
                  icon={<Mail size={14} />}
                  label="Capsule"
                  value={capsules.length}
                />

                <ArchiveStat
                  icon={<LockKeyhole size={14} />}
                  label="Terkunci"
                  value={lockedCount}
                />

                <ArchiveStat
                  icon={<Unlock size={14} />}
                  label="Terbuka"
                  value={unlockedCount}
                  accent
                />

                <ArchiveStat
                  icon={<MessageCircle size={14} />}
                  label="Pesan"
                  value={feedbacks.length}
                />
              </div>
            </div>
          </motion.header>

          {/* =====================================
              ERROR / INFO
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
                  <ShieldCheck size={14} />
                </span>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">
                    Future Message Collection
                  </p>

                  <p className="mt-0.5 text-[10px] text-white/25">
                    Time Capsule dan Message for Zagar tersimpan secara realtime
                    di The Archive.
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
            <div className="mb-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              {/* TITLE */}

              <div>
                <div className="mb-1 flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#F3A9C7]/50">
                  <Sparkles size={11} />
                  Collection
                </div>

                <h2 className="font-serif text-2xl text-white/90">
                  {activeTab === "capsules"
                    ? "Dear Future Me"
                    : "Message for Zagar"}
                </h2>

                <p className="mt-1 text-[10px] text-white/25">
                  {activeTab === "capsules"
                    ? "Kelola surat yang akan dibuka pada waktu yang telah ditentukan."
                    : "Kelola pesan pribadi yang dikirim untuk Zagar."}
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
                  placeholder={
                    activeTab === "capsules"
                      ? "Cari capsule..."
                      : "Cari pesan..."
                  }
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

            {/* TABS */}

            <div className="mb-5 flex flex-wrap items-center gap-2">
              <ArchiveTab
                active={activeTab === "capsules"}
                icon={<Clock3 size={12} />}
                label="Dear Future Me"
                count={capsules.length}
                onClick={() => {
                  setActiveTab("capsules");
                  resetSearch();
                }}
              />

              <ArchiveTab
                active={activeTab === "feedback"}
                icon={<MessageCircle size={12} />}
                label="Message for Zagar"
                count={feedbacks.length}
                onClick={() => {
                  setActiveTab("feedback");
                  resetSearch();
                }}
              />
            </div>

            {/* COLLECTION LINE */}

            <div className="mb-5 flex items-center gap-3">
              <span className="text-[9px] uppercase tracking-[0.16em] text-white/20">
                {searchQuery
                  ? `${activeResults.length} Results`
                  : `${activeTotal} ${
                      activeTab === "capsules" ? "Capsules" : "Messages"
                    }`}
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <ArchiveSkeletonCard key={index} />
              ))}
            </div>
          ) : activeTotal === 0 ? (
            <ArchiveEmptyState activeTab={activeTab} />
          ) : activeResults.length === 0 ? (
            <SearchEmptyState
              searchQuery={searchQuery}
              onReset={resetSearch}
              activeTab={activeTab}
            />
          ) : (
            <AnimatePresence mode="popLayout">
              {activeTab === "capsules" ? (
                <motion.div
                  key="capsule-grid"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3"
                >
                  {filteredCapsules.map((item, index) => (
                    <CapsuleCard
                      key={item.id}
                      item={item}
                      index={index}
                      deleting={deletingKey === `capsule-${item.id}`}
                      onDelete={handleDeleteCapsule}
                    />
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="feedback-grid"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3"
                >
                  {filteredFeedbacks.map((item, index) => (
                    <FeedbackCard
                      key={item.id}
                      item={item}
                      index={index}
                      deleting={deletingKey === `feedback-${item.id}`}
                      onDelete={handleDeleteFeedback}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* =====================================
              FOOTER
          ====================================== */}

          {!loading && activeTotal > 0 && (
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
                {activeResults.length} dari {activeTotal}{" "}
                {activeTab === "capsules" ? "capsule" : "pesan"}
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
   ARCHIVE STAT
============================================ */

function ArchiveStat({
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
    <div className="min-w-[100px] rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 backdrop-blur-xl">
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
   ARCHIVE TAB
============================================ */

function ArchiveTab({
  active,
  icon,
  label,
  count,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        inline-flex
        items-center
        gap-2
        rounded-full
        border
        px-4
        py-2.5
        text-[9px]
        font-semibold
        uppercase
        tracking-[0.08em]
        transition-all
        duration-300
        ${
          active
            ? "border-[#F3A9C7]/20 bg-[#F3A9C7]/10 text-[#F3A9C7]"
            : "border-white/[0.07] bg-white/[0.02] text-white/30 hover:border-white/[0.12] hover:bg-white/[0.04] hover:text-white/60"
        }
      `}
    >
      {icon}

      <span>{label}</span>

      <span
        className={`rounded-full px-1.5 py-0.5 text-[8px] ${
          active
            ? "bg-[#F3A9C7]/10 text-[#F3A9C7]/80"
            : "bg-white/[0.05] text-white/25"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

/* ============================================
   CAPSULE CARD
============================================ */

function CapsuleCard({
  item,
  index,
  deleting,
  onDelete,
}: {
  item: CapsuleItem;
  index: number;
  deleting: boolean;
  onDelete: (item: CapsuleItem) => void;
}) {
  const unlocked = isUnlocked(item.unlockDate);

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
        hover:border-[#F3A9C7]/15
        hover:bg-[#10112D]
        hover:shadow-[0_25px_65px_rgba(0,0,0,0.28)]
      "
    >
      {/* ATMOSPHERE */}

      <div
        className={`
          pointer-events-none
          absolute
          -right-16
          -top-16
          h-36
          w-36
          rounded-full
          blur-[55px]
          transition
          duration-500
          ${
            unlocked
              ? "bg-emerald-400/[0.05] group-hover:bg-emerald-400/[0.10]"
              : "bg-[#A78BFA]/[0.06] group-hover:bg-[#A78BFA]/[0.12]"
          }
        `}
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
        {/* TOP */}

        <div className="flex items-start gap-3">
          <div
            className={`
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              border
              text-lg
              ${
                unlocked
                  ? "border-emerald-400/15 bg-emerald-400/[0.05] text-emerald-300"
                  : "border-[#A78BFA]/15 bg-[#A78BFA]/[0.05] text-[#C4B5FD]"
              }
            `}
          >
            {unlocked ? <Unlock size={17} /> : <LockKeyhole size={17} />}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div
                  className={`
                    inline-flex
                    items-center
                    gap-1.5
                    rounded-full
                    border
                    px-2
                    py-1
                    text-[7px]
                    font-semibold
                    uppercase
                    tracking-[0.1em]
                    ${
                      unlocked
                        ? "border-emerald-400/10 bg-emerald-400/[0.04] text-emerald-300/60"
                        : "border-[#A78BFA]/10 bg-[#A78BFA]/[0.04] text-[#C4B5FD]/60"
                    }
                  `}
                >
                  {unlocked ? (
                    <>
                      <Unlock size={8} />
                      Terbuka
                    </>
                  ) : (
                    <>
                      <LockKeyhole size={8} />
                      Terkunci
                    </>
                  )}
                </div>

                <p className="mt-1.5 text-[9px] text-white/25">
                  {formatDate(item.createdAt)}
                </p>
              </div>

              {/* DELETE */}

              <button
                type="button"
                onClick={() => onDelete(item)}
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
                aria-label="Hapus Time Capsule"
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

        {/* DIVIDER */}

        <div className="my-4 h-px bg-white/[0.05]" />

        {/* MESSAGE */}

        <p
          className="
            min-h-[110px]
            whitespace-pre-wrap
            break-words
            text-[11px]
            leading-5
            text-white/35
          "
        >
          {item.message || "Tidak ada isi pesan."}
        </p>

        {/* UNLOCK DATE */}

        <div
          className="
            mt-4
            rounded-xl
            border
            border-white/[0.05]
            bg-white/[0.02]
            px-3
            py-2.5
          "
        >
          <div className="flex items-center gap-2">
            <CalendarClock
              size={12}
              className={unlocked ? "text-emerald-300/50" : "text-[#C4B5FD]/50"}
            />

            <div className="min-w-0">
              <p className="text-[7px] uppercase tracking-[0.12em] text-white/20">
                Unlock Date
              </p>

              <p className="mt-0.5 truncate text-[9px] text-white/45">
                {formatUnlockDate(item.unlockDate)}
              </p>
            </div>
          </div>
        </div>

        {/* BOTTOM */}

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
            <Clock3 size={9} />
            Dear Future Me
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
   FEEDBACK CARD
============================================ */

function FeedbackCard({
  item,
  index,
  deleting,
  onDelete,
}: {
  item: FeedbackItem;
  index: number;
  deleting: boolean;
  onDelete: (item: FeedbackItem) => void;
}) {
  const name = item.name.trim() || "Anonim";
  const avatarColor = getNameColor(name);

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
        hover:border-[#F3A9C7]/15
        hover:bg-[#10112D]
        hover:shadow-[0_25px_65px_rgba(0,0,0,0.28)]
      "
    >
      {/* ATMOSPHERE */}

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
        {/* TOP */}

        <div className="flex items-start gap-3">
          {/* AVATAR */}

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
              border-white/[0.08]
              text-sm
              font-semibold
              text-white/90
            "
            style={{
              backgroundColor: `${avatarColor}18`,
              borderColor: `${avatarColor}30`,
            }}
          >
            {getInitial(name)}
          </div>

          {/* USER */}

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-[15px] font-semibold text-white/90">
                  {name}
                </h3>

                <p className="mt-1 text-[9px] text-white/25">
                  {formatDate(item.createdAt)}
                </p>
              </div>

              {/* DELETE */}

              <button
                type="button"
                onClick={() => onDelete(item)}
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
                aria-label={`Hapus pesan dari ${name}`}
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

        {/* DIVIDER */}

        <div className="my-4 h-px bg-white/[0.05]" />

        {/* MESSAGE */}

        <p
          className="
            min-h-[110px]
            whitespace-pre-wrap
            break-words
            text-[11px]
            leading-5
            text-white/35
          "
        >
          {item.message || "Tidak ada isi pesan."}
        </p>

        {/* BOTTOM */}

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
            <Send size={9} />
            Message for Zagar
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

function ArchiveSkeletonCard() {
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

        <div className="mt-4 h-10 animate-pulse rounded-xl bg-white/[0.025]" />

        <div className="mt-4 flex justify-between">
          <div className="h-5 w-28 animate-pulse rounded-full bg-white/[0.035]" />

          <div className="h-4 w-4 animate-pulse rounded-full bg-white/[0.035]" />
        </div>
      </div>
    </div>
  );
}

/* ============================================
   EMPTY STATE
============================================ */

function ArchiveEmptyState({ activeTab }: { activeTab: ActiveTab }) {
  const isCapsule = activeTab === "capsules";

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
        {isCapsule ? <Clock3 size={23} /> : <MessageCircle size={23} />}
      </div>

      <p className="mt-5 font-serif text-xl text-white/80">
        {isCapsule ? "Belum ada Time Capsule" : "Belum ada pesan"}
      </p>

      <p className="mt-2 max-w-xs text-xs leading-5 text-white/25">
        {isCapsule
          ? "Time Capsule yang dibuat pengunjung akan muncul di sini."
          : "Message for Zagar yang dikirim pengunjung akan muncul di sini."}
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
  activeTab,
}: {
  searchQuery: string;
  onReset: () => void;
  activeTab: ActiveTab;
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
        {activeTab === "capsules"
          ? "Capsule tidak ditemukan"
          : "Pesan tidak ditemukan"}
      </p>

      <p className="mt-1 text-xs text-white/25">
        Tidak ada hasil untuk &quot;{searchQuery}&quot;.
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
