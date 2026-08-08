"use client";

import { useEffect, useState } from "react";

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

interface PhotoboothItem {
  id: string;
  url: string;
  publicId?: string;
  template: string;
  createdAt: Timestamp | null;
}

export default function MonitoringPhotoPage() {
  const [items, setItems] = useState<PhotoboothItem[]>([]);

  const [loading, setLoading] = useState(true);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const photosQuery = query(
      collection(db, "photobooth"),

      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      photosQuery,

      (snapshot) => {
        setItems(
          snapshot.docs.map((snapshotDoc) => ({
            id: snapshotDoc.id,

            ...snapshotDoc.data(),
          })) as PhotoboothItem[],
        );

        setLoading(false);
      },

      (snapshotError) => {
        console.error("Monitoring photobooth error:", snapshotError);

        setError("Gagal memuat hasil Photobooth.");

        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  async function handleRemoveFromMonitoring(item: PhotoboothItem) {
    const confirmed = window.confirm(
      `Hapus hasil foto ini dari Monitoring Photobooth?

File asli tetap tersimpan di Private Photo Archive.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(item.id);

    setError(null);

    try {
      /**
       * HANYA Firestore.
       *
       * Cloudinary tetap disimpan.
       */
      await deleteDoc(doc(db, "photobooth", item.id));
    } catch (deleteError) {
      console.error("Remove monitoring photo error:", deleteError);

      setError("Gagal menghapus foto dari Monitoring Photobooth.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDownload(url: string, id: string) {
    try {
      const response = await fetch(url);

      const blob = await response.blob();

      const blobUrl = URL.createObjectURL(blob);

      const anchor = document.createElement("a");

      anchor.href = blobUrl;

      anchor.download = `photobooth-${id}.jpg`;

      document.body.appendChild(anchor);

      anchor.click();

      document.body.removeChild(anchor);

      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="p-4 pt-20 sm:p-6 sm:pt-20 lg:p-8">
      <div className="mb-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#6D4FC2]/55">
          Active Photobooth
        </p>

        <h1 className="text-2xl font-bold text-[#3B2E52] sm:text-3xl">
          Monitoring Photobooth
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6D4FC2]/60">
          Halaman ini hanya menampilkan foto yang masih aktif. Jika user atau
          admin menghapus foto dari sini, file aslinya tetap tersimpan di
          Private Photo Archive.
        </p>
      </div>

      <div className="mb-6 rounded-xl border border-[#D8C8F0]/50 bg-white/55 px-4 py-3 text-xs leading-5 text-[#3B2E52]/60">
        <span className="font-semibold text-[#3B2E52]">Catatan:</span> tombol
        Hapus dari Monitoring tidak menghapus file Cloudinary secara permanen.
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({
            length: 8,
          }).map((_, index) => (
            <div
              key={index}
              className="animate-pulse rounded-2xl border border-[#D8C8F0]/40 bg-white/60 p-3"
            >
              <div className="aspect-[2/5] rounded-xl bg-[#E9D8FD]/70" />

              <div className="mt-3 h-3 w-20 rounded bg-[#E9D8FD]" />

              <div className="mt-3 h-9 rounded-lg bg-[#E9D8FD]/70" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[#D8C8F0] bg-white/35 px-6 py-16 text-center">
          <p className="text-3xl">📸</p>

          <p className="mt-3 text-sm font-medium text-[#3B2E52]">
            Tidak ada foto aktif
          </p>

          <p className="mt-1 text-xs text-[#3B2E52]/50">
            Foto lama masih dapat dilihat melalui Private Photo Archive.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-2xl border border-[#D8C8F0]/35 bg-white/70 p-3 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt={`Photobooth template ${item.template}`}
                className="w-full rounded-xl bg-[#F5F1FA] object-cover"
                loading="lazy"
              />

              <div className="px-1 pb-1 pt-3">
                <p className="mb-3 text-xs capitalize text-[#3B2E52]/60">
                  Template: {item.template || "-"}
                </p>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => handleDownload(item.url, item.id)}
                    className="rounded-lg bg-[#A78BFA] px-3 py-2.5 text-xs font-medium text-white transition hover:bg-[#6D4FC2]"
                  >
                    Download
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemoveFromMonitoring(item)}
                    disabled={deletingId === item.id}
                    className="rounded-lg border border-red-200 px-3 py-2.5 text-xs font-medium text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingId === item.id ? "Menghapus..." : "Hapus"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
