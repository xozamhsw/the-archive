"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import Link from "next/link";

import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

import { db, ensurePublicUser } from "@/lib/firebase";

interface WallMessage {
  id: string;
  name: string;
  message: string;
  emoji: string;
  ownerUid?: string;
  createdAt: Timestamp | null;
}

const EMOJI_OPTIONS = ["❤️", "🎉", "🥹", "😂", "🌸", "✨"];

const ROTATIONS = [
  "-rotate-1",
  "rotate-1",
  "-rotate-[0.5deg]",
  "rotate-[0.7deg]",
];

export default function WallPage() {
  const [name, setName] = useState("");

  const [message, setMessage] = useState("");

  const [emoji, setEmoji] = useState(EMOJI_OPTIONS[0]);

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [messages, setMessages] = useState<WallMessage[]>([]);

  const [currentUid, setCurrentUid] = useState<string | null>(null);

  const [openedMessage, setOpenedMessage] = useState<WallMessage | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void ensurePublicUser()
      .then((user) => {
        if (!cancelled) {
          setCurrentUid(user.uid);
        }
      })
      .catch((authError) => {
        console.error("Anonymous auth error:", authError);

        if (!cancelled) {
          setError(
            "Sesi pengunjung belum bisa dibuat. Silakan refresh halaman.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
        setLoading(false);
      },
      (snapshotError) => {
        console.error("Wall listener error:", snapshotError);

        setError("Friendship Wall belum bisa dimuat.");

        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const myMessageCount = useMemo(() => {
    if (!currentUid) {
      return 0;
    }

    return messages.filter((item) => item.ownerUid === currentUid).length;
  }, [currentUid, messages]);

  async function handleSubmit() {
    const trimmedName = name.trim();

    const trimmedMessage = message.trim();

    if (!trimmedName || !trimmedMessage) {
      setError("Nama dan pesan tidak boleh kosong.");

      return;
    }

    if (trimmedName.length > 80) {
      setError("Nama maksimal 80 karakter.");

      return;
    }

    if (trimmedMessage.length > 2000) {
      setError("Pesan maksimal 2000 karakter.");

      return;
    }

    setSubmitting(true);

    setError(null);

    try {
      const user = await ensurePublicUser();

      setCurrentUid(user.uid);

      await addDoc(collection(db, "wall"), {
        name: trimmedName,
        message: trimmedMessage,
        emoji,
        ownerUid: user.uid,
        createdAt: serverTimestamp(),
      });

      setName("");
      setMessage("");
      setEmoji(EMOJI_OPTIONS[0]);
    } catch (submitError) {
      console.error("Submit wall error:", submitError);

      setError("Pesan gagal dikirim. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <MotionConfig
      reducedMotion={process.env.NODE_ENV === "production" ? "user" : "never"}
    >
      <main className="min-h-screen overflow-hidden bg-[#F5F1FA] px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-4xl">
          {/* HEADER */}
          <motion.header
            initial={{
              opacity: 0,
              y: -10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.5,
            }}
            className="mb-12 text-center sm:mb-16"
          >
            <p className="mb-3 text-xs font-semibold tracking-[0.22em] text-[#6D4FC2]/50">
              FRIENDSHIP WALL
            </p>

            <h1 className="text-3xl font-semibold tracking-[-0.035em] text-[#3B2E52] sm:text-4xl">
              Tinggalkan Pesan untuk Aulia
            </h1>

            <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-[#3B2E52]/55">
              Tulis sesuatu yang ingin kamu simpan di sini. Sedikit cerita,
              candaan, doa, atau apa pun yang ingin Aulia baca suatu hari nanti.
            </p>
          </motion.header>

          {/* FORM */}
          <section className="mb-14 rounded-[1.5rem] border border-[#D8C8F0]/40 bg-white/65 p-5 shadow-sm backdrop-blur-sm sm:p-7">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold text-[#3B2E52]">Tulis pesanmu</h2>

                <p className="mt-1 text-xs text-[#3B2E52]/45">
                  {myMessageCount > 0
                    ? `${myMessageCount} pesan kamu sudah tersimpan di wall.`
                    : "Pesanmu akan menjadi bagian dari Friendship Wall."}
                </p>
              </div>

              <div className="text-2xl">💌</div>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                value={name}
                maxLength={80}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nama kamu"
                className="w-full rounded-xl border border-[#D8C8F0] bg-white px-4 py-3 text-sm text-[#3B2E52] outline-none transition placeholder:text-[#3B2E52]/30 focus:border-[#A78BFA] focus:ring-2 focus:ring-[#A78BFA]/15"
              />

              <textarea
                value={message}
                maxLength={2000}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Tulis pesan untuk Aulia..."
                rows={5}
                className="w-full resize-none rounded-xl border border-[#D8C8F0] bg-white px-4 py-3 text-sm leading-6 text-[#3B2E52] outline-none transition placeholder:text-[#3B2E52]/30 focus:border-[#A78BFA] focus:ring-2 focus:ring-[#A78BFA]/15"
              />

              <div className="flex items-center justify-between text-[11px] text-[#3B2E52]/35">
                <span>Pilih ekspresi</span>

                <span>{message.length}/2000</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {EMOJI_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setEmoji(option)}
                    aria-label={`Pilih emoji ${option}`}
                    aria-pressed={emoji === option}
                    className={`flex h-11 w-11 items-center justify-center rounded-full text-xl transition ${
                      emoji === option
                        ? "scale-110 bg-[#E9D8FD] shadow-sm"
                        : "bg-white/70 opacity-55 hover:opacity-100"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full rounded-xl bg-[#A78BFA] py-3.5 text-sm font-semibold text-white transition hover:bg-[#6D4FC2] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Menyimpan pesan..." : "Tempel Pesan ke Wall"}
              </button>
            </div>
          </section>

          {/* WALL */}
          <section>
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6D4FC2]/45">
                  The Wall
                </p>

                <h2 className="mt-1 text-xl font-semibold text-[#3B2E52]">
                  {messages.length} pesan tersimpan
                </h2>
              </div>

              <span className="text-xs text-[#3B2E52]/35">
                Klik pesan untuk membaca
              </span>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {Array.from({
                  length: 6,
                }).map((_, index) => (
                  <div
                    key={index}
                    className="aspect-[4/3] animate-pulse rounded-2xl bg-[#E9D8FD]/60"
                  />
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-[#D8C8F0] px-6 py-14 text-center">
                <div className="text-4xl">✉️</div>

                <p className="mt-3 text-sm font-medium text-[#3B2E52]">
                  Wall masih kosong
                </p>

                <p className="mt-1 text-xs text-[#3B2E52]/45">
                  Jadilah orang pertama yang meninggalkan pesan.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {messages.map((wallMessage, index) => {
                  const isMine = Boolean(
                    currentUid && wallMessage.ownerUid === currentUid,
                  );

                  return (
                    <motion.button
                      key={wallMessage.id}
                      type="button"
                      layout
                      whileHover={{
                        y: -5,
                        rotate: 0,
                      }}
                      whileTap={{
                        scale: 0.98,
                      }}
                      onClick={() => setOpenedMessage(wallMessage)}
                      className={`relative aspect-[4/3] overflow-hidden rounded-2xl border p-4 text-left shadow-sm transition ${
                        ROTATIONS[index % ROTATIONS.length]
                      } ${
                        isMine
                          ? "border-[#A78BFA]/70 bg-[#E9D8FD]"
                          : "border-[#D8C8F0]/50 bg-white/75"
                      }`}
                    >
                      <div className="flex h-full flex-col justify-between">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-2xl">
                            {wallMessage.emoji || "💌"}
                          </span>

                          {isMine && (
                            <span className="rounded-full bg-white/70 px-2 py-1 text-[9px] font-semibold text-[#6D4FC2]">
                              Pesan kamu
                            </span>
                          )}
                        </div>

                        <div>
                          <p className="truncate text-xs font-semibold text-[#3B2E52]">
                            {wallMessage.name}
                          </p>

                          <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[#3B2E52]/55">
                            {wallMessage.message}
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </section>

          <div className="mt-16 text-center">
            <Link
              href="/capsule"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#A78BFA] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[#6D4FC2]"
            >
              Lanjut ke Time Capsule
              <span className="ml-2">→</span>
            </Link>
          </div>
        </div>

        {/* MESSAGE MODAL */}
        <AnimatePresence>
          {openedMessage && (
            <motion.div
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-[#21182F]/40 px-4 backdrop-blur-sm"
              onClick={() => setOpenedMessage(null)}
            >
              <motion.div
                initial={{
                  opacity: 0,
                  scale: 0.94,
                  y: 15,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  scale: 0.96,
                  y: 10,
                }}
                onClick={(event) => event.stopPropagation()}
                className="relative w-full max-w-md rounded-[1.5rem] bg-white p-6 shadow-2xl sm:p-7"
              >
                <button
                  type="button"
                  onClick={() => setOpenedMessage(null)}
                  className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-[#F5F1FA] text-[#6D4FC2] transition hover:bg-[#E9D8FD]"
                  aria-label="Tutup pesan"
                >
                  ×
                </button>

                <div className="text-4xl">{openedMessage.emoji || "💌"}</div>

                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#6D4FC2]/45">
                  Dari
                </p>

                <h3 className="mt-1 text-xl font-semibold text-[#3B2E52]">
                  {openedMessage.name}
                </h3>

                <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-[#3B2E52]/75">
                  {openedMessage.message}
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </MotionConfig>
  );
}
