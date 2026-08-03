"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc,
  Timestamp,
} from "firebase/firestore";

interface PhotoboothItem {
  id: string;
  url: string;
  publicId: string;
  template: string;
  createdAt: Timestamp | null;
}

export default function MonitoringPhotoPage() {
  const [items, setItems] = useState<PhotoboothItem[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "photobooth"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(
        snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as PhotoboothItem[],
      );
    });
    return () => unsubscribe();
  }, []);

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Yakin mau hapus hasil foto ini?");
    if (!confirmed) return;
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, "photobooth", id));
    } catch {
      alert("Gagal menghapus");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDownload(url: string, id: string) {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `photobooth-${id}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#3B2E52]">
          Monitoring Photobooth ({items.length})
        </h1>
        <p className="text-sm text-[#6D4FC2]/60 mt-1">
          Kelola semua hasil foto photobooth
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
        {items.map((item) => (
          <div key={item.id} className="bg-white/60 rounded-xl p-3 shadow-sm">
            <img
              src={item.url}
              alt={item.template}
              className="w-full rounded-lg mb-2"
            />
            <p className="text-xs text-[#3B2E52]/60 mb-2 capitalize">
              {item.template}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleDownload(item.url, item.id)}
                className="flex-1 text-xs bg-[#A78BFA] text-white py-2 rounded-lg hover:bg-[#6D4FC2] transition"
              >
                Download
              </button>
              <button
                onClick={() => handleDelete(item.id)}
                disabled={deletingId === item.id}
                className="flex-1 text-xs border border-red-300 text-red-500 py-2 rounded-lg hover:bg-red-50 transition disabled:opacity-40"
              >
                {deletingId === item.id ? "..." : "Hapus"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <p className="text-center text-[#3B2E52]/50 text-sm mt-8">
          Belum ada hasil photobooth.
        </p>
      )}
    </div>
  );
}
