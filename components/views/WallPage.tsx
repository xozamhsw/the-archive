"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

import {
  ArrowRight,
  Heart,
  Mail,
  MessageCircle,
  Send,
  Sparkles,
  X,
} from "lucide-react";

import { db, ensurePublicUser } from "@/lib/firebase";

import ArchiveShell from "@/components/ui/ArchiveShell";
import ArchiveContainer from "@/components/ui/ArchiveContainer";
import SectionBadge from "@/components/ui/SectionBadge";
import PageNumber from "@/components/ui/PageNumber";
import JourneyNavigation from "@/components/navigation/JourneyNavigation";

interface WallMessage {
  id: string;
  name: string;
  message: string;
  emoji: string;
  ownerUid?: string;
  createdAt: Timestamp | null;
}

const EMOJI_OPTIONS = ["❤️", "🎉", "🥹", "😂", "🌸", "✨"];

const INITIAL_VISIBLE_MESSAGES = 6;

const CARD_ACCENTS = [
  "hover:border-[var(--archive-pink-soft)]/25",
  "hover:border-[var(--archive-gold)]/25",
  "hover:border-[#B99AD8]/25",
];

function formatDate(timestamp: Timestamp | null) {
  if (!timestamp) {
    return "Baru saja";
  }

  const date = timestamp.toDate();

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getInitial(name: string) {
  if (!name || name.toLowerCase() === "anonymous") {
    return "?";
  }

  return name.trim().charAt(0).toUpperCase();
}

export default function WallPage() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [emoji, setEmoji] = useState(EMOJI_OPTIONS[0]);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [messages, setMessages] = useState<WallMessage[]>([]);
  const [currentUid, setCurrentUid] = useState<string | null>(null);

  const [openedMessage, setOpenedMessage] = useState<WallMessage | null>(null);

  const [loading, setLoading] = useState(true);
  const [showAllMessages, setShowAllMessages] = useState(false);

  /*
   * =========================================================
   * ANONYMOUS USER
   * =========================================================
   */

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

  /*
   * =========================================================
   * REALTIME WALL
   * =========================================================
   */

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

  /*
   * =========================================================
   * ESCAPE MODAL
   * =========================================================
   */

  useEffect(() => {
    if (!openedMessage) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenedMessage(null);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [openedMessage]);

  /*
   * =========================================================
   * MY MESSAGE COUNT
   * =========================================================
   */

  const myMessageCount = useMemo(() => {
    if (!currentUid) {
      return 0;
    }

    return messages.filter((item) => item.ownerUid === currentUid).length;
  }, [currentUid, messages]);

  /*
   * =========================================================
   * VISIBLE MESSAGES
   * =========================================================
   */

  const visibleMessages = useMemo(() => {
    if (showAllMessages) {
      return messages;
    }

    return messages.slice(0, INITIAL_VISIBLE_MESSAGES);
  }, [messages, showAllMessages]);

  /*
   * =========================================================
   * AVATAR INITIALS
   * =========================================================
   */

  const avatarInitials = useMemo(() => {
    const initials = messages
      .map((item) => getInitial(item.name))
      .filter((initial) => initial !== "?");

    return Array.from(new Set(initials)).slice(0, 4);
  }, [messages]);

  /*
   * =========================================================
   * SUBMIT MESSAGE
   * =========================================================
   */

  async function handleSubmit() {
    const trimmedName = name.trim();
    const trimmedMessage = message.trim();

    if (!isAnonymous && !trimmedName) {
      setError("Nama tidak boleh kosong.");
      return;
    }

    if (!trimmedMessage) {
      setError("Pesan tidak boleh kosong.");
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
        name: isAnonymous ? "Anonymous" : trimmedName,
        message: trimmedMessage,
        emoji,
        ownerUid: user.uid,
        createdAt: serverTimestamp(),
      });

      setName("");
      setMessage("");
      setEmoji(EMOJI_OPTIONS[0]);
      setIsAnonymous(false);
      setShowAllMessages(false);
    } catch (submitError) {
      console.error("Submit wall error:", submitError);

      setError("Pesan gagal dikirim. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  /*
   * =========================================================
   * INPUT HANDLERS
   * =========================================================
   */

  function handleNameChange(value: string) {
    setName(value);

    if (error) {
      setError(null);
    }
  }

  function handleMessageChange(value: string) {
    setMessage(value);

    if (error) {
      setError(null);
    }
  }

  function handleAnonymousChange() {
    setIsAnonymous((previous) => {
      const next = !previous;

      if (next) {
        setName("");
      }

      return next;
    });

    if (error) {
      setError(null);
    }
  }

  return (
    <MotionConfig
      reducedMotion={process.env.NODE_ENV === "production" ? "user" : "never"}
    >
      <ArchiveShell>
        <main className="relative overflow-hidden">
          {/* =====================================================
              AMBIENT BACKGROUND
          ====================================================== */}

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden"
          >
            {/* Purple glow */}

            <div
              className="
                archive-ambient-pulse
                absolute
                left-[4%]
                top-[8%]
                h-[280px]
                w-[280px]
                rounded-full
                bg-[#9c5d94]/[0.045]
                blur-[90px]
                sm:h-[360px]
                sm:w-[360px]
              "
            />

            {/* Pink glow */}

            <div
              className="
                absolute
                right-[4%]
                top-[18%]
                h-[240px]
                w-[240px]
                rounded-full
                bg-[var(--archive-pink-soft)]/[0.025]
                blur-[100px]
              "
            />

            {/* Gold glow */}

            <div
              className="
                absolute
                bottom-[12%]
                left-[42%]
                h-[280px]
                w-[280px]
                rounded-full
                bg-[var(--archive-gold)]/[0.025]
                blur-[110px]
              "
            />

            {/* Tiny stars */}

            <div className="absolute left-[16%] top-[14%] text-[var(--archive-gold-soft)]/20">
              ✦
            </div>

            <div className="absolute left-[38%] top-[8%] text-[var(--archive-pink-soft)]/20">
              ·
            </div>

            <div className="absolute right-[18%] top-[25%] text-[var(--archive-gold-soft)]/20">
              ✧
            </div>

            <div className="absolute bottom-[20%] left-[8%] text-[var(--archive-pink-soft)]/15">
              ✦
            </div>
          </div>

          {/* =====================================================
              HEADER
          ====================================================== */}

          <section className="relative pt-10 pb-7 sm:pt-14 sm:pb-9">
            <ArchiveContainer size="wide">
              <div className="flex flex-col gap-7 xl:flex-row xl:gap-10">
                {/* PAGE NUMBER */}

                <PageNumber
                  number="03"
                  title="Friendship Wall"
                  description="Dinding kecil yang menyimpan kata-kata baik dari orang-orang yang pernah hadir."
                  className="hidden xl:flex"
                />

                {/* HERO */}

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
                    <div className="grid gap-8 xl:grid-cols-[1fr_1.05fr] xl:items-start">
                      {/* =================================================
                          LEFT HERO
                      ================================================== */}

                      <div>
                        <SectionBadge icon={<Mail size={11} />}>
                          Pesan untuk Aulia
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
                          Friendship
                          <br />
                          <span className="text-[var(--archive-pink-soft)]/90">
                            Wall
                          </span>
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
                          Tempat di mana kata-kata baik berubah menjadi pelukan
                          hangat untuk Aulia.
                        </p>

                        {/* PARTICIPANTS */}

                        <div className="mt-6 flex items-center gap-3">
                          <div className="flex -space-x-2">
                            {avatarInitials.length > 0
                              ? avatarInitials.map((initial, index) => (
                                  <div
                                    key={`${initial}-${index}`}
                                    className="
                                      flex h-8 w-8
                                      items-center justify-center
                                      rounded-full
                                      border-2
                                      border-[#080a19]
                                      bg-gradient-to-br
                                      from-[#C77AA2]
                                      to-[#725184]
                                      text-[10px]
                                      font-semibold
                                      text-white
                                    "
                                  >
                                    {initial}
                                  </div>
                                ))
                              : ["A", "✦", "♡"].map((item, index) => (
                                  <div
                                    key={`${item}-${index}`}
                                    className="
                                      flex h-8 w-8
                                      items-center justify-center
                                      rounded-full
                                      border-2
                                      border-[#080a19]
                                      bg-white/[0.05]
                                      text-[10px]
                                      font-semibold
                                      text-[var(--archive-gold-soft)]
                                    "
                                  >
                                    {item}
                                  </div>
                                ))}
                          </div>

                          <div className="h-5 w-px bg-white/10" />

                          <div className="flex items-center gap-1.5">
                            <Heart
                              size={13}
                              fill="currentColor"
                              className="text-[var(--archive-pink-soft)]"
                            />

                            <span
                              className="
                                text-xs
                                text-[var(--archive-muted)]/65
                              "
                            >
                              {messages.length} pesan hangat dari teman-teman
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* =================================================
                          FORM
                      ================================================== */}

                      <motion.section
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
                          delay: 0.1,
                        }}
                        className="
                          relative
                          overflow-hidden
                          rounded-[22px]
                          border
                          border-white/[0.08]
                          bg-[#0b0e24]
                          p-5
                          shadow-[0_15px_50px_rgba(0,0,0,0.22)]
                          sm:p-6
                        "
                      >
                        {/* FORM GLOW */}

                        <div
                          className="
                            pointer-events-none
                            absolute
                            -right-20
                            -top-20
                            h-48
                            w-48
                            rounded-full
                            bg-[var(--archive-pink-soft)]/[0.07]
                            blur-[70px]
                          "
                        />

                        <div
                          className="
                            pointer-events-none
                            absolute
                            -bottom-20
                            left-1/3
                            h-40
                            w-40
                            rounded-full
                            bg-[var(--archive-gold)]/[0.035]
                            blur-[70px]
                          "
                        />

                        <div className="relative">
                          {/* FORM HEADER */}

                          <div className="mb-5">
                            <div className="flex items-center justify-between">
                              <h2
                                className="
                                  archive-display
                                  text-lg
                                  text-[var(--archive-text)]
                                "
                              >
                                Tulis Pesan untuk Aulia
                              </h2>

                              <MessageCircle
                                size={17}
                                className="text-[var(--archive-pink-soft)]/55"
                              />
                            </div>

                            <p
                              className="
                                mt-1
                                text-xs
                                text-[var(--archive-muted)]/45
                              "
                            >
                              {myMessageCount > 0
                                ? `${myMessageCount} pesan kamu sudah tersimpan.`
                                : "Tulis pesan hangatmu di sini..."}
                            </p>
                          </div>

                          {/* NAME */}

                          <AnimatePresence initial={false}>
                            {!isAnonymous && (
                              <motion.div
                                initial={{
                                  opacity: 0,
                                  height: 0,
                                  marginBottom: 0,
                                }}
                                animate={{
                                  opacity: 1,
                                  height: "auto",
                                  marginBottom: 12,
                                }}
                                exit={{
                                  opacity: 0,
                                  height: 0,
                                  marginBottom: 0,
                                }}
                                className="overflow-hidden"
                              >
                                <input
                                  type="text"
                                  value={name}
                                  maxLength={80}
                                  onChange={(event) =>
                                    handleNameChange(event.target.value)
                                  }
                                  placeholder="Nama kamu"
                                  disabled={submitting}
                                  className="
                                    h-10
                                    w-full
                                    rounded-xl
                                    border
                                    border-white/[0.07]
                                    bg-white/[0.02]
                                    px-4
                                    text-xs
                                    text-[var(--archive-text)]
                                    outline-none
                                    transition-all
                                    placeholder:text-[var(--archive-muted)]/35
                                    focus:border-[var(--archive-gold)]/30
                                    focus:bg-white/[0.035]
                                    disabled:cursor-not-allowed
                                    disabled:opacity-50
                                  "
                                />

                                <div className="mt-1.5 flex justify-end">
                                  <span
                                    className="
                                      text-[9px]
                                      text-[var(--archive-muted)]/30
                                    "
                                  >
                                    {name.length}/80
                                  </span>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* MESSAGE */}

                          <div className="relative">
                            <textarea
                              value={message}
                              maxLength={2000}
                              onChange={(event) =>
                                handleMessageChange(event.target.value)
                              }
                              placeholder="Tulis pesan hangatmu di sini..."
                              rows={5}
                              disabled={submitting}
                              className="
                                w-full
                                resize-none
                                rounded-xl
                                border
                                border-white/[0.07]
                                bg-white/[0.02]
                                px-4
                                py-3.5
                                text-sm
                                leading-6
                                text-[var(--archive-text)]
                                outline-none
                                transition-all
                                placeholder:text-[var(--archive-muted)]/35
                                focus:border-[var(--archive-gold)]/30
                                focus:bg-white/[0.035]
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                              "
                            />

                            <span
                              className="
                                absolute
                                bottom-2.5
                                right-3
                                text-[9px]
                                text-[var(--archive-muted)]/30
                              "
                            >
                              {message.length}/2000
                            </span>
                          </div>

                          {/* OPTIONS */}

                          <div
                            className="
                              mt-5
                              flex
                              flex-col
                              gap-5
                              sm:flex-row
                              sm:items-end
                              sm:justify-between
                            "
                          >
                            <div>
                              <p
                                className="
                                  mb-2
                                  text-[9px]
                                  uppercase
                                  tracking-[0.15em]
                                  text-[var(--archive-muted)]/40
                                "
                              >
                                Pilih suasana
                              </p>

                              <div className="flex gap-1.5">
                                {EMOJI_OPTIONS.map((option) => (
                                  <button
                                    key={option}
                                    type="button"
                                    onClick={() => setEmoji(option)}
                                    disabled={submitting}
                                    className={`
                                      flex h-8 w-8
                                      items-center justify-center
                                      rounded-full
                                      text-sm
                                      transition-all
                                      duration-300
                                      ${
                                        emoji === option
                                          ? "border border-[var(--archive-pink-soft)]/30 bg-[var(--archive-pink-soft)]/[0.08] shadow-[0_0_15px_rgba(190,100,160,0.12)]"
                                          : "border border-transparent opacity-45 hover:bg-white/[0.025] hover:opacity-100"
                                      }
                                    `}
                                    aria-label={`Pilih emoji ${option}`}
                                  >
                                    {option}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* ANONYMOUS + SEND */}

                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={handleAnonymousChange}
                                disabled={submitting}
                                className="
                                  flex
                                  items-center
                                  gap-2
                                  text-[10px]
                                  text-[var(--archive-muted)]/55
                                  transition-colors
                                  hover:text-[var(--archive-muted)]
                                "
                              >
                                <span
                                  className={`
                                    relative
                                    h-4
                                    w-7
                                    rounded-full
                                    transition-all
                                    ${
                                      isAnonymous
                                        ? "bg-[var(--archive-pink-soft)]/50"
                                        : "bg-white/10"
                                    }
                                  `}
                                >
                                  <span
                                    className={`
                                      absolute
                                      top-0.5
                                      h-3
                                      w-3
                                      rounded-full
                                      bg-white
                                      shadow-sm
                                      transition-all
                                      ${
                                        isAnonymous ? "left-[14px]" : "left-0.5"
                                      }
                                    `}
                                  />
                                </span>
                                Anonim
                              </button>

                              <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="
                                  inline-flex
                                  items-center
                                  justify-center
                                  gap-2
                                  rounded-full
                                  border
                                  border-[var(--archive-pink-soft)]/20
                                  bg-[var(--archive-pink-soft)]/[0.10]
                                  px-5
                                  py-2.5
                                  text-[10px]
                                  font-semibold
                                  text-[var(--archive-pink-soft)]
                                  shadow-[0_0_25px_rgba(190,100,160,0.08)]
                                  transition-all
                                  duration-300
                                  hover:border-[var(--archive-pink-soft)]/35
                                  hover:bg-[var(--archive-pink-soft)]/[0.16]
                                  hover:shadow-[0_0_30px_rgba(190,100,160,0.14)]
                                  active:scale-[0.98]
                                  disabled:cursor-not-allowed
                                  disabled:opacity-50
                                "
                              >
                                {submitting ? (
                                  <>
                                    <span
                                      className="
                                        h-3
                                        w-3
                                        animate-spin
                                        rounded-full
                                        border
                                        border-white/30
                                        border-t-white
                                      "
                                    />
                                    Mengirim...
                                  </>
                                ) : (
                                  <>
                                    Kirim Pesan
                                    <Send size={12} />
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* ERROR */}

                          <AnimatePresence>
                            {error && (
                              <motion.div
                                initial={{
                                  opacity: 0,
                                  height: 0,
                                  y: -5,
                                }}
                                animate={{
                                  opacity: 1,
                                  height: "auto",
                                  y: 0,
                                }}
                                exit={{
                                  opacity: 0,
                                  height: 0,
                                  y: -5,
                                }}
                                className="mt-4 overflow-hidden"
                              >
                                <div
                                  className="
                                    rounded-xl
                                    border
                                    border-red-500/20
                                    bg-red-500/[0.04]
                                    px-4
                                    py-3
                                    text-xs
                                    text-red-400
                                  "
                                >
                                  {error}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.section>
                    </div>
                  </motion.div>
                </div>
              </div>
            </ArchiveContainer>
          </section>

          {/* =====================================================
              WALL
          ====================================================== */}

          <section className="relative pb-8">
            <ArchiveContainer size="wide">
              {/* SECTION HEADER */}

              <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                  <SectionBadge icon={<Sparkles size={11} />}>
                    The Wall
                  </SectionBadge>

                  <h2
                    className="
                      archive-display
                      mt-4
                      text-[clamp(1.8rem,4vw,2.8rem)]
                      leading-tight
                      tracking-[-0.035em]
                      text-[var(--archive-text)]
                    "
                  >
                    Pesan dari orang-orang baik
                  </h2>

                  <p
                    className="
                      mt-2
                      max-w-xl
                      text-xs
                      leading-relaxed
                      text-[var(--archive-muted)]/55
                    "
                  >
                    Setiap pesan adalah bagian kecil dari cerita yang tersimpan
                    di dalam archive.
                  </p>
                </div>

                {messages.length > 0 && (
                  <span
                    className="
                      hidden
                      text-[9px]
                      uppercase
                      tracking-[0.15em]
                      text-[var(--archive-muted)]/30
                      sm:block
                    "
                  >
                    Klik kartu untuk membaca
                  </span>
                )}
              </div>

              {/* =================================================
                  LOADING
              ================================================== */}

              {loading && (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <motion.div
                      key={index}
                      initial={{
                        opacity: 0,
                      }}
                      animate={{
                        opacity: 1,
                      }}
                      transition={{
                        delay: index * 0.05,
                      }}
                      className="
                        min-h-[215px]
                        animate-pulse
                        rounded-[22px]
                        border
                        border-white/[0.06]
                        bg-[#0b0e24]
                      "
                    />
                  ))}
                </div>
              )}

              {/* =================================================
                  EMPTY
              ================================================== */}

              {!loading && messages.length === 0 && (
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
                    min-h-[350px]
                    flex-col
                    items-center
                    justify-center
                    rounded-[22px]
                    border
                    border-white/[0.06]
                    bg-white/[0.015]
                    px-5
                    py-12
                    text-center
                  "
                >
                  <div
                    className="
                      mb-4
                      flex h-14 w-14
                      items-center justify-center
                      rounded-full
                      border
                      border-white/10
                      bg-white/[0.025]
                    "
                  >
                    <Mail
                      size={22}
                      className="text-[var(--archive-gold-soft)]/60"
                    />
                  </div>

                  <h3
                    className="
                      archive-display
                      text-lg
                      text-[var(--archive-text)]
                    "
                  >
                    Wall masih kosong
                  </h3>

                  <p
                    className="
                      mt-1
                      text-sm
                      text-[var(--archive-muted)]/50
                    "
                  >
                    Jadilah orang pertama yang meninggalkan pesan.
                  </p>
                </motion.div>
              )}

              {/* =================================================
                  MESSAGE GRID
              ================================================== */}

              {!loading && messages.length > 0 && (
                <>
                  <div
                    className="
                      grid
                      grid-cols-1
                      gap-4
                      md:grid-cols-2
                      xl:grid-cols-3
                    "
                  >
                    <AnimatePresence mode="popLayout">
                      {visibleMessages.map((wallMessage, index) => {
                        const isMine = Boolean(
                          currentUid && wallMessage.ownerUid === currentUid,
                        );

                        return (
                          <motion.button
                            key={wallMessage.id}
                            type="button"
                            layout
                            initial={{
                              opacity: 0,
                              y: 25,
                            }}
                            animate={{
                              opacity: 1,
                              y: 0,
                            }}
                            exit={{
                              opacity: 0,
                              scale: 0.96,
                            }}
                            transition={{
                              duration: 0.5,
                              delay: Math.min(index * 0.06, 0.3),
                              ease: [0.22, 1, 0.36, 1],
                            }}
                            whileHover={{
                              y: -5,
                            }}
                            whileTap={{
                              scale: 0.985,
                            }}
                            onClick={() => setOpenedMessage(wallMessage)}
                            className={`
                              group
                              relative
                              isolate
                              min-h-[225px]
                              overflow-hidden
                              rounded-[22px]
                              border
                              bg-[#0b0e24]
                              p-5
                              text-left
                              shadow-[0_15px_50px_rgba(0,0,0,0.22)]
                              backdrop-blur-xl
                              transition-all
                              duration-500
                              ${CARD_ACCENTS[index % CARD_ACCENTS.length]}
                              ${
                                isMine
                                  ? "border-[var(--archive-pink-soft)]/25 shadow-[0_20px_60px_rgba(190,100,160,0.10)]"
                                  : "border-white/[0.08]"
                              }
                            `}
                          >
                            {/* CARD BACKGROUND GLOW */}

                            <div
                              className="
                                pointer-events-none
                                absolute
                                -right-14
                                -top-14
                                h-36
                                w-36
                                rounded-full
                                bg-[var(--archive-pink-soft)]/[0.045]
                                blur-[55px]
                                transition-all
                                duration-700
                                group-hover:bg-[var(--archive-pink-soft)]/[0.09]
                              "
                            />

                            <div
                              className="
                                pointer-events-none
                                absolute
                                -bottom-16
                                left-1/3
                                h-32
                                w-32
                                rounded-full
                                bg-[var(--archive-gold)]/[0.025]
                                blur-[55px]
                              "
                            />

                            <div className="relative flex h-full flex-col">
                              {/* TOP */}

                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                  <div
                                    className="
                                      flex h-10 w-10
                                      items-center justify-center
                                      rounded-xl
                                      border
                                      border-white/[0.08]
                                      bg-white/[0.025]
                                      text-[var(--archive-pink-soft)]/75
                                    "
                                  >
                                    <Mail size={16} />
                                  </div>

                                  <div className="min-w-0">
                                    <p
                                      className="
                                        max-w-[130px]
                                        truncate
                                        text-xs
                                        font-semibold
                                        text-[var(--archive-text)]
                                      "
                                    >
                                      {wallMessage.name}
                                    </p>

                                    <p
                                      className="
                                        mt-0.5
                                        text-[9px]
                                        text-[var(--archive-muted)]/40
                                      "
                                    >
                                      {formatDate(wallMessage.createdAt)}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  {isMine && (
                                    <span
                                      className="
                                        rounded-full
                                        border
                                        border-[var(--archive-gold)]/20
                                        bg-[var(--archive-gold)]/[0.06]
                                        px-2
                                        py-1
                                        text-[7px]
                                        font-semibold
                                        uppercase
                                        tracking-[0.12em]
                                        text-[var(--archive-gold-soft)]
                                      "
                                    >
                                      Kamu
                                    </span>
                                  )}

                                  <span className="text-lg leading-none">
                                    {wallMessage.emoji || "💌"}
                                  </span>
                                </div>
                              </div>

                              {/* MESSAGE */}

                              <div className="mt-6 flex-1">
                                <p
                                  className="
                                    line-clamp-5
                                    text-sm
                                    leading-6
                                    text-[var(--archive-muted)]/75
                                  "
                                >
                                  {wallMessage.message}
                                </p>
                              </div>

                              {/* BOTTOM */}

                              <div
                                className="
                                  mt-5
                                  flex
                                  items-center
                                  justify-between
                                "
                              >
                                <span
                                  className="
                                    text-[8px]
                                    uppercase
                                    tracking-[0.16em]
                                    text-[var(--archive-muted)]/25
                                  "
                                >
                                  Friendship Wall
                                </span>

                                <Heart
                                  size={14}
                                  fill="currentColor"
                                  className="
                                    text-[var(--archive-pink-soft)]/60
                                    transition-transform
                                    duration-300
                                    group-hover:scale-110
                                    group-hover:text-[var(--archive-pink-soft)]
                                  "
                                />
                              </div>
                            </div>

                            {/* BOTTOM SHINE */}

                            <div
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
                          </motion.button>
                        );
                      })}
                    </AnimatePresence>
                  </div>

                  {/* =================================================
                      VIEW ALL
                  ================================================== */}

                  {messages.length > INITIAL_VISIBLE_MESSAGES && (
                    <div className="mt-7 flex justify-center">
                      <button
                        type="button"
                        onClick={() =>
                          setShowAllMessages((previous) => !previous)
                        }
                        className="
                          group
                          inline-flex
                          items-center
                          gap-3
                          rounded-full
                          border
                          border-white/[0.07]
                          bg-white/[0.015]
                          px-5
                          py-2.5
                          text-[9px]
                          text-[var(--archive-muted)]/60
                          transition-all
                          duration-300
                          hover:border-[var(--archive-gold)]/20
                          hover:bg-[var(--archive-gold)]/[0.04]
                          hover:text-[var(--archive-gold-soft)]
                        "
                      >
                        {showAllMessages
                          ? "Tampilkan Lebih Sedikit"
                          : `Lihat Semua Pesan (${messages.length})`}

                        <ArrowRight
                          size={12}
                          className={`
                            transition-transform
                            ${
                              showAllMessages
                                ? "rotate-[-90deg]"
                                : "group-hover:translate-x-1"
                            }
                          `}
                        />
                      </button>
                    </div>
                  )}

                  {/* BOTTOM DECORATION */}

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
                      {messages.length} Pesan
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
                </>
              )}

              {/* =================================================
                  NAVIGATION
              ================================================== */}

              {!loading && messages.length > 0 && (
                <div className="mt-8">
                  <JourneyNavigation />
                </div>
              )}
            </ArchiveContainer>
          </section>
        </main>

        {/* =======================================================
            MESSAGE MODAL
        ======================================================== */}

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
              className="
                fixed
                inset-0
                z-50
                flex
                items-center
                justify-center
                bg-[#02040F]/75
                px-4
                py-6
                backdrop-blur-md
              "
              onClick={() => setOpenedMessage(null)}
            >
              <motion.div
                initial={{
                  opacity: 0,
                  scale: 0.94,
                  y: 20,
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
                transition={{
                  duration: 0.25,
                }}
                onClick={(event) => event.stopPropagation()}
                className="
                  relative
                  max-h-[90vh]
                  w-full
                  max-w-md
                  overflow-y-auto
                  rounded-[22px]
                  border
                  border-white/[0.10]
                  bg-[#0b0e24]/95
                  p-7
                  shadow-[0_0_80px_rgba(190,100,160,0.12)]
                  backdrop-blur-xl
                "
              >
                {/* MODAL GLOW */}

                <div
                  className="
                    pointer-events-none
                    absolute
                    -right-20
                    -top-20
                    h-48
                    w-48
                    rounded-full
                    bg-[var(--archive-pink-soft)]/[0.07]
                    blur-[70px]
                  "
                />

                {/* CLOSE */}

                <button
                  type="button"
                  onClick={() => setOpenedMessage(null)}
                  className="
                    absolute
                    right-4
                    top-4
                    flex h-9 w-9
                    items-center
                    justify-center
                    rounded-full
                    border
                    border-white/[0.08]
                    bg-white/[0.025]
                    text-[var(--archive-muted)]/60
                    transition-all
                    hover:border-[var(--archive-pink-soft)]/20
                    hover:bg-[var(--archive-pink-soft)]/[0.06]
                    hover:text-[var(--archive-pink-soft)]
                  "
                  aria-label="Tutup pesan"
                >
                  <X size={15} />
                </button>

                <div className="relative">
                  {/* EMOJI */}

                  <div
                    className="
                      flex h-12 w-12
                      items-center justify-center
                      rounded-xl
                      border
                      border-white/[0.08]
                      bg-white/[0.025]
                      text-2xl
                    "
                  >
                    {openedMessage.emoji || "💌"}
                  </div>

                  <p
                    className="
                      mt-6
                      text-[8px]
                      font-semibold
                      uppercase
                      tracking-[0.2em]
                      text-[var(--archive-gold-soft)]/55
                    "
                  >
                    Friendship Wall
                  </p>

                  <h3
                    className="
                      archive-display
                      mt-2
                      text-2xl
                      text-[var(--archive-text)]
                    "
                  >
                    {openedMessage.name}
                  </h3>

                  <p
                    className="
                      mt-1
                      text-[10px]
                      text-[var(--archive-muted)]/40
                    "
                  >
                    {formatDate(openedMessage.createdAt)}
                  </p>

                  <div
                    className="
                      my-6
                      h-px
                      bg-gradient-to-r
                      from-[var(--archive-gold)]/20
                      via-white/[0.06]
                      to-transparent
                    "
                  />

                  <p
                    className="
                      whitespace-pre-wrap
                      break-words
                      text-sm
                      leading-7
                      text-[var(--archive-muted)]/80
                    "
                  >
                    {openedMessage.message}
                  </p>

                  <div className="mt-7 flex items-center justify-end">
                    <Heart
                      size={16}
                      fill="currentColor"
                      className="text-[var(--archive-pink-soft)]/70"
                    />
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </ArchiveShell>
    </MotionConfig>
  );
}
