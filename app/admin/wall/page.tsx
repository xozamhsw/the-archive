"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  deleteDoc,
  doc,
} from "firebase/firestore";

interface WallMessage {
  id: string;
  name: string;
  message: string;
  emoji: string;
  rating: number;
  createdAt: Timestamp | null;
}

export default function AdminWallPage() {
  const [messages, setMessages] = useState<WallMessage[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Yakin mau hapus pesan ini?");
    if (!confirmed) return;

    setDeletingId(id);
    try {
      await deleteDoc(doc(db, "wall", id));
    } catch {
      alert("Gagal menghapus pesan, coba lagi");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#3B2E52]">
          Wall Messages ({messages.length})
        </h1>
        <p className="text-sm text-[#6D4FC2]/60 mt-1">
          Kelola semua pesan di friendship wall
        </p>
      </div>

      <div className="space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="bg-white/60 rounded-xl p-4 shadow-sm flex gap-4 items-start"
          >
            <span className="text-2xl">{msg.emoji}</span>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-[#3B2E52]">{msg.name}</p>
                <div className="flex items-center gap-1">
                  {Array.from({ length: msg.rating }).map((_, i) => (
                    <span key={i} className="text-yellow-400 text-sm">
                      ★
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-[#3B2E52]/70 text-sm mt-1">{msg.message}</p>
              {msg.createdAt && (
                <p className="text-xs text-[#3B2E52]/40 mt-2">
                  {msg.createdAt.toDate().toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>
            <button
              onClick={() => handleDelete(msg.id)}
              disabled={deletingId === msg.id}
              className="text-red-400 hover:text-red-600 text-sm disabled:opacity-40"
            >
              {deletingId === msg.id ? "..." : "Hapus"}
            </button>
          </div>
        ))}
      </div>

      {messages.length === 0 && (
        <p className="text-center text-[#3B2E52]/50 text-sm mt-8">
          Belum ada pesan masuk.
        </p>
      )}
    </div>
  );
}
