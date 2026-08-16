"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  ArrowRight,
  Check,
  Clock3,
  Heart,
  Lock,
  Mail,
  MessageCircle,
  Send,
  Sparkles,
} from "lucide-react";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

import { publicDb, ensurePublicUser } from "@/lib/firebase";

import ArchiveShell from "@/components/ui/ArchiveShell";
import ArchiveContainer from "@/components/ui/ArchiveContainer";
import SectionBadge from "@/components/ui/SectionBadge";
import PageNumber from "@/components/ui/PageNumber";
import JourneyNavigation from "@/components/navigation/JourneyNavigation";

/* =========================================================
   CONSTANT
========================================================= */

const CAPSULE_STORAGE_KEY = "the-archive-my-capsule";

/* =========================================================
   TYPES
========================================================= */

interface CapsuleData {
  message: string;
  unlockDate: Timestamp;
  createdAt: Timestamp | null;
  ownerUid: string;
}

/* =========================================================
   HELPERS
========================================================= */

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

/* =========================================================
   CAPSULE ARTWORK
========================================================= */

function CapsuleArtwork({ type }: { type: "envelope" | "bottle" | "moon" }) {
  const asset =
    type === "envelope"
      ? "/capsule/envelope.png"
      : type === "bottle"
        ? "/capsule/message-bottle.png"
        : "/capsule/moon.png";

  return (
    <div
      className="
        relative
        mx-auto
        flex
        h-[190px]
        w-[230px]
        items-center
        justify-center
        sm:h-[220px]
        sm:w-[270px]
      "
    >
      <div
        aria-hidden="true"
        className="
          absolute
          inset-[8%]
          rounded-full
          bg-[#9c5d94]/[0.08]
          blur-[38px]
        "
      />

      <Image
        src="/capsule/capsule-glow.png"
        alt=""
        fill
        sizes="270px"
        aria-hidden="true"
        className="
          pointer-events-none
          object-contain
          opacity-[0.28]
          blur-[1px]
        "
      />

      <motion.div
        animate={{
          y: [0, -6, 0],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="
          relative
          z-10
          h-full
          w-full
        "
      >
        <Image
          src={asset}
          alt=""
          fill
          priority={type === "envelope" || type === "bottle"}
          sizes="270px"
          className="
            object-contain
            drop-shadow-[0_25px_45px_rgba(0,0,0,0.38)]
          "
        />
      </motion.div>
    </div>
  );
}

/* =========================================================
   CAPSULE CARD
========================================================= */

function CapsuleCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.article
      initial={{
        opacity: 0,
        y: 24,
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
        duration: 0.65,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={`
        group
        relative
        isolate
        overflow-hidden
        rounded-[22px]
        border
        border-white/[0.08]
        bg-[#0b0e24]
        shadow-[0_15px_50px_rgba(0,0,0,0.22)]
        transition-all
        duration-500
        hover:border-[var(--archive-gold)]/20
        hover:shadow-[0_20px_60px_rgba(124,72,160,0.15)]
        ${className}
      `}
    >
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-0
          bg-[radial-gradient(
            circle_at_50%_25%,
            rgba(156,93,148,0.12),
            transparent_55%
          )]
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-x-0
          top-0
          h-px
          bg-gradient-to-r
          from-transparent
          via-[var(--archive-gold)]/20
          to-transparent
        "
      />

      <div className="relative z-10">{children}</div>

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-x-0
          bottom-0
          h-px
          bg-gradient-to-r
          from-transparent
          via-[var(--archive-gold)]/30
          to-transparent
          opacity-0
          transition-opacity
          duration-500
          group-hover:opacity-100
        "
      />
    </motion.article>
  );
}

/* =========================================================
   MAIN
========================================================= */

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

  /* =========================================================
     LOAD CAPSULE
  ========================================================= */

  useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          /*
           * Pastikan anonymous authentication
           * sudah tersedia sebelum membaca Firestore.
           */
          const user = await ensurePublicUser();

          if (cancelled) return;

          const storedId = localStorage.getItem(CAPSULE_STORAGE_KEY);

          /*
           * Belum pernah membuat capsule.
           */
          if (!storedId) {
            setLoadingCapsule(false);
            return;
          }

          try {
            const capsuleRef = doc(publicDb, "timeCapsules", storedId);

            const snapshot = await getDoc(capsuleRef);

            if (cancelled) return;

            /*
             * Capsule sudah tidak ada.
             */
            if (!snapshot.exists()) {
              localStorage.removeItem(CAPSULE_STORAGE_KEY);

              setCapsuleId(null);
              setCapsuleData(null);
              setCapsuleError(null);

              return;
            }

            const data = snapshot.data() as CapsuleData;

            /*
             * Validasi tambahan di client.
             *
             * Walaupun rules Firestore sudah
             * melakukan validasi server-side,
             * kita tetap memastikan capsule
             * benar-benar milik session ini.
             */
            if (!data.ownerUid || data.ownerUid !== user.uid) {
              localStorage.removeItem(CAPSULE_STORAGE_KEY);

              setCapsuleId(null);
              setCapsuleData(null);
              setCapsuleError(null);

              return;
            }

            setCapsuleId(storedId);
            setCapsuleData(data);
            setCapsuleError(null);
          } catch (readError) {
            console.error("Read Time Capsule error:", readError);

            /*
             * JANGAN menghapus localStorage
             * hanya karena permission denied.
             *
             * Permission denied bisa berarti:
             * - rules salah
             * - auth belum aktif
             * - project Firebase berbeda
             */
            if (isPermissionDeniedError(readError)) {
              if (!cancelled) {
                setCapsuleError(
                  "Time Capsule tidak dapat diakses. Pastikan Anonymous Authentication dan Firestore Rules sudah aktif.",
                );
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

  /* =========================================================
     SAVE CAPSULE
  ========================================================= */

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
      /*
       * Pastikan visitor sudah memiliki
       * anonymous Firebase UID.
       */
      const user = await ensurePublicUser();

      if (!user.uid) {
        throw new Error("Anonymous user UID tidak tersedia.");
      }

      const unlockDate = new Date();

      unlockDate.setFullYear(unlockDate.getFullYear() + 1);

      const unlockTimestamp = Timestamp.fromDate(unlockDate);

      /*
       * Firestore create.
       *
       * Rules akan memastikan:
       *
       * request.auth.uid
       * ===
       * request.resource.data.ownerUid
       */
      const documentReference = await addDoc(
        collection(publicDb, "timeCapsules"),
        {
          message: trimmedMessage,

          unlockDate: unlockTimestamp,

          ownerUid: user.uid,

          createdAt: serverTimestamp(),
        },
      );

      /*
       * Simpan ID capsule di browser.
       */
      localStorage.setItem(CAPSULE_STORAGE_KEY, documentReference.id);

      /*
       * Update UI tanpa reload.
       */
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

      if (isPermissionDeniedError(saveError)) {
        setCapsuleError(
          "Firebase menolak penyimpanan Time Capsule. Pastikan Anonymous Authentication aktif dan Firestore Rules sudah dipublish.",
        );
      } else {
        setCapsuleError("Time Capsule gagal disimpan. Silakan coba lagi.");
      }
    } finally {
      setSavingCapsule(false);
    }
  }

  /* =========================================================
     SEND FEEDBACK
  ========================================================= */

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

      if (!user.uid) {
        throw new Error("Anonymous user UID tidak tersedia.");
      }

      await addDoc(collection(publicDb, "feedback"), {
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

      if (isPermissionDeniedError(sendError)) {
        setFeedbackError(
          "Firebase menolak pengiriman pesan. Pastikan Anonymous Authentication dan Firestore Rules sudah aktif.",
        );
      } else {
        setFeedbackError("Pesan gagal dikirim. Silakan coba lagi.");
      }
    } finally {
      setSendingFeedback(false);
    }
  }

  /* =========================================================
     CAPSULE STATE
  ========================================================= */

  const unlockDate = capsuleData?.unlockDate?.toDate();

  const isUnlocked = unlockDate ? new Date() >= unlockDate : false;

  const remainingDays = useMemo(() => {
    if (!unlockDate) return 0;

    return calculateRemainingDays(unlockDate);
  }, [unlockDate]);

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <ArchiveShell>
      <main className="relative overflow-hidden">
        {/* =====================================================
            AMBIENT BACKGROUND
        ====================================================== */}

        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            inset-0
            overflow-hidden
          "
        >
          <div
            className="
              archive-ambient-pulse
              absolute
              left-[5%]
              top-[8%]
              h-[280px]
              w-[280px]
              rounded-full
              bg-[#9c5d94]/[0.055]
              blur-[95px]
              sm:h-[380px]
              sm:w-[380px]
            "
          />

          <div
            className="
              absolute
              right-[5%]
              top-[25%]
              h-[230px]
              w-[230px]
              rounded-full
              bg-[var(--archive-gold)]/[0.025]
              blur-[100px]
            "
          />

          <div
            className="
              absolute
              left-1/2
              top-[12%]
              h-[400px]
              w-[400px]
              -translate-x-1/2
              opacity-[0.035]
            "
          >
            <Image
              src="/capsule/capsule-glow.png"
              alt=""
              fill
              sizes="400px"
              aria-hidden="true"
              className="object-contain"
            />
          </div>

          <div
            className="
              absolute
              bottom-[5%]
              left-[45%]
              h-[260px]
              w-[260px]
              rounded-full
              bg-[#5f4b91]/[0.03]
              blur-[100px]
            "
          />
        </div>

        {/* =====================================================
            HEADER
        ====================================================== */}

        <section className="relative pb-7 pt-10 sm:pb-9 sm:pt-14">
          <ArchiveContainer size="wide">
            <div className="flex flex-col gap-7 xl:flex-row xl:gap-10">
              <PageNumber
                number="04"
                title="Time Capsule"
                description="Simpan sesuatu hari ini untuk ditemukan kembali ketika waktunya sudah tiba."
                className="hidden xl:flex"
              />

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
                  <SectionBadge icon={<Clock3 size={11} />}>
                    Pesan untuk Masa Depan
                  </SectionBadge>

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
                    Time Capsule
                  </h1>

                  <p
                    className="
                      mt-4
                      max-w-xl
                      text-sm
                      leading-relaxed
                      text-[var(--archive-muted)]/70
                    "
                  >
                    Tulis sesuatu yang ingin kamu temukan kembali ketika satu
                    tahun telah berlalu.
                  </p>

                  <div
                    className="
                      mt-6
                      flex
                      flex-wrap
                      items-center
                      gap-5
                    "
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="
                          flex
                          h-7
                          w-7
                          items-center
                          justify-center
                          rounded-lg
                          border
                          border-white/10
                          bg-white/[0.025]
                        "
                      >
                        <Lock
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
                          1 Tahun
                        </p>

                        <p
                          className="
                            text-[8px]
                            uppercase
                            tracking-[0.12em]
                            text-[var(--archive-muted)]/45
                          "
                        >
                          Masa Tunggu
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div
                        className="
                          flex
                          h-7
                          w-7
                          items-center
                          justify-center
                          rounded-lg
                          border
                          border-white/10
                          bg-white/[0.025]
                        "
                      >
                        <Mail
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
                          {capsuleId ? "Tersimpan" : "Kosong"}
                        </p>

                        <p
                          className="
                            text-[8px]
                            uppercase
                            tracking-[0.12em]
                            text-[var(--archive-muted)]/45
                          "
                        >
                          Suratmu
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div
                        className="
                          flex
                          h-7
                          w-7
                          items-center
                          justify-center
                          rounded-lg
                          border
                          border-white/10
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
                </motion.div>
              </div>
            </div>
          </ArchiveContainer>
        </section>

        {/* =====================================================
            CONTENT
        ====================================================== */}

        <section className="relative pb-8">
          <ArchiveContainer size="wide">
            <div
              className="
                grid
                grid-cols-1
                gap-4
                xl:grid-cols-2
              "
            >
              {/* =================================================
                  FUTURE ME
              ================================================== */}

              <CapsuleCard>
                <div
                  className="
                    border-b
                    border-white/[0.06]
                    px-6
                    py-6
                    sm:px-8
                  "
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p
                        className="
                          text-[9px]
                          font-semibold
                          uppercase
                          tracking-[0.18em]
                          text-[var(--archive-gold-soft)]/65
                        "
                      >
                        Dear Future Me
                      </p>

                      <h2
                        className="
                          mt-2
                          text-xl
                          font-medium
                          tracking-[-0.02em]
                          text-[var(--archive-text)]
                          sm:text-2xl
                        "
                      >
                        Surat untuk satu tahun lagi.
                      </h2>

                      <p
                        className="
                          mt-2
                          max-w-md
                          text-xs
                          leading-relaxed
                          text-[var(--archive-muted)]/55
                        "
                      >
                        Tulis sesuatu yang ingin kamu baca kembali setelah satu
                        tahun berlalu.
                      </p>
                    </div>

                    <div
                      className="
                        hidden
                        h-9
                        w-9
                        shrink-0
                        items-center
                        justify-center
                        rounded-full
                        border
                        border-white/10
                        bg-white/[0.025]
                        sm:flex
                      "
                    >
                      <Lock
                        size={14}
                        className="text-[var(--archive-gold-soft)]"
                      />
                    </div>
                  </div>
                </div>

                <div className="px-6 py-7 sm:px-8">
                  {loadingCapsule ? (
                    <div
                      className="
                        flex
                        min-h-[440px]
                        flex-col
                        items-center
                        justify-center
                        text-center
                      "
                    >
                      <div
                        className="
                          h-7
                          w-7
                          animate-spin
                          rounded-full
                          border-2
                          border-[var(--archive-gold)]
                          border-t-transparent
                        "
                      />

                      <p
                        className="
                          mt-4
                          text-xs
                          text-[var(--archive-muted)]/50
                        "
                      >
                        Membuka arsipmu...
                      </p>
                    </div>
                  ) : !capsuleId ? (
                    <div>
                      <CapsuleArtwork type="envelope" />

                      <div className="mt-1">
                        <label
                          htmlFor="future-message"
                          className="
                            mb-2
                            block
                            text-[9px]
                            font-medium
                            uppercase
                            tracking-[0.14em]
                            text-[var(--archive-muted)]/45
                          "
                        >
                          Pesanmu
                        </label>

                        <textarea
                          id="future-message"
                          value={futureMessage}
                          maxLength={5000}
                          onChange={(event) =>
                            setFutureMessage(event.target.value)
                          }
                          placeholder="Dear future me..."
                          rows={6}
                          className="
                            w-full
                            resize-none
                            rounded-2xl
                            border
                            border-white/[0.07]
                            bg-[#080a19]/70
                            px-4
                            py-3.5
                            text-sm
                            leading-7
                            text-[var(--archive-text)]
                            outline-none
                            transition-all
                            placeholder:text-[var(--archive-muted)]/25
                            focus:border-[var(--archive-gold)]/30
                            focus:bg-[#080a19]/80
                            focus:ring-2
                            focus:ring-[var(--archive-gold)]/5
                          "
                        />

                        <div
                          className="
                            mt-2
                            text-right
                            text-[8px]
                            text-[var(--archive-muted)]/30
                          "
                        >
                          {futureMessage.length}/5000
                        </div>
                      </div>

                      {capsuleError && (
                        <div
                          className="
                            mt-3
                            rounded-xl
                            border
                            border-red-500/15
                            bg-red-500/[0.04]
                            px-4
                            py-3
                            text-xs
                            text-red-300/75
                          "
                        >
                          {capsuleError}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleSaveCapsule}
                        disabled={savingCapsule}
                        className="
                          mt-4
                          flex
                          w-full
                          items-center
                          justify-center
                          gap-2
                          rounded-full
                          border
                          border-[var(--archive-gold)]/25
                          bg-[var(--archive-gold)]/[0.07]
                          py-3.5
                          text-xs
                          font-semibold
                          text-[var(--archive-gold-soft)]
                          transition-all
                          duration-300
                          hover:border-[var(--archive-gold)]/40
                          hover:bg-[var(--archive-gold)]/[0.12]
                          disabled:cursor-not-allowed
                          disabled:opacity-40
                        "
                      >
                        <Lock size={12} />

                        {savingCapsule
                          ? "Mengunci surat..."
                          : "Kunci Sampai Tahun Depan"}

                        <ArrowRight size={13} />
                      </button>
                    </div>
                  ) : !isUnlocked ? (
                    <div
                      className="
                        flex
                        min-h-[440px]
                        flex-col
                        items-center
                        justify-center
                        text-center
                      "
                    >
                      <div className="relative">
                        <div
                          className="
                            absolute
                            inset-0
                            rounded-full
                            bg-[var(--archive-gold)]/[0.08]
                            blur-2xl
                          "
                        />

                        <div
                          className="
                            relative
                            flex
                            h-28
                            w-28
                            items-center
                            justify-center
                            rounded-full
                            border
                            border-white/10
                            bg-white/[0.025]
                          "
                        >
                          <Lock
                            size={32}
                            strokeWidth={1.3}
                            className="text-[var(--archive-gold-soft)]/70"
                          />
                        </div>
                      </div>

                      <p
                        className="
                          mt-7
                          text-[8px]
                          font-semibold
                          uppercase
                          tracking-[0.22em]
                          text-[var(--archive-gold-soft)]/45
                        "
                      >
                        SEALED
                      </p>

                      <h3
                        className="
                          mt-3
                          text-2xl
                          font-medium
                          tracking-[-0.02em]
                          text-[var(--archive-text)]
                        "
                      >
                        Pesanmu sudah terkunci.
                      </h3>

                      <p
                        className="
                          mx-auto
                          mt-2
                          max-w-xs
                          text-xs
                          leading-6
                          text-[var(--archive-muted)]/50
                        "
                      >
                        Surat ini akan menunggu sampai waktunya tiba.
                      </p>

                      <div
                        className="
                          mt-7
                          w-full
                          max-w-xs
                          rounded-2xl
                          border
                          border-white/[0.06]
                          bg-white/[0.025]
                          px-5
                          py-4
                        "
                      >
                        <p
                          className="
                            text-[8px]
                            uppercase
                            tracking-[0.18em]
                            text-[var(--archive-muted)]/40
                          "
                        >
                          Dibuka dalam
                        </p>

                        <p
                          className="
                            mt-2
                            text-4xl
                            font-medium
                            tracking-[-0.04em]
                            text-[var(--archive-gold-soft)]
                          "
                        >
                          {remainingDays}
                        </p>

                        <p
                          className="
                            mt-1
                            text-[8px]
                            font-semibold
                            uppercase
                            tracking-[0.2em]
                            text-[var(--archive-muted)]/40
                          "
                        >
                          Hari lagi
                        </p>

                        <div className="my-4 h-px bg-white/[0.06]" />

                        <p
                          className="
                            text-[9px]
                            text-[var(--archive-muted)]/40
                          "
                        >
                          Bisa dibuka mulai
                        </p>

                        <p
                          className="
                            mt-1
                            text-sm
                            font-medium
                            text-[var(--archive-text)]/80
                          "
                        >
                          {unlockDate ? formatLongDate(unlockDate) : "-"}
                        </p>
                      </div>
                    </div>
                  ) : !revealed ? (
                    <div
                      className="
                        flex
                        min-h-[440px]
                        flex-col
                        items-center
                        justify-center
                        text-center
                      "
                    >
                      <CapsuleArtwork type="moon" />

                      <h3
                        className="
                          mt-2
                          text-2xl
                          font-medium
                          tracking-[-0.02em]
                          text-[var(--archive-text)]
                        "
                      >
                        Waktunya sudah tiba.
                      </h3>

                      <p
                        className="
                          mx-auto
                          mt-2
                          max-w-xs
                          text-xs
                          leading-6
                          text-[var(--archive-muted)]/50
                        "
                      >
                        Pesan dari dirimu satu tahun lalu sudah menunggu.
                      </p>

                      <button
                        type="button"
                        onClick={() => setRevealed(true)}
                        className="
                          mt-7
                          flex
                          items-center
                          gap-2
                          rounded-full
                          border
                          border-[var(--archive-gold)]/25
                          bg-[var(--archive-gold)]/[0.07]
                          px-7
                          py-3
                          text-xs
                          font-semibold
                          text-[var(--archive-gold-soft)]
                          transition-all
                          duration-300
                          hover:border-[var(--archive-gold)]/40
                          hover:bg-[var(--archive-gold)]/[0.12]
                        "
                      >
                        <Mail size={13} />
                        Buka Surat
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  ) : (
                    <motion.div
                      initial={{
                        opacity: 0,
                        y: 15,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      transition={{
                        duration: 0.5,
                      }}
                      className="min-h-[440px]"
                    >
                      <div
                        className="
                          rounded-2xl
                          border
                          border-white/[0.07]
                          bg-[#080a19]/65
                          p-6
                          sm:p-7
                        "
                      >
                        <div className="flex items-center gap-2">
                          <Sparkles
                            size={12}
                            className="text-[var(--archive-gold-soft)]"
                          />

                          <p
                            className="
                              text-[8px]
                              font-semibold
                              uppercase
                              tracking-[0.2em]
                              text-[var(--archive-gold-soft)]/55
                            "
                          >
                            From your past self
                          </p>
                        </div>

                        <div className="my-5 h-px bg-white/[0.06]" />

                        <p
                          className="
                            whitespace-pre-wrap
                            text-sm
                            leading-8
                            text-[var(--archive-text)]/80
                          "
                        >
                          {capsuleData?.message}
                        </p>

                        <div
                          className="
                            mt-7
                            flex
                            items-center
                            gap-2
                            text-[9px]
                            text-[var(--archive-muted)]/35
                          "
                        >
                          <Check size={11} />

                          <span>
                            Surat dibuka pada{" "}
                            {unlockDate ? formatLongDate(unlockDate) : "-"}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </CapsuleCard>

              {/* =================================================
                  MESSAGE FOR CREATOR
              ================================================== */}

              <CapsuleCard>
                <div
                  className="
                    border-b
                    border-white/[0.06]
                    px-6
                    py-6
                    sm:px-8
                  "
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p
                        className="
                          text-[9px]
                          font-semibold
                          uppercase
                          tracking-[0.18em]
                          text-[var(--archive-gold-soft)]/65
                        "
                      >
                        Message for the Creator
                      </p>

                      <h2
                        className="
                          mt-2
                          text-xl
                          font-medium
                          tracking-[-0.02em]
                          text-[var(--archive-text)]
                          sm:text-2xl
                        "
                      >
                        Tinggalkan satu pesan.
                      </h2>

                      <p
                        className="
                          mt-2
                          max-w-md
                          text-xs
                          leading-relaxed
                          text-[var(--archive-muted)]/55
                        "
                      >
                        Cerita, candaan, kritik, atau sekadar sapaan kecil untuk
                        seseorang di balik The Archive.
                      </p>
                    </div>

                    <div
                      className="
                        hidden
                        h-9
                        w-9
                        shrink-0
                        items-center
                        justify-center
                        rounded-full
                        border
                        border-white/10
                        bg-white/[0.025]
                        sm:flex
                      "
                    >
                      <MessageCircle
                        size={14}
                        className="text-[var(--archive-pink-soft)]"
                      />
                    </div>
                  </div>
                </div>

                <div className="px-6 py-7 sm:px-8">
                  {!feedbackSent ? (
                    <div>
                      <CapsuleArtwork type="bottle" />

                      <div className="mt-1">
                        <label
                          htmlFor="feedback-name"
                          className="
                            mb-2
                            block
                            text-[9px]
                            font-medium
                            uppercase
                            tracking-[0.14em]
                            text-[var(--archive-muted)]/45
                          "
                        >
                          Nama
                        </label>

                        <input
                          id="feedback-name"
                          type="text"
                          value={feedbackName}
                          maxLength={80}
                          onChange={(event) =>
                            setFeedbackName(event.target.value)
                          }
                          placeholder="Nama kamu (opsional)"
                          className="
                            w-full
                            rounded-2xl
                            border
                            border-white/[0.07]
                            bg-[#080a19]/70
                            px-4
                            py-3
                            text-sm
                            text-[var(--archive-text)]
                            outline-none
                            transition-all
                            placeholder:text-[var(--archive-muted)]/25
                            focus:border-[var(--archive-gold)]/30
                            focus:bg-[#080a19]/80
                            focus:ring-2
                            focus:ring-[var(--archive-gold)]/5
                          "
                        />
                      </div>

                      <div className="mt-4">
                        <label
                          htmlFor="feedback-message"
                          className="
                            mb-2
                            block
                            text-[9px]
                            font-medium
                            uppercase
                            tracking-[0.14em]
                            text-[var(--archive-muted)]/45
                          "
                        >
                          Pesan
                        </label>

                        <textarea
                          id="feedback-message"
                          value={feedbackMessage}
                          maxLength={3000}
                          onChange={(event) =>
                            setFeedbackMessage(event.target.value)
                          }
                          placeholder="Tulis sesuatu untuk Zagar..."
                          rows={7}
                          className="
                            w-full
                            resize-none
                            rounded-2xl
                            border
                            border-white/[0.07]
                            bg-[#080a19]/70
                            px-4
                            py-3.5
                            text-sm
                            leading-7
                            text-[var(--archive-text)]
                            outline-none
                            transition-all
                            placeholder:text-[var(--archive-muted)]/25
                            focus:border-[var(--archive-gold)]/30
                            focus:bg-[#080a19]/80
                            focus:ring-2
                            focus:ring-[var(--archive-gold)]/5
                          "
                        />

                        <div
                          className="
                            mt-2
                            text-right
                            text-[8px]
                            text-[var(--archive-muted)]/30
                          "
                        >
                          {feedbackMessage.length}/3000
                        </div>
                      </div>

                      {feedbackError && (
                        <div
                          className="
                            mt-3
                            rounded-xl
                            border
                            border-red-500/15
                            bg-red-500/[0.04]
                            px-4
                            py-3
                            text-xs
                            text-red-300/75
                          "
                        >
                          {feedbackError}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleSendFeedback}
                        disabled={sendingFeedback}
                        className="
                          mt-4
                          flex
                          w-full
                          items-center
                          justify-center
                          gap-2
                          rounded-full
                          border
                          border-[var(--archive-gold)]/25
                          bg-[var(--archive-gold)]/[0.07]
                          py-3.5
                          text-xs
                          font-semibold
                          text-[var(--archive-gold-soft)]
                          transition-all
                          duration-300
                          hover:border-[var(--archive-gold)]/40
                          hover:bg-[var(--archive-gold)]/[0.12]
                          disabled:cursor-not-allowed
                          disabled:opacity-40
                        "
                      >
                        <Send size={12} />

                        {sendingFeedback ? "Mengirim pesan..." : "Kirim Pesan"}

                        <ArrowRight size={13} />
                      </button>
                    </div>
                  ) : (
                    <motion.div
                      initial={{
                        opacity: 0,
                        y: 15,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      transition={{
                        duration: 0.5,
                      }}
                      className="
                        flex
                        min-h-[440px]
                        flex-col
                        items-center
                        justify-center
                        text-center
                      "
                    >
                      <div
                        className="
                          flex
                          h-24
                          w-24
                          items-center
                          justify-center
                          rounded-full
                          border
                          border-[var(--archive-pink-soft)]/15
                          bg-white/[0.025]
                        "
                      >
                        <Check
                          size={30}
                          strokeWidth={1.4}
                          className="text-[var(--archive-pink-soft)]"
                        />
                      </div>

                      <h3
                        className="
                          mt-7
                          text-2xl
                          font-medium
                          tracking-[-0.02em]
                          text-[var(--archive-text)]
                        "
                      >
                        Pesan sudah terkirim.
                      </h3>

                      <p
                        className="
                          mx-auto
                          mt-3
                          max-w-xs
                          text-xs
                          leading-6
                          text-[var(--archive-muted)]/50
                        "
                      >
                        Terima kasih sudah menyempatkan meninggalkan sesuatu di
                        The Archive.
                      </p>

                      <button
                        type="button"
                        onClick={() => {
                          setFeedbackSent(false);
                          setFeedbackError(null);
                        }}
                        className="
                          mt-7
                          text-xs
                          font-semibold
                          text-[var(--archive-gold-soft)]
                          underline
                          decoration-[var(--archive-gold-soft)]/20
                          underline-offset-4
                        "
                      >
                        Kirim pesan lain
                      </button>
                    </motion.div>
                  )}
                </div>
              </CapsuleCard>
            </div>

            {/* =================================================
                FOOTER
            ================================================== */}

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
                  h-px
                  w-12
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
                A message beyond time
              </span>

              <span
                className="
                  h-px
                  w-12
                  bg-gradient-to-l
                  from-transparent
                  to-white/10
                "
              />
            </div>

            <div className="mt-8">
              <JourneyNavigation />
            </div>
          </ArchiveContainer>
        </section>
      </main>
    </ArchiveShell>
  );
}
