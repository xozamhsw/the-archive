"use client";

import { useEffect, useMemo, useState } from "react";

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

function formatDate(timestamp: Timestamp | null) {
  if (!timestamp) {
    return "Baru saja";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp.toDate());
}

export default function AdminWallPage() {
  const [messages, setMessages] = useState<WallMessage[]>([]);

  const [loading, setLoading] = useState(true);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const wallQuery = query(
      collection(db, "wall"),

      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      wallQuery,

      (snapshot) => {
        const data = snapshot.docs.map((snapshotDoc) => ({
          id: snapshotDoc.id,

          ...snapshotDoc.data(),
        })) as WallMessage[];

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

  const filteredMessages = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return messages;
    }

    return messages.filter((message) => {
      return (
        message.name.toLowerCase().includes(keyword) ||
        message.message.toLowerCase().includes(keyword)
      );
    });
  }, [messages, search]);

  async function handleDelete(message: WallMessage) {
    const confirmed = window.confirm(`Hapus pesan dari ${message.name}?`);

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

  return (
    <div className="p-4 pt-20 sm:p-6 sm:pt-20 lg:p-8">
      <div className="mx-auto max-w-6xl">
        {/* =========================
            HEADER
        ========================== */}
        <header className="mb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#6D4FC2]/50">
            Messages
          </p>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#3B2E52] sm:text-3xl">
                Friendship Wall
              </h1>

              <p className="mt-2 text-sm leading-6 text-[#3B2E52]/55">
                Kelola pesan yang ditinggalkan untuk Aulia.
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-3 rounded-xl border border-[#D8C8F0]/40 bg-white/60 px-4 py-3">
              <div>
                <p className="text-2xl font-bold text-[#3B2E52]">
                  {messages.length}
                </p>

                <p className="text-[11px] text-[#6D4FC2]/50">Total pesan</p>
              </div>

              <div className="text-2xl">💌</div>
            </div>
          </div>
        </header>

        {/* =========================
            SEARCH
        ========================== */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <svg
              className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6D4FC2]/40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-4.35-4.35m1.1-5.4a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z"
              />
            </svg>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama atau isi pesan..."
              className="w-full rounded-xl border border-[#D8C8F0] bg-white/70 py-3 pl-11 pr-4 text-sm text-[#3B2E52] outline-none transition placeholder:text-[#3B2E52]/30 focus:border-[#A78BFA] focus:ring-2 focus:ring-[#A78BFA]/15"
            />
          </div>
        </div>

        {/* =========================
            ERROR
        ========================== */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* =========================
            LOADING
        ========================== */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from({
              length: 6,
            }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse rounded-2xl border border-[#D8C8F0]/30 bg-white/60 p-5"
              >
                <div className="flex gap-4">
                  <div className="h-11 w-11 rounded-xl bg-[#E9D8FD]" />

                  <div className="flex-1">
                    <div className="h-4 w-28 rounded bg-[#E9D8FD]" />

                    <div className="mt-3 h-3 w-full rounded bg-[#E9D8FD]/70" />

                    <div className="mt-2 h-3 w-4/5 rounded bg-[#E9D8FD]/70" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredMessages.length === 0 ? (
          /* =========================
              EMPTY
          ========================== */
          <div className="rounded-2xl border-2 border-dashed border-[#D8C8F0] bg-white/30 px-6 py-16 text-center">
            <div className="text-4xl">💌</div>

            <p className="mt-4 text-sm font-semibold text-[#3B2E52]">
              {search ? "Pesan tidak ditemukan" : "Belum ada pesan"}
            </p>

            <p className="mt-1 text-xs text-[#3B2E52]/45">
              {search
                ? "Coba gunakan kata pencarian lain."
                : "Pesan Friendship Wall akan muncul di sini."}
            </p>
          </div>
        ) : (
          /* =========================
              MESSAGE LIST
          ========================== */
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredMessages.map((message) => (
              <article
                key={message.id}
                className="group rounded-2xl border border-[#D8C8F0]/30 bg-white/70 p-5 shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  {/* EMOJI */}
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#E9D8FD]/70 text-2xl">
                    {message.emoji || "💌"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[#3B2E52]">
                          {message.name}
                        </p>

                        <p className="mt-1 text-[11px] text-[#3B2E52]/35">
                          {formatDate(message.createdAt)}
                        </p>
                      </div>

                      {/* DELETE */}
                      <button
                        type="button"
                        onClick={() => handleDelete(message)}
                        disabled={deletingId === message.id}
                        className="flex-shrink-0 rounded-lg px-2.5 py-2 text-xs font-medium text-red-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {deletingId === message.id ? "Menghapus..." : "Hapus"}
                      </button>
                    </div>

                    {/* MESSAGE */}
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#3B2E52]/70">
                      {message.message}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
