"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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

interface CapsuleItem {
  id: string;
  message: string;
  unlockDate: Timestamp;
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

const AVATAR_COLORS = ["#A78BFA", "#F5A9D0", "#8B5E3C", "#6D4FC2", "#FF9AC1"];

function colorForName(name: string) {
  const safeName = name || "Anonim";

  const sum = safeName
    .split("")
    .reduce(
      (accumulator, character) => accumulator + character.charCodeAt(0),
      0,
    );

  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function formatDate(timestamp: Timestamp | null) {
  if (!timestamp) {
    return "Tanggal tidak tersedia";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp.toDate());
}

export default function MonitoringCapsulePage() {
  const [capsules, setCapsules] = useState<CapsuleItem[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);

  const [loadingCapsules, setLoadingCapsules] = useState(true);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);

  const [activeTab, setActiveTab] = useState<ActiveTab>("capsules");

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

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
        setCapsules(
          snapshot.docs.map((snapshotDoc) => ({
            id: snapshotDoc.id,
            ...snapshotDoc.data(),
          })) as CapsuleItem[],
        );

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
        setFeedbacks(
          snapshot.docs.map((snapshotDoc) => ({
            id: snapshotDoc.id,
            ...snapshotDoc.data(),
          })) as FeedbackItem[],
        );

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

  const now = new Date();

  const unlockedCount = useMemo(
    () =>
      capsules.filter((capsule) => {
        if (!capsule.unlockDate) {
          return false;
        }

        return now >= capsule.unlockDate.toDate();
      }).length,
    [capsules],
  );

  const lockedCount = capsules.length - unlockedCount;

  async function handleDeleteCapsule(item: CapsuleItem) {
    const confirmed = window.confirm("Hapus Time Capsule ini secara permanen?");

    if (!confirmed) {
      return;
    }

    setDeletingId(item.id);
    setError(null);

    try {
      await deleteDoc(doc(db, "timeCapsules", item.id));
    } catch (deleteError) {
      console.error("Delete capsule error:", deleteError);

      setError("Time Capsule gagal dihapus.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeleteFeedback(item: FeedbackItem) {
    const confirmed = window.confirm(
      `Hapus pesan dari ${item.name || "Anonim"}?`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(item.id);
    setError(null);

    try {
      await deleteDoc(doc(db, "feedback", item.id));
    } catch (deleteError) {
      console.error("Delete feedback error:", deleteError);

      setError("Pesan gagal dihapus.");
    } finally {
      setDeletingId(null);
    }
  }

  const loading = loadingCapsules || loadingFeedbacks;

  return (
    <div className="p-4 pt-20 sm:p-6 sm:pt-20 lg:p-8">
      <div className="mx-auto max-w-6xl">
        {/* HEADER */}
        <header className="mb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#6D4FC2]/50">
            Future Messages
          </p>

          <h1 className="text-2xl font-bold text-[#3B2E52] sm:text-3xl">
            Time Capsule
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-[#3B2E52]/55">
            Pantau surat masa depan dan pesan pribadi yang dikirim melalui The
            Archive.
          </p>
        </header>

        {/* STATS */}
        <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total Capsule" value={capsules.length} icon="💌" />

          <StatCard label="Terkunci" value={lockedCount} icon="🔒" />

          <StatCard label="Terbuka" value={unlockedCount} icon="🔓" />

          <StatCard label="Pesan Zagar" value={feedbacks.length} icon="✉️" />
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* TABS */}
        <div className="mb-6 flex w-full gap-2 overflow-x-auto rounded-2xl border border-[#D8C8F0]/30 bg-white/45 p-1.5 sm:w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("capsules")}
            className={`min-w-max rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
              activeTab === "capsules"
                ? "bg-[#A78BFA] text-white shadow-sm"
                : "text-[#3B2E52]/55 hover:bg-white/60"
            }`}
          >
            Dear Future Me · {capsules.length}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("feedback")}
            className={`min-w-max rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
              activeTab === "feedback"
                ? "bg-[#A78BFA] text-white shadow-sm"
                : "text-[#3B2E52]/55 hover:bg-white/60"
            }`}
          >
            Message for Zagar · {feedbacks.length}
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse rounded-2xl border border-[#D8C8F0]/30 bg-white/60 p-5"
              >
                <div className="h-5 w-28 rounded bg-[#E9D8FD]" />

                <div className="mt-5 h-3 w-full rounded bg-[#E9D8FD]/70" />
                <div className="mt-2 h-3 w-4/5 rounded bg-[#E9D8FD]/70" />
                <div className="mt-5 h-3 w-24 rounded bg-[#E9D8FD]/60" />
              </div>
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === "capsules" ? (
              <motion.section
                key="capsules"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {capsules.length === 0 ? (
                  <EmptyState
                    icon="💌"
                    title="Belum ada Time Capsule"
                    description="Capsule yang dibuat pengunjung akan muncul di sini."
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {capsules.map((item) => {
                      const unlockDate = item.unlockDate?.toDate();

                      const isUnlocked = unlockDate
                        ? new Date() >= unlockDate
                        : false;

                      return (
                        <article
                          key={item.id}
                          className="rounded-2xl border border-[#D8C8F0]/30 bg-white/70 p-5 shadow-sm backdrop-blur-sm"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                                isUnlocked
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-[#E9D8FD] text-[#6D4FC2]"
                              }`}
                            >
                              {isUnlocked ? "🔓 Terbuka" : "🔒 Terkunci"}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleDeleteCapsule(item)}
                              disabled={deletingId === item.id}
                              className="text-xs font-medium text-red-400 transition hover:text-red-600 disabled:opacity-40"
                            >
                              {deletingId === item.id
                                ? "Menghapus..."
                                : "Hapus"}
                            </button>
                          </div>

                          <div className="mt-5">
                            <p className="whitespace-pre-wrap text-sm leading-7 text-[#3B2E52]/75">
                              {item.message}
                            </p>
                          </div>

                          <div className="mt-5 grid grid-cols-1 gap-2 border-t border-[#D8C8F0]/25 pt-4 text-[11px] text-[#3B2E52]/45 sm:grid-cols-2">
                            <p>Dibuat: {formatDate(item.createdAt)}</p>

                            <p className="sm:text-right">
                              Buka:{" "}
                              {unlockDate
                                ? new Intl.DateTimeFormat("id-ID", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                  }).format(unlockDate)
                                : "-"}
                            </p>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </motion.section>
            ) : (
              <motion.section
                key="feedback"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {feedbacks.length === 0 ? (
                  <EmptyState
                    icon="✉️"
                    title="Belum ada pesan"
                    description="Message for Zagar yang dikirim akan muncul di sini."
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {feedbacks.map((item) => {
                      const name = item.name || "Anonim";

                      return (
                        <article
                          key={item.id}
                          className="rounded-2xl border border-[#D8C8F0]/30 bg-white/70 p-5 shadow-sm backdrop-blur-sm"
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                              style={{
                                backgroundColor: colorForName(name),
                              }}
                            >
                              {name.charAt(0).toUpperCase()}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-[#3B2E52]">
                                    {name}
                                  </p>

                                  <p className="mt-0.5 text-[11px] text-[#3B2E52]/35">
                                    {formatDate(item.createdAt)}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteFeedback(item)}
                                  disabled={deletingId === item.id}
                                  className="text-xs font-medium text-red-400 transition hover:text-red-600 disabled:opacity-40"
                                >
                                  {deletingId === item.id
                                    ? "Menghapus..."
                                    : "Hapus"}
                                </button>
                              </div>

                              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#3B2E52]/75">
                                {item.message}
                              </p>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </motion.section>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-[#D8C8F0]/30 bg-white/65 p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-bold tracking-[-0.03em] text-[#3B2E52]">
            {value}
          </p>

          <p className="mt-1 text-[11px] text-[#6D4FC2]/50">{label}</p>
        </div>

        <span className="text-xl">{icon}</span>
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-[#D8C8F0] bg-white/30 px-6 py-16 text-center">
      <p className="text-4xl">{icon}</p>

      <p className="mt-4 text-sm font-semibold text-[#3B2E52]">{title}</p>

      <p className="mt-1 text-xs text-[#3B2E52]/45">{description}</p>
    </div>
  );
}
