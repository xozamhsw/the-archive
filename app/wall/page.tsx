"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";

interface WallMessage {
  id: string;
  name: string;
  message: string;
  emoji: string;
  rating: number;
  createdAt: Timestamp | null;
}

const EMOJI_OPTIONS = ["❤️", "🎉", "🥹", "😂", "🌸", "✨"];
const STORAGE_KEY = "the-archive-my-messages";

export default function WallPage() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [emoji, setEmoji] = useState(EMOJI_OPTIONS[0]);
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [messages, setMessages] = useState<WallMessage[]>([]);
  const [myMessageIds, setMyMessageIds] = useState<string[]>([]);
  const [openedId, setOpenedId] = useState<string | null>(null);

  // Load id pesan milik sendiri dari localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMyMessageIds(JSON.parse(stored) as string[]);
    }
  }, []);

  // Listen realtime ke Firestore
  useEffect(() => {
    const q = query(collection(db, "wall"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as WallMessage[];
      setMessages(data);
    });

    return () => unsubscribe();
  }, []);

  async function handleSubmit() {
    if (!name.trim() || !message.trim()) {
      setError("Nama dan pesan tidak boleh kosong");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const docRef = await addDoc(collection(db, "wall"), {
        name: name.trim(),
        message: message.trim(),
        emoji,
        rating,
        createdAt: serverTimestamp(),
      });

      const updatedIds = [...myMessageIds, docRef.id];
      setMyMessageIds(updatedIds);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedIds));

      setName("");
      setMessage("");
      setRating(5);
    } catch {
      setError("Gagal mengirim pesan, coba lagi");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F5F1FA] px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-[#6D4FC2]/60 text-sm tracking-widest mb-2">
            FRIENDSHIP WALL
          </p>
          <h1 className="text-3xl font-bold text-[#3B2E52]">
            Tinggalkan Pesan untuk Aulia
          </h1>
        </div>

        {/* Form */}
        <div className="bg-white/60 rounded-2xl p-6 mb-12 shadow-sm space-y-4">
          <input
            type="text"
            placeholder="Nama kamu"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-[#D8C8F0] bg-white focus:outline-none focus:ring-2 focus:ring-[#A78BFA] text-[#3B2E52]"
          />

          <textarea
            placeholder="Tulis pesan untuk Aulia..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-[#D8C8F0] bg-white focus:outline-none focus:ring-2 focus:ring-[#A78BFA] text-[#3B2E52] resize-none"
          />

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex gap-2">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`text-2xl p-1.5 rounded-full transition ${
                    emoji === e ? "bg-[#E9D8FD] scale-110" : "opacity-50"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-[#A78BFA] text-white py-3 rounded-xl font-medium hover:bg-[#6D4FC2] transition disabled:opacity-50"
          >
            {submitting ? "Mengirim..." : "Kirim Pesan"}
          </button>
        </div>

        {/* Wall of envelopes */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
          {messages.map((msg) => {
            const isMine = myMessageIds.includes(msg.id);
            const isOpen = openedId === msg.id;

            return (
              <motion.div
                key={msg.id}
                layout
                whileHover={isMine ? { scale: 1.05 } : {}}
                onClick={() => isMine && setOpenedId(isOpen ? null : msg.id)}
                className={`aspect-[4/3] rounded-xl flex items-center justify-center text-3xl relative ${
                  isMine
                    ? "bg-[#E9D8FD] cursor-pointer border-2 border-[#A78BFA]"
                    : "bg-[#D8C8F0]/60 cursor-default"
                }`}
              >
                {!isOpen && "✉️"}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="absolute inset-0 bg-white rounded-xl p-3 flex flex-col justify-center text-center shadow-lg"
                    >
                      <p className="text-xl mb-1">{msg.emoji}</p>
                      <p className="text-xs font-semibold text-[#3B2E52] mb-1">
                        {msg.name}
                      </p>
                      <p className="text-[11px] text-[#3B2E52]/70 line-clamp-3">
                        {msg.message}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {messages.length === 0 && (
          <p className="text-center text-[#3B2E52]/50 text-sm mt-8">
            Belum ada pesan — jadilah yang pertama!
          </p>
        )}

        <div className="text-center mt-16">
          <Link
            href="/capsule"
            className="inline-block bg-[#A78BFA] text-white px-8 py-3 rounded-full font-medium hover:bg-[#6D4FC2] transition"
          >
            Lanjut ke Time Capsule
          </Link>
        </div>
      </div>
    </main>
  );
}
