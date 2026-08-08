"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

import { db, ensurePublicUser } from "@/lib/firebase";

const CAPSULE_STORAGE_KEY = "the-archive-my-capsule";

interface CapsuleData {
  message: string;
  unlockDate: Timestamp;
  createdAt: Timestamp | null;
  ownerUid?: string;
}

function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function calculateRemainingDays(unlockDate: Date) {
  const difference = unlockDate.getTime() - Date.now();

  return Math.max(0, Math.ceil(difference / (1000 * 60 * 60 * 24)));
}

function isPermissionDeniedError(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }

  const code = String(
    (
      error as {
        code?: unknown;
      }
    ).code ?? "",
  );

  return (
    code === "permission-denied" ||
    code === "firestore/permission-denied" ||
    code.includes("permission-denied")
  );
}

export default function CapsulePage() {
  const [capsuleId, setCapsuleId] = useState<string | null>(null);

  const [capsuleData, setCapsuleData] = useState<CapsuleData | null>(null);

  const [loadingCapsule, setLoadingCapsule] = useState(true);

  const [futureMessage, setFutureMessage] = useState("");

  const [savingCapsule, setSavingCapsule] = useState(false);

  const [capsuleError, setCapsuleError] = useState<string | null>(null);

  const [revealed, setRevealed] = useState(false);

  const [feedbackName, setFeedbackName] = useState("");

  const [feedbackMessage, setFeedbackMessage] = useState("");

  const [sendingFeedback, setSendingFeedback] = useState(false);

  const [feedbackSent, setFeedbackSent] = useState(false);

  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  /**
   * Load capsule milik visitor.
   *
   * Capsule lama yang sudah tidak memiliki ownership
   * valid tidak dibuka paksa.
   *
   * Referensi localStorage-nya saja yang dibersihkan.
   * Document Firestore tetap aman dan masih bisa
   * dilihat dari panel admin.
   */
  useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          await ensurePublicUser();

          if (cancelled) {
            return;
          }

          const storedId = localStorage.getItem(CAPSULE_STORAGE_KEY);

          /**
           * Belum pernah membuat capsule.
           */
          if (!storedId) {
            setLoadingCapsule(false);

            return;
          }

          try {
            const snapshot = await getDoc(doc(db, "timeCapsules", storedId));

            if (cancelled) {
              return;
            }

            /**
             * Document sudah dihapus admin.
             */
            if (!snapshot.exists()) {
              localStorage.removeItem(CAPSULE_STORAGE_KEY);

              setCapsuleId(null);

              setCapsuleData(null);

              setCapsuleError(null);

              return;
            }

            const data = snapshot.data() as CapsuleData;

            setCapsuleId(storedId);

            setCapsuleData(data);

            setCapsuleError(null);
          } catch (readError) {
            /**
             * Kemungkinan besar capsule dibuat sebelum
             * ownerUid diterapkan atau UID anonymous
             * browser sudah berubah.
             *
             * Jangan membuka rules.
             *
             * Hapus referensi lokal saja.
             */
            if (isPermissionDeniedError(readError)) {
              console.info(
                "Stored Time Capsule no longer belongs to this visitor session. Local reference cleared.",
              );

              localStorage.removeItem(CAPSULE_STORAGE_KEY);

              if (!cancelled) {
                setCapsuleId(null);

                setCapsuleData(null);

                setCapsuleError(null);
              }

              return;
            }

            throw readError;
          }
        } catch (loadError) {
          console.error("Load Time Capsule error:", loadError);

          if (!cancelled) {
            setCapsuleError(
              "Time Capsule belum bisa dimuat. Silakan coba lagi.",
            );
          }
        } finally {
          if (!cancelled) {
            setLoadingCapsule(false);
          }
        }
      })();
    }, 0);

    return () => {
      cancelled = true;

      window.clearTimeout(timer);
    };
  }, []);

  async function handleSaveCapsule() {
    const trimmedMessage = futureMessage.trim();

    if (!trimmedMessage) {
      setCapsuleError("Tulis dulu pesan untuk dirimu di masa depan.");

      return;
    }

    if (trimmedMessage.length > 5000) {
      setCapsuleError("Pesan maksimal 5000 karakter.");

      return;
    }

    setSavingCapsule(true);

    setCapsuleError(null);

    try {
      const user = await ensurePublicUser();

      const unlockDate = new Date();

      unlockDate.setFullYear(unlockDate.getFullYear() + 1);

      const unlockTimestamp = Timestamp.fromDate(unlockDate);

      const documentReference = await addDoc(collection(db, "timeCapsules"), {
        message: trimmedMessage,

        unlockDate: unlockTimestamp,

        ownerUid: user.uid,

        createdAt: serverTimestamp(),
      });

      localStorage.setItem(CAPSULE_STORAGE_KEY, documentReference.id);

      setCapsuleId(documentReference.id);

      setCapsuleData({
        message: trimmedMessage,

        unlockDate: unlockTimestamp,

        ownerUid: user.uid,

        createdAt: Timestamp.now(),
      });

      setFutureMessage("");

      setCapsuleError(null);
    } catch (saveError) {
      console.error("Save Time Capsule error:", saveError);

      setCapsuleError("Time Capsule gagal disimpan. Silakan coba lagi.");
    } finally {
      setSavingCapsule(false);
    }
  }

  async function handleSendFeedback() {
    const trimmedMessage = feedbackMessage.trim();

    const trimmedName = feedbackName.trim() || "Anonim";

    if (!trimmedMessage) {
      setFeedbackError("Tulis dulu pesannya ya.");

      return;
    }

    if (trimmedName.length > 80) {
      setFeedbackError("Nama maksimal 80 karakter.");

      return;
    }

    if (trimmedMessage.length > 3000) {
      setFeedbackError("Pesan maksimal 3000 karakter.");

      return;
    }

    setSendingFeedback(true);

    setFeedbackError(null);

    try {
      const user = await ensurePublicUser();

      await addDoc(collection(db, "feedback"), {
        name: trimmedName,

        message: trimmedMessage,

        ownerUid: user.uid,

        createdAt: serverTimestamp(),
      });

      setFeedbackSent(true);

      setFeedbackName("");

      setFeedbackMessage("");
    } catch (sendError) {
      console.error("Send feedback error:", sendError);

      setFeedbackError("Pesan gagal dikirim. Silakan coba lagi.");
    } finally {
      setSendingFeedback(false);
    }
  }

  const unlockDate = capsuleData?.unlockDate?.toDate();

  const isUnlocked = unlockDate ? new Date() >= unlockDate : false;

  const remainingDays = useMemo(() => {
    if (!unlockDate) {
      return 0;
    }

    return calculateRemainingDays(unlockDate);
  }, [unlockDate]);

  return (
    <main className="min-h-screen bg-[#F5F1FA] px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-5xl">
        {/* HEADER */}
        <header className="mb-12 text-center sm:mb-16">
          <p className="mb-3 text-xs font-semibold tracking-[0.22em] text-[#6D4FC2]/50">
            TIME CAPSULE
          </p>

          <h1 className="text-3xl font-semibold tracking-[-0.035em] text-[#3B2E52] sm:text-4xl">
            Untuk Nanti & Untuk Sekarang
          </h1>

          <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-[#3B2E52]/55">
            Simpan sesuatu untuk dirimu di masa depan, atau tinggalkan satu
            pesan kecil untuk pembuat The Archive.
          </p>
        </header>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          {/* DEAR FUTURE ME */}
          <section className="overflow-hidden rounded-[1.5rem] border border-[#D8C8F0]/40 bg-white/65 shadow-sm backdrop-blur-sm">
            <div className="border-b border-[#D8C8F0]/30 p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#E9D8FD] text-xl">
                💌
              </div>

              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6D4FC2]/45">
                Dear Future Me
              </p>

              <h2 className="mt-2 text-xl font-semibold text-[#3B2E52]">
                Surat untuk satu tahun lagi.
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#3B2E52]/55">
                Tulis sesuatu yang ingin kamu baca kembali setelah satu tahun
                berlalu.
              </p>
            </div>

            <div className="p-6">
              {loadingCapsule ? (
                <div className="py-12 text-center">
                  <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-[#D8C8F0] border-b-[#A78BFA]" />

                  <p className="mt-3 text-xs text-[#3B2E52]/45">
                    Membuka arsipmu...
                  </p>
                </div>
              ) : !capsuleId ? (
                <>
                  <textarea
                    value={futureMessage}
                    maxLength={5000}
                    onChange={(event) => setFutureMessage(event.target.value)}
                    placeholder="Dear future me..."
                    rows={7}
                    className="w-full resize-none rounded-xl border border-[#D8C8F0] bg-white px-4 py-3 text-sm leading-7 text-[#3B2E52] outline-none transition placeholder:text-[#3B2E52]/30 focus:border-[#A78BFA] focus:ring-2 focus:ring-[#A78BFA]/15"
                  />

                  <div className="mt-2 text-right text-[10px] text-[#3B2E52]/35">
                    {futureMessage.length}/5000
                  </div>

                  {capsuleError && (
                    <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                      {capsuleError}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveCapsule}
                    disabled={savingCapsule}
                    className="mt-4 w-full rounded-xl bg-[#A78BFA] py-3.5 text-sm font-semibold text-white transition hover:bg-[#6D4FC2] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingCapsule
                      ? "Mengunci surat..."
                      : "Kunci Sampai Tahun Depan"}
                  </button>
                </>
              ) : !isUnlocked ? (
                <div className="py-6 text-center">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#E9D8FD]/70 text-4xl">
                    🔒
                  </div>

                  <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#6D4FC2]/45">
                    Sealed
                  </p>

                  <h3 className="mt-2 text-xl font-semibold text-[#3B2E52]">
                    Pesanmu sudah terkunci.
                  </h3>

                  <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-[#3B2E52]/55">
                    Surat ini akan menunggu sampai waktunya tiba.
                  </p>

                  <div className="mx-auto mt-7 max-w-xs rounded-2xl border border-[#D8C8F0]/40 bg-[#F5F1FA]/70 px-5 py-5">
                    <p className="text-4xl font-bold tracking-[-0.04em] text-[#6D4FC2]">
                      {remainingDays}
                    </p>

                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6D4FC2]/45">
                      Hari lagi
                    </p>

                    <div className="my-4 h-px bg-[#D8C8F0]/50" />

                    <p className="text-xs text-[#3B2E52]/50">
                      Bisa dibuka mulai
                    </p>

                    <p className="mt-1 text-sm font-semibold text-[#3B2E52]">
                      {unlockDate ? formatLongDate(unlockDate) : "-"}
                    </p>
                  </div>
                </div>
              ) : !revealed ? (
                <div className="py-10 text-center">
                  <div className="text-5xl">🔓</div>

                  <h3 className="mt-5 text-xl font-semibold text-[#3B2E52]">
                    Waktunya sudah tiba.
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-[#3B2E52]/55">
                    Pesan dari dirimu satu tahun lalu sudah menunggu.
                  </p>

                  <button
                    type="button"
                    onClick={() => setRevealed(true)}
                    className="mt-6 rounded-full bg-[#A78BFA] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#6D4FC2]"
                  >
                    Buka Surat
                  </button>
                </div>
              ) : (
                <div className="rounded-2xl bg-[#F5F1FA] p-5 sm:p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6D4FC2]/45">
                    From your past self
                  </p>

                  <p className="mt-5 whitespace-pre-wrap text-sm leading-8 text-[#3B2E52]/80">
                    {capsuleData?.message}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* MESSAGE FOR ZAGAR */}
          <section className="overflow-hidden rounded-[1.5rem] border border-[#D8C8F0]/40 bg-white/65 shadow-sm backdrop-blur-sm">
            <div className="border-b border-[#D8C8F0]/30 p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#E9D8FD] text-xl">
                ✉️
              </div>

              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6D4FC2]/45">
                Message for Zagar
              </p>

              <h2 className="mt-2 text-xl font-semibold text-[#3B2E52]">
                Ada sesuatu yang ingin disampaikan?
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#3B2E52]/55">
                Kritik, cerita, candaan, atau sekadar sapaan. Pesan ini hanya
                bisa dibaca melalui panel admin.
              </p>
            </div>

            <div className="p-6">
              {!feedbackSent ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={feedbackName}
                    maxLength={80}
                    onChange={(event) => setFeedbackName(event.target.value)}
                    placeholder="Nama kamu (opsional)"
                    className="w-full rounded-xl border border-[#D8C8F0] bg-white px-4 py-3 text-sm text-[#3B2E52] outline-none transition placeholder:text-[#3B2E52]/30 focus:border-[#A78BFA] focus:ring-2 focus:ring-[#A78BFA]/15"
                  />

                  <textarea
                    value={feedbackMessage}
                    maxLength={3000}
                    onChange={(event) => setFeedbackMessage(event.target.value)}
                    placeholder="Tulis sesuatu untuk Zagar..."
                    rows={7}
                    className="w-full resize-none rounded-xl border border-[#D8C8F0] bg-white px-4 py-3 text-sm leading-7 text-[#3B2E52] outline-none transition placeholder:text-[#3B2E52]/30 focus:border-[#A78BFA] focus:ring-2 focus:ring-[#A78BFA]/15"
                  />

                  <div className="text-right text-[10px] text-[#3B2E52]/35">
                    {feedbackMessage.length}/3000
                  </div>

                  {feedbackError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                      {feedbackError}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSendFeedback}
                    disabled={sendingFeedback}
                    className="w-full rounded-xl bg-[#A78BFA] py-3.5 text-sm font-semibold text-white transition hover:bg-[#6D4FC2] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {sendingFeedback ? "Mengirim pesan..." : "Kirim Pesan"}
                  </button>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <div className="text-5xl">💜</div>

                  <h3 className="mt-5 text-xl font-semibold text-[#3B2E52]">
                    Pesan sudah terkirim.
                  </h3>

                  <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-[#3B2E52]/55">
                    Terima kasih sudah menyempatkan meninggalkan sesuatu di The
                    Archive.
                  </p>

                  <button
                    type="button"
                    onClick={() => setFeedbackSent(false)}
                    className="mt-6 text-sm font-semibold text-[#6D4FC2] underline decoration-[#A78BFA]/40 underline-offset-4"
                  >
                    Kirim pesan lain
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="mt-16 text-center">
          <Link
            href="/ending"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#A78BFA] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[#6D4FC2]"
          >
            Lanjut ke Ending
            <span className="ml-2">→</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
