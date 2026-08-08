"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

interface GalleryItem {
  id: string;
  date: string;
  title: string;
  story: string;
  imageUrl: string;
  publicId?: string;
  createdAt: Timestamp | null;
}

interface UploadSignatureResponse {
  timestamp: number;
  signature: string;
  cloudName: string;
  apiKey: string;
  folder: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

export default function ManageGalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState("");
  const [title, setTitle] = useState("");
  const [story, setStory] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const galleryQuery = query(
      collection(db, "gallery"),
      orderBy("date", "asc"),
    );

    const unsubscribe = onSnapshot(
      galleryQuery,
      (snapshot) => {
        setItems(
          snapshot.docs.map((snapshotDoc) => ({
            id: snapshotDoc.id,
            ...snapshotDoc.data(),
          })) as GalleryItem[],
        );

        setLoading(false);
      },
      () => {
        setError("Gagal memuat data Memory Gallery.");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function resetMessages() {
    setError(null);
    setSuccessMessage(null);
  }

  function handleFileChange(selected: File | null) {
    resetMessages();

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    if (!selected) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(selected.type)) {
      setFile(null);
      setPreviewUrl(null);

      setError("Format foto harus JPG, PNG, WEBP, HEIC, atau HEIF.");

      return;
    }

    if (selected.size > MAX_FILE_SIZE) {
      setFile(null);
      setPreviewUrl(null);
      setError("Ukuran foto maksimal 10 MB.");

      return;
    }

    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  async function getGalleryUploadSignature(): Promise<UploadSignatureResponse> {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error("Sesi admin tidak ditemukan. Silakan login ulang.");
    }

    const idToken = await currentUser.getIdToken();

    const response = await fetch(
      "/api/upload-signature?folder=the-archive/gallery",
      {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;

      throw new Error(data?.message || "Gagal mengambil signature upload.");
    }

    return (await response.json()) as UploadSignatureResponse;
  }

  async function handleAddMemory() {
    resetMessages();

    if (!date.trim() || !title.trim() || !story.trim() || !file) {
      setError("Semua field wajib diisi, termasuk foto.");

      return;
    }

    setUploading(true);

    try {
      const { timestamp, signature, cloudName, apiKey, folder } =
        await getGalleryUploadSignature();

      const formData = new FormData();

      formData.append("file", file);
      formData.append("api_key", apiKey);
      formData.append("timestamp", timestamp.toString());
      formData.append("signature", signature);

      // Gunakan folder dari server.
      // Jangan hardcode folder berbeda dari signature.
      formData.append("folder", folder);

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!uploadResponse.ok) {
        throw new Error("Cloudinary gagal mengunggah foto.");
      }

      const uploadData = (await uploadResponse.json()) as {
        secure_url?: string;
        public_id?: string;
      };

      if (!uploadData.secure_url || !uploadData.public_id) {
        throw new Error("Respons upload Cloudinary tidak lengkap.");
      }

      await addDoc(collection(db, "gallery"), {
        date: date.trim(),
        title: title.trim(),
        story: story.trim(),
        imageUrl: uploadData.secure_url,
        publicId: uploadData.public_id,
        createdAt: serverTimestamp(),
      });

      setDate("");
      setTitle("");
      setStory("");

      handleFileChange(null);

      setSuccessMessage("Kenangan berhasil ditambahkan.");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Gagal menyimpan kenangan. Silakan coba lagi.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function deleteCloudinaryAsset(publicId: string) {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error("Sesi admin tidak ditemukan. Silakan login ulang.");
    }

    const idToken = await currentUser.getIdToken();

    const response = await fetch("/api/cloudinary/delete", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        publicId,
      }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;

      throw new Error(data?.message || "Gagal menghapus media Cloudinary.");
    }
  }

  async function handleDelete(item: GalleryItem) {
    const confirmed = window.confirm(
      `Hapus kenangan “${item.title}”? Foto juga akan dihapus dari Cloudinary.`,
    );

    if (!confirmed) return;

    resetMessages();
    setDeletingId(item.id);

    try {
      if (item.publicId) {
        await deleteCloudinaryAsset(item.publicId);
      }

      await deleteDoc(doc(db, "gallery", item.id));

      setSuccessMessage("Kenangan berhasil dihapus.");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Gagal menghapus kenangan.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F1FA] to-[#EDE4FA] p-4 pt-20 sm:p-6 sm:pt-20 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 sm:mb-10">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#6D4FC2]/55">
            Content Management
          </p>

          <h1 className="text-2xl font-bold text-[#3B2E52] sm:text-3xl">
            Kelola Memory Gallery
          </h1>

          <p className="mt-2 text-sm text-[#6D4FC2]/60">
            {loading
              ? "Memuat kenangan..."
              : `${items.length} kenangan tersimpan`}
          </p>
        </header>

        {(error || successMessage) && (
          <div
            className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
              error
                ? "border-red-200 bg-red-50 text-red-600"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {error || successMessage}
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-8">
          <section className="space-y-4 rounded-2xl border border-[#D8C8F0]/35 bg-white/75 p-5 shadow-sm backdrop-blur-sm sm:p-6 lg:sticky lg:top-8">
            <div>
              <h2 className="font-semibold text-[#3B2E52]">
                Tambah Kenangan Baru
              </h2>

              <p className="mt-1 text-xs leading-5 text-[#3B2E52]/50">
                Tambahkan foto, tanggal, judul, dan cerita singkat untuk
                timeline.
              </p>
            </div>

            <label className="block cursor-pointer">
              <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-[#D8C8F0] bg-[#E9D8FD]/55 transition hover:border-[#A78BFA]">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="Preview foto kenangan"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="px-4 text-center text-[#6D4FC2]/60">
                    <p className="mb-2 text-3xl">📷</p>

                    <p className="text-xs font-medium">Pilih foto kenangan</p>

                    <p className="mt-1 text-[11px] text-[#3B2E52]/40">
                      JPG, PNG, WEBP, HEIC · maks. 10 MB
                    </p>
                  </div>
                )}
              </div>

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                onChange={(event) =>
                  handleFileChange(event.target.files?.[0] ?? null)
                }
                className="hidden"
              />
            </label>

            <div className="space-y-2">
              <label
                htmlFor="memory-date"
                className="text-xs font-medium text-[#3B2E52]/70"
              >
                Tahun / tanggal
              </label>

              <input
                id="memory-date"
                type="text"
                placeholder="Contoh: 2022"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="w-full rounded-xl border border-[#D8C8F0] bg-white px-4 py-3 text-sm text-[#3B2E52] outline-none transition placeholder:text-[#3B2E52]/30 focus:border-[#A78BFA] focus:ring-2 focus:ring-[#A78BFA]/20"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="memory-title"
                className="text-xs font-medium text-[#3B2E52]/70"
              >
                Judul momen
              </label>

              <input
                id="memory-title"
                type="text"
                placeholder="Contoh: Awal Bertemu"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-xl border border-[#D8C8F0] bg-white px-4 py-3 text-sm text-[#3B2E52] outline-none transition placeholder:text-[#3B2E52]/30 focus:border-[#A78BFA] focus:ring-2 focus:ring-[#A78BFA]/20"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="memory-story"
                className="text-xs font-medium text-[#3B2E52]/70"
              >
                Cerita singkat
              </label>

              <textarea
                id="memory-story"
                placeholder="Ceritakan kenangan ini..."
                value={story}
                onChange={(event) => setStory(event.target.value)}
                rows={4}
                className="w-full resize-none rounded-xl border border-[#D8C8F0] bg-white px-4 py-3 text-sm text-[#3B2E52] outline-none transition placeholder:text-[#3B2E52]/30 focus:border-[#A78BFA] focus:ring-2 focus:ring-[#A78BFA]/20"
              />
            </div>

            <button
              type="button"
              onClick={handleAddMemory}
              disabled={uploading}
              className="w-full rounded-xl bg-[#A78BFA] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#6D4FC2] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? "Menyimpan..." : "Tambah Kenangan"}
            </button>
          </section>

          <section className="min-w-0">
            {loading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({
                  length: 6,
                }).map((_, index) => (
                  <div
                    key={index}
                    className="animate-pulse overflow-hidden rounded-2xl border border-[#D8C8F0]/35 bg-white/60"
                  >
                    <div className="aspect-[4/3] bg-[#E9D8FD]/70" />

                    <div className="space-y-3 p-4">
                      <div className="h-3 w-20 rounded bg-[#E9D8FD]" />
                      <div className="h-4 w-2/3 rounded bg-[#E9D8FD]" />
                      <div className="h-3 w-full rounded bg-[#E9D8FD]/70" />
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-[#D8C8F0] bg-white/30 px-6 py-16 text-center">
                <p className="text-3xl">🗂️</p>

                <p className="mt-3 text-sm font-medium text-[#3B2E52]">
                  Belum ada kenangan
                </p>

                <p className="mt-1 text-xs text-[#3B2E52]/50">
                  Tambahkan memory pertama melalui form di samping.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => (
                  <article
                    key={item.id}
                    className="group overflow-hidden rounded-2xl border border-[#D8C8F0]/35 bg-white/75 shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-[#E9D8FD]/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        loading="lazy"
                      />

                      <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-[#6D4FC2] shadow-sm backdrop-blur-sm">
                        {item.date}
                      </span>
                    </div>

                    <div className="p-4">
                      <h3 className="text-sm font-semibold text-[#3B2E52]">
                        {item.title}
                      </h3>

                      <p className="mt-1 line-clamp-3 text-xs leading-5 text-[#3B2E52]/60">
                        {item.story}
                      </p>

                      <div className="mt-4 flex items-center justify-between border-t border-[#D8C8F0]/30 pt-3">
                        <span className="text-[11px] text-[#3B2E52]/35">
                          {item.publicId ? "Cloudinary synced" : "Legacy media"}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          disabled={deletingId === item.id}
                          className="text-xs font-medium text-red-400 transition hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {deletingId === item.id ? "Menghapus..." : "Hapus"}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
