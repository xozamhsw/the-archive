"use client";

import { useEffect, useMemo, useState } from "react";
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
  updateDoc,
  writeBatch,
} from "firebase/firestore";

import {
  Check,
  Crown,
  ImagePlus,
  MapPin,
  Search,
  Star,
  Trash2,
  Upload,
  X,
  Sparkles,
  Archive,
  Camera,
  Images,
} from "lucide-react";

interface GalleryItem {
  id: string;
  date: string;
  title: string;
  story: string;
  imageUrl: string;
  publicId?: string;
  location?: string;
  featured?: boolean;
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
  /* =========================================
     GALLERY DATA
  ========================================== */

  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  /* =========================================
     FORM STATE
  ========================================== */

  const [date, setDate] = useState("");
  const [title, setTitle] = useState("");
  const [story, setStory] = useState("");
  const [location, setLocation] = useState("");
  const [featured, setFeatured] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  /* =========================================
     UI STATE
  ========================================== */

  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [settingFeaturedId, setSettingFeaturedId] = useState<string | null>(
    null,
  );

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");

  /* =========================================
     FIREBASE LISTENER
  ========================================== */

  useEffect(() => {
    const galleryQuery = query(
      collection(db, "gallery"),
      orderBy("date", "asc"),
    );

    const unsubscribe = onSnapshot(
      galleryQuery,
      (snapshot) => {
        const galleryItems = snapshot.docs.map((snapshotDoc) => ({
          id: snapshotDoc.id,
          ...snapshotDoc.data(),
        })) as GalleryItem[];

        setItems(galleryItems);
        setLoading(false);
      },
      (snapshotError) => {
        console.error("Gallery snapshot error:", snapshotError);

        setError("Gagal memuat data Memory Gallery.");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  /* =========================================
     CLEANUP PREVIEW URL
  ========================================== */

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  /* =========================================
     HELPERS
  ========================================== */

  function resetMessages() {
    setError(null);
    setSuccessMessage(null);
  }

  function resetForm() {
    setDate("");
    setTitle("");
    setStory("");
    setLocation("");
    setFeatured(false);
    setFile(null);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(null);
  }

  /* =========================================
     FILE HANDLER
  ========================================== */

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

  /* =========================================
     CLOUDINARY SIGNATURE
  ========================================== */

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

  /* =========================================
     ADD MEMORY
  ========================================== */

  async function handleAddMemory() {
    resetMessages();

    if (!date.trim() || !title.trim() || !story.trim() || !file) {
      setError("Tanggal, judul, cerita, dan foto wajib diisi.");
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

      const galleryCollection = collection(db, "gallery");
      const newMemoryRef = doc(galleryCollection);

      const batch = writeBatch(db);

      if (featured) {
        items.forEach((item) => {
          if (item.featured) {
            batch.update(doc(db, "gallery", item.id), {
              featured: false,
            });
          }
        });
      }

      batch.set(newMemoryRef, {
        date: date.trim(),
        title: title.trim(),
        story: story.trim(),
        location: location.trim() || "",
        imageUrl: uploadData.secure_url,
        publicId: uploadData.public_id,
        featured,
        createdAt: serverTimestamp(),
      });

      await batch.commit();

      resetForm();

      setSuccessMessage(
        featured
          ? "Kenangan berhasil ditambahkan dan dijadikan Featured."
          : "Kenangan berhasil ditambahkan.",
      );
    } catch (uploadError) {
      console.error("Add gallery error:", uploadError);

      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Gagal menyimpan kenangan. Silakan coba lagi.",
      );
    } finally {
      setUploading(false);
    }
  }

  /* =========================================
     DELETE CLOUDINARY
  ========================================== */

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

  /* =========================================
     DELETE MEMORY
  ========================================== */

  async function handleDelete(item: GalleryItem) {
    const confirmed = window.confirm(
      `Hapus kenangan "${item.title}"?\n\nFoto juga akan dihapus dari Cloudinary.`,
    );

    if (!confirmed) {
      return;
    }

    resetMessages();
    setDeletingId(item.id);

    try {
      if (item.publicId) {
        await deleteCloudinaryAsset(item.publicId);
      }

      await deleteDoc(doc(db, "gallery", item.id));

      setSuccessMessage("Kenangan berhasil dihapus.");
    } catch (deleteError) {
      console.error("Delete gallery error:", deleteError);

      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Gagal menghapus kenangan.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  /* =========================================
     SET FEATURED
  ========================================== */

  async function handleSetFeatured(item: GalleryItem) {
    resetMessages();

    if (item.featured) {
      return;
    }

    setSettingFeaturedId(item.id);

    try {
      const batch = writeBatch(db);

      items.forEach((galleryItem) => {
        if (galleryItem.featured && galleryItem.id !== item.id) {
          batch.update(doc(db, "gallery", galleryItem.id), {
            featured: false,
          });
        }
      });

      batch.update(doc(db, "gallery", item.id), {
        featured: true,
      });

      await batch.commit();

      setSuccessMessage(`"${item.title}" sekarang menjadi Featured Memory.`);
    } catch (featuredError) {
      console.error("Set featured error:", featuredError);

      setError(
        featuredError instanceof Error
          ? featuredError.message
          : "Gagal mengubah Featured Memory.",
      );
    } finally {
      setSettingFeaturedId(null);
    }
  }

  /* =========================================
     FILTER SEARCH
  ========================================== */

  const filteredItems = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    if (!keyword) {
      return items;
    }

    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(keyword) ||
        item.story.toLowerCase().includes(keyword) ||
        item.date.toLowerCase().includes(keyword) ||
        item.location?.toLowerCase().includes(keyword),
    );
  }, [items, searchQuery]);

  const featuredItem = items.find((item) => item.featured);

  /* =========================================
     RENDER
  ========================================== */

  return (
    <div className="min-h-screen bg-[#08091F] px-4 pb-16 pt-8 text-white sm:px-6 lg:px-8">
      {/* Background atmosphere */}
      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
        <div className="absolute left-[18%] top-[8%] h-72 w-72 rounded-full bg-[#8B5CF6]/5 blur-[120px]" />
        <div className="absolute right-[10%] top-[35%] h-80 w-80 rounded-full bg-[#EC4899]/5 blur-[140px]" />
        <div className="absolute bottom-[5%] left-[40%] h-72 w-72 rounded-full bg-[#6366F1]/5 blur-[130px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1450px]">
        {/* =====================================
            HEADER
        ====================================== */}

        <header className="mb-8">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#D8B4FE]/65">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-[#C084FC]/20 bg-[#C084FC]/10 text-[#D8B4FE]">
                  <Archive size={12} />
                </span>
                The Archive · Content Management
              </div>

              <h1 className="font-serif text-4xl leading-[0.95] tracking-tight text-white sm:text-5xl lg:text-[56px]">
                Manage
                <br />
                <span className="text-[#F3A9C7]">Memory Gallery</span>
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-6 text-white/35">
                Kelola seluruh kenangan yang tersimpan di The Archive. Tambahkan
                cerita, foto, lokasi, dan tentukan Featured Memory yang akan
                menjadi bagian utama Gallery.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <ArchiveStat
                icon={<Images size={14} />}
                label="Total Memory"
                value={items.length}
              />

              <ArchiveStat
                icon={<Star size={14} />}
                label="Featured"
                value={featuredItem ? 1 : 0}
                accent
              />

              <div className="col-span-2 sm:col-span-1">
                <ArchiveStat
                  icon={<Camera size={14} />}
                  label="Cloud Media"
                  value={items.filter((item) => Boolean(item.publicId)).length}
                />
              </div>
            </div>
          </div>
        </header>

        {/* =====================================
            INFO / MESSAGE
        ====================================== */}

        {error || successMessage ? (
          <div
            className={`
              mb-6
              flex
              items-start
              justify-between
              gap-4
              rounded-2xl
              border
              px-4
              py-3.5
              text-xs
              backdrop-blur-xl
              ${
                error
                  ? "border-red-400/15 bg-red-500/5 text-red-300"
                  : "border-emerald-400/15 bg-emerald-500/5 text-emerald-300"
              }
            `}
          >
            <div className="flex items-center gap-2">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  error ? "bg-red-400" : "bg-emerald-400"
                }`}
              />

              <p>{error || successMessage}</p>
            </div>

            <button
              type="button"
              onClick={resetMessages}
              className="shrink-0 text-white/30 transition hover:text-white"
            >
              <X size={15} />
            </button>
          </div>
        ) : (
          <div className="mb-7 flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#F3A9C7]/10 bg-[#F3A9C7]/5 text-[#F3A9C7]">
              <Sparkles size={14} />
            </span>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">
                Archive Collection
              </p>

              <p className="mt-0.5 text-[10px] text-white/25">
                Semua memory yang ditambahkan di sini akan tampil pada halaman
                Memory Gallery.
              </p>
            </div>
          </div>
        )}

        {/* =====================================
            MAIN LAYOUT
        ====================================== */}

        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[350px_minmax(0,1fr)]">
          {/* ===================================
              ADD MEMORY FORM
          ==================================== */}

          <section className="rounded-[28px] border border-white/[0.07] bg-[#0D0E28]/80 p-5 shadow-[0_25px_80px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:p-6 xl:sticky xl:top-6">
            {/* Form header */}
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#F3A9C7]/15 bg-[#F3A9C7]/5 text-[#F3A9C7]">
                  <ImagePlus size={15} />
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#F3A9C7]/65">
                    New Entry
                  </p>

                  <h2 className="mt-0.5 text-sm font-semibold text-white/90">
                    Tambah Kenangan
                  </h2>
                </div>
              </div>

              <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-2 py-1 text-[8px] uppercase tracking-[0.12em] text-white/25">
                Archive
              </span>
            </div>

            {/* Upload */}
            <label className="block cursor-pointer">
              <div className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-dashed border-white/[0.12] bg-[#08091F] transition hover:border-[#F3A9C7]/35">
                {previewUrl ? (
                  <>
                    <img
                      src={previewUrl}
                      alt="Preview foto kenangan"
                      className="h-full w-full object-cover"
                    />

                    <div className="absolute inset-0 flex items-center justify-center bg-[#08091F]/60 opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
                      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-[10px] font-medium text-white backdrop-blur-xl">
                        <Upload size={12} />
                        Ganti foto
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center px-5 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[#F3A9C7]/15 bg-[#F3A9C7]/5 text-[#F3A9C7]">
                      <Upload size={18} />
                    </div>

                    <p className="text-xs font-semibold text-white/75">
                      Pilih foto kenangan
                    </p>

                    <p className="mt-1 text-[10px] text-white/25">
                      JPG · PNG · WEBP · HEIC
                    </p>

                    <p className="mt-0.5 text-[9px] text-white/15">
                      Maksimal 10 MB
                    </p>
                  </div>
                )}
              </div>

              <input
                type="file"
                accept="
                  image/jpeg,
                  image/png,
                  image/webp,
                  image/heic,
                  image/heif
                "
                onChange={(event) =>
                  handleFileChange(event.target.files?.[0] ?? null)
                }
                className="hidden"
              />
            </label>

            {/* Fields */}
            <div className="mt-5 space-y-4">
              <FormField label="Tahun / tanggal" htmlFor="memory-date">
                <input
                  id="memory-date"
                  type="text"
                  placeholder="Contoh: 2022"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className={inputClassName}
                />
              </FormField>

              <FormField label="Judul momen" htmlFor="memory-title">
                <input
                  id="memory-title"
                  type="text"
                  placeholder="Contoh: Awal Bertemu"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className={inputClassName}
                />
              </FormField>

              <FormField label="Lokasi" htmlFor="memory-location">
                <div className="relative">
                  <MapPin
                    size={13}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#F3A9C7]/35"
                  />

                  <input
                    id="memory-location"
                    type="text"
                    placeholder="Contoh: Solo, Jawa Tengah"
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    className={`${inputClassName} pl-9`}
                  />
                </div>
              </FormField>

              <FormField label="Cerita singkat" htmlFor="memory-story">
                <textarea
                  id="memory-story"
                  placeholder="Ceritakan kenangan ini..."
                  value={story}
                  onChange={(event) => setStory(event.target.value)}
                  rows={4}
                  className={`${inputClassName} resize-none`}
                />
              </FormField>

              {/* Featured */}
              <button
                type="button"
                onClick={() => setFeatured((previous) => !previous)}
                className={`
                  flex
                  w-full
                  items-center
                  gap-3
                  rounded-2xl
                  border
                  p-3
                  text-left
                  transition
                  ${
                    featured
                      ? "border-[#F3A9C7]/25 bg-[#F3A9C7]/[0.07]"
                      : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12]"
                  }
                `}
              >
                <div
                  className={`
                    flex
                    h-9
                    w-9
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    ${
                      featured
                        ? "bg-[#F3A9C7] text-[#181329]"
                        : "border border-[#F3A9C7]/10 bg-[#F3A9C7]/5 text-[#F3A9C7]"
                    }
                  `}
                >
                  <Star size={14} className={featured ? "fill-current" : ""} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white/75">
                    Jadikan Featured
                  </p>

                  <p className="mt-0.5 text-[9px] leading-4 text-white/25">
                    Memory ini akan menjadi kartu utama di Gallery.
                  </p>
                </div>

                <div
                  className={`
                    flex
                    h-5
                    w-9
                    shrink-0
                    items-center
                    rounded-full
                    p-0.5
                    transition
                    ${featured ? "bg-[#F3A9C7]" : "bg-white/10"}
                  `}
                >
                  <span
                    className={`
                      h-4
                      w-4
                      rounded-full
                      bg-white
                      shadow-sm
                      transition
                      ${featured ? "translate-x-4" : "translate-x-0"}
                    `}
                  />
                </div>
              </button>

              {/* Submit */}
              <button
                type="button"
                onClick={handleAddMemory}
                disabled={uploading}
                className="
                  flex
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-2xl
                  border
                  border-[#F3A9C7]/20
                  bg-[#F3A9C7]
                  px-4
                  py-3.5
                  text-xs
                  font-semibold
                  text-[#171426]
                  shadow-[0_10px_35px_rgba(243,169,199,0.08)]
                  transition
                  hover:bg-[#F6BDD3]
                  hover:shadow-[0_12px_40px_rgba(243,169,199,0.15)]
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                {uploading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <ImagePlus size={15} />
                    Tambah ke Archive
                  </>
                )}
              </button>
            </div>
          </section>

          {/* ===================================
              GALLERY MANAGEMENT
          ==================================== */}

          <section className="min-w-0">
            {/* Toolbar */}
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-1 flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#F3A9C7]/50">
                  <Images size={11} />
                  Collection
                </div>

                <h2 className="font-serif text-2xl text-white/90">
                  Koleksi Kenangan
                </h2>

                <p className="mt-1 text-[10px] text-white/25">
                  Atur memory yang tampil pada halaman Gallery.
                </p>
              </div>

              {/* Search */}
              <div className="relative w-full lg:w-[280px]">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20"
                />

                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Cari dalam archive..."
                  className="
                    h-10
                    w-full
                    rounded-full
                    border
                    border-white/[0.08]
                    bg-white/[0.025]
                    pl-10
                    pr-4
                    text-xs
                    text-white/80
                    outline-none
                    backdrop-blur-xl
                    transition
                    placeholder:text-white/20
                    focus:border-[#F3A9C7]/30
                    focus:bg-white/[0.04]
                  "
                />
              </div>
            </div>

            {/* Collection line */}
            <div className="mb-5 flex items-center gap-3">
              <span className="text-[9px] uppercase tracking-[0.16em] text-white/20">
                {filteredItems.length} Memories
              </span>

              <div className="h-px flex-1 bg-white/[0.05]" />

              <span className="text-[9px] uppercase tracking-[0.16em] text-[#F3A9C7]/35">
                The Archive
              </span>
            </div>

            {/* Loading */}
            {loading ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <SkeletonCard key={index} />
                ))}
              </div>
            ) : items.length === 0 ? (
              <EmptyState />
            ) : filteredItems.length === 0 ? (
              <SearchEmptyState />
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {filteredItems.map((item, index) => (
                  <AdminMemoryCard
                    key={item.id}
                    item={item}
                    index={index}
                    deleting={deletingId === item.id}
                    settingFeatured={settingFeaturedId === item.id}
                    onDelete={handleDelete}
                    onSetFeatured={handleSetFeatured}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

/* ============================================
   ADMIN MEMORY CARD
============================================ */

interface AdminMemoryCardProps {
  item: GalleryItem;
  index: number;
  deleting: boolean;
  settingFeatured: boolean;
  onDelete: (item: GalleryItem) => void;
  onSetFeatured: (item: GalleryItem) => void;
}

function AdminMemoryCard({
  item,
  index,
  deleting,
  settingFeatured,
  onDelete,
  onSetFeatured,
}: AdminMemoryCardProps) {
  return (
    <article
      className={`
        group
        overflow-hidden
        rounded-[24px]
        border
        bg-[#0D0E28]/75
        shadow-[0_15px_50px_rgba(0,0,0,0.18)]
        backdrop-blur-xl
        transition-all
        duration-500
        hover:-translate-y-1
        hover:bg-[#10112D]
        hover:shadow-[0_25px_65px_rgba(0,0,0,0.28)]
        ${
          item.featured
            ? "border-[#F3A9C7]/25 ring-1 ring-[#F3A9C7]/5"
            : "border-white/[0.07]"
        }
      `}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-[#08091F]">
        <img
          src={item.imageUrl}
          alt={item.title}
          className="
            h-full
            w-full
            object-cover
            transition-transform
            duration-700
            group-hover:scale-[1.04]
          "
          loading="lazy"
        />

        {/* Dark gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#08091F]/80 via-transparent to-[#08091F]/10" />

        {/* Index */}
        <span className="absolute left-3 top-3 rounded-full border border-white/10 bg-[#08091F]/65 px-2.5 py-1 text-[8px] font-medium tracking-[0.08em] text-white/55 backdrop-blur-md">
          #{String(index + 1).padStart(2, "0")}
        </span>

        {/* Date */}
        <span className="absolute bottom-3 left-3 rounded-full border border-white/10 bg-[#08091F]/60 px-2.5 py-1 text-[9px] font-medium text-white/75 backdrop-blur-md">
          {item.date}
        </span>

        {/* Featured */}
        {item.featured && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-[#F4D58D]/20 bg-[#1C1830]/75 px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.1em] text-[#F4D58D] backdrop-blur-md">
            <Star size={8} className="fill-current" />
            Featured
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-serif text-[17px] text-white/90">
              {item.title}
            </h3>

            {item.location && (
              <div className="mt-1.5 flex items-center gap-1.5 text-[9px] text-white/25">
                <MapPin size={10} className="text-[#F3A9C7]/45" />

                <span className="truncate">{item.location}</span>
              </div>
            )}
          </div>

          {item.publicId ? (
            <span className="shrink-0 rounded-full border border-emerald-400/10 bg-emerald-400/5 px-2 py-1 text-[7px] font-medium uppercase tracking-[0.08em] text-emerald-300/65">
              Cloudinary
            </span>
          ) : (
            <span className="shrink-0 rounded-full border border-amber-400/10 bg-amber-400/5 px-2 py-1 text-[7px] font-medium uppercase tracking-[0.08em] text-amber-300/65">
              Legacy
            </span>
          )}
        </div>

        {/* Story */}
        <p className="mt-3 line-clamp-3 text-[11px] leading-5 text-white/30">
          {item.story}
        </p>

        {/* Divider */}
        <div className="my-4 h-px bg-white/[0.05]" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Featured */}
          <button
            type="button"
            onClick={() => onSetFeatured(item)}
            disabled={item.featured || settingFeatured || deleting}
            className={`
              flex
              min-h-8
              flex-1
              items-center
              justify-center
              gap-1.5
              rounded-xl
              border
              px-3
              py-2
              text-[9px]
              font-semibold
              transition
              disabled:cursor-not-allowed
              ${
                item.featured
                  ? "border-[#F3A9C7]/15 bg-[#F3A9C7]/5 text-[#F3A9C7]/70"
                  : "border-white/[0.06] bg-white/[0.025] text-white/40 hover:border-[#F3A9C7]/15 hover:bg-[#F3A9C7]/5 hover:text-[#F3A9C7]"
              }
            `}
          >
            {settingFeatured ? (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#F3A9C7]/20 border-t-[#F3A9C7]" />
            ) : item.featured ? (
              <Check size={11} />
            ) : (
              <Crown size={11} />
            )}

            {item.featured ? "Featured Memory" : "Jadikan Featured"}
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={() => onDelete(item)}
            disabled={deleting || settingFeatured}
            className="
              flex
              h-8
              w-8
              shrink-0
              items-center
              justify-center
              rounded-xl
              border
              border-red-400/10
              bg-red-400/[0.03]
              text-red-300/40
              transition
              hover:border-red-400/20
              hover:bg-red-400/[0.07]
              hover:text-red-300
              disabled:cursor-not-allowed
              disabled:opacity-30
            "
            aria-label={`Hapus ${item.title}`}
          >
            {deleting ? (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-red-300/20 border-t-red-300" />
            ) : (
              <Trash2 size={12} />
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

/* ============================================
   FORM FIELD
============================================ */

function FormField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/30"
      >
        {label}
      </label>

      {children}
    </div>
  );
}

/* ============================================
   ARCHIVE STAT
============================================ */

function ArchiveStat({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="min-w-[105px] rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 backdrop-blur-xl">
      <div
        className={`mb-2 flex items-center gap-2 ${
          accent ? "text-[#F3A9C7]" : "text-white/25"
        }`}
      >
        {icon}

        <span className="text-[8px] uppercase tracking-[0.12em]">{label}</span>
      </div>

      <p className="text-xl font-semibold leading-none text-white/85">
        {value}
      </p>
    </div>
  );
}

/* ============================================
   SKELETON
============================================ */

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-[24px] border border-white/[0.06] bg-[#0D0E28]/70">
      <div className="aspect-[4/3] animate-pulse bg-white/[0.035]" />

      <div className="space-y-3 p-4">
        <div className="h-3 w-16 animate-pulse rounded bg-white/[0.06]" />

        <div className="h-5 w-2/3 animate-pulse rounded bg-white/[0.06]" />

        <div className="h-3 w-full animate-pulse rounded bg-white/[0.04]" />

        <div className="h-8 w-full animate-pulse rounded-xl bg-white/[0.04]" />
      </div>
    </div>
  );
}

/* ============================================
   EMPTY STATE
============================================ */

function EmptyState() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-[28px] border border-dashed border-white/[0.08] bg-white/[0.015] px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#F3A9C7]/10 bg-[#F3A9C7]/5 text-[#F3A9C7]/60">
        <ImagePlus size={23} />
      </div>

      <p className="mt-5 font-serif text-xl text-white/80">
        Belum ada kenangan
      </p>

      <p className="mt-2 max-w-xs text-xs leading-5 text-white/25">
        Tambahkan memory pertama melalui form New Entry di sebelah kiri.
      </p>
    </div>
  );
}

/* ============================================
   SEARCH EMPTY
============================================ */

function SearchEmptyState() {
  return (
    <div className="flex min-h-[330px] flex-col items-center justify-center rounded-[28px] border border-white/[0.07] bg-white/[0.015] px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.07] bg-white/[0.025] text-white/30">
        <Search size={18} />
      </div>

      <p className="mt-4 font-serif text-lg text-white/75">
        Kenangan tidak ditemukan
      </p>

      <p className="mt-1 text-xs text-white/25">
        Coba gunakan kata kunci lain.
      </p>
    </div>
  );
}

/* ============================================
   SHARED INPUT CLASS
============================================ */

const inputClassName = `
  w-full
  rounded-xl
  border
  border-white/[0.08]
  bg-[#08091F]/80
  px-3.5
  py-2.5
  text-xs
  text-white/80
  outline-none
  transition
  placeholder:text-white/15
  focus:border-[#F3A9C7]/30
  focus:bg-[#08091F]
  focus:ring-2
  focus:ring-[#F3A9C7]/5
`;
