"use client";

import { useEffect, useMemo, useState } from "react";

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";

import {
  CalendarDays,
  Camera,
  Check,
  Clock3,
  Download,
  Eye,
  Image as ImageIcon,
  Images,
  Loader2,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { db } from "@/lib/firebase";

/* =========================================================
   TYPES
========================================================= */

interface PhotoboothItem {
  id: string;
  url: string;
  publicId?: string;
  template: string;
  createdAt: Timestamp | null;
}

interface TemplateInfo {
  name: string;
  bg: string;
  accent: string;
  textColor: string;
}

/* =========================================================
   TEMPLATE CONFIG
========================================================= */

const TEMPLATE_CONFIG: Record<string, TemplateInfo> = {
  pastel: {
    name: "Pastel",
    bg: "#FDE8F3",
    accent: "#F5A9D0",
    textColor: "#7A4869",
  },

  polaroid: {
    name: "Polaroid",
    bg: "#FFFFFF",
    accent: "#2B2B2B",
    textColor: "#2B2B2B",
  },

  film: {
    name: "Film",
    bg: "#111111",
    accent: "#F2C94C",
    textColor: "#F2C94C",
  },

  vintage: {
    name: "Vintage",
    bg: "#EFE6D8",
    accent: "#8B5E3C",
    textColor: "#5B3A29",
  },

  sakura: {
    name: "Sakura",
    bg: "#FFF0F5",
    accent: "#FFB7C5",
    textColor: "#B23A62",
  },

  birthday: {
    name: "Birthday",
    bg: "#FFF7E0",
    accent: "#FF6B6B",
    textColor: "#B33939",
  },

  elegant: {
    name: "Elegant",
    bg: "#1B1B2F",
    accent: "#D4AF37",
    textColor: "#D4AF37",
  },

  kawaii: {
    name: "Kawaii",
    bg: "#FFE6F0",
    accent: "#FF9AC1",
    textColor: "#D6396D",
  },

  minimal: {
    name: "Minimal",
    bg: "#FFFFFF",
    accent: "#3B2E52",
    textColor: "#3B2E52",
  },
};

/* =========================================================
   HELPERS
========================================================= */

function getTemplateInfo(templateId: string): TemplateInfo {
  return (
    TEMPLATE_CONFIG[templateId] ?? {
      name: templateId || "Unknown",
      bg: "#17192D",
      accent: "#A78BFA",
      textColor: "#FFFFFF",
    }
  );
}

function formatDate(timestamp: Timestamp | null) {
  if (!timestamp) {
    return "Tanggal tidak tersedia";
  }

  return timestamp.toDate().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(timestamp: Timestamp | null) {
  if (!timestamp) {
    return "--:--";
  }

  return timestamp.toDate().toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function MonitoringPhotoPage() {
  /* =======================================================
     STATE
  ======================================================== */

  const [items, setItems] = useState<PhotoboothItem[]>([]);

  const [loading, setLoading] = useState(true);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [selectedPhoto, setSelectedPhoto] = useState<PhotoboothItem | null>(
    null,
  );

  const [searchQuery, setSearchQuery] = useState("");

  const [selectedTemplate, setSelectedTemplate] = useState("all");

  /* =======================================================
     FIRESTORE
  ======================================================== */

  useEffect(() => {
    const photosQuery = query(
      collection(db, "photobooth"),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      photosQuery,
      (snapshot) => {
        const photos = snapshot.docs.map((snapshotDoc) => {
          const data = snapshotDoc.data();

          return {
            id: snapshotDoc.id,
            url: data.url ?? "",
            publicId: data.publicId,
            template: data.template ?? "unknown",
            createdAt: data.createdAt ?? null,
          } as PhotoboothItem;
        });

        setItems(photos);
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

  /* =======================================================
     TEMPLATE FILTER
  ======================================================== */

  const availableTemplates = useMemo(() => {
    const templates = new Set(
      items.map((item) => item.template).filter(Boolean),
    );

    return Array.from(templates);
  }, [items]);

  /* =======================================================
     FILTERED ITEMS
  ======================================================== */

  const filteredItems = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    return items.filter((item) => {
      const templateName = getTemplateInfo(item.template).name.toLowerCase();

      const matchesSearch =
        !keyword ||
        templateName.includes(keyword) ||
        item.template.toLowerCase().includes(keyword);

      const matchesTemplate =
        selectedTemplate === "all" || item.template === selectedTemplate;

      return matchesSearch && matchesTemplate;
    });
  }, [items, searchQuery, selectedTemplate]);

  /* =======================================================
     REMOVE FROM MONITORING
  ======================================================== */

  async function handleRemoveFromMonitoring(item: PhotoboothItem) {
    const templateInfo = getTemplateInfo(item.template);

    const confirmed = window.confirm(
      `Hapus hasil Photobooth dengan template "${templateInfo.name}" dari Monitoring?

File asli tetap tersimpan di Private Photo Archive dan Cloudinary.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(item.id);
    setError(null);

    try {
      /*
       * HANYA HAPUS DOKUMEN FIRESTORE.
       *
       * File Cloudinary tidak disentuh.
       */
      await deleteDoc(doc(db, "photobooth", item.id));

      if (selectedPhoto?.id === item.id) {
        setSelectedPhoto(null);
      }
    } catch (deleteError) {
      console.error("Remove monitoring photo error:", deleteError);

      setError("Gagal menghapus foto dari Monitoring Photobooth.");
    } finally {
      setDeletingId(null);
    }
  }

  /* =======================================================
     DOWNLOAD
  ======================================================== */

  async function handleDownload(url: string, id: string) {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Gagal mengambil file.");
      }

      const blob = await response.blob();

      const blobUrl = URL.createObjectURL(blob);

      const anchor = document.createElement("a");

      anchor.href = blobUrl;

      anchor.download = `the-archive-photobooth-${id}.jpg`;

      document.body.appendChild(anchor);

      anchor.click();

      document.body.removeChild(anchor);

      window.setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 1000);
    } catch (downloadError) {
      console.error("Download photobooth error:", downloadError);

      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  /* =======================================================
     CLEAR FILTER
  ======================================================== */

  function clearFilters() {
    setSearchQuery("");
    setSelectedTemplate("all");
  }

  /* =======================================================
     RENDER
  ======================================================== */

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080b20] text-white">
      {/* =====================================================
          AMBIENT BACKGROUND
      ===================================================== */}

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        {/* Purple glow */}

        <div
          className="
            absolute
            -left-32
            top-[-120px]
            h-[420px]
            w-[420px]
            rounded-full
            bg-[#9c5d94]/[0.08]
            blur-[130px]
          "
        />

        {/* Blue glow */}

        <div
          className="
            absolute
            right-[-120px]
            top-[25%]
            h-[400px]
            w-[400px]
            rounded-full
            bg-[#5366a8]/[0.06]
            blur-[130px]
          "
        />

        {/* Pink glow */}

        <div
          className="
            absolute
            bottom-[-180px]
            left-[35%]
            h-[400px]
            w-[400px]
            rounded-full
            bg-[#d06b9d]/[0.045]
            blur-[130px]
          "
        />

        {/* Stars */}

        <span className="absolute left-[8%] top-[18%] h-1 w-1 rounded-full bg-white/20" />

        <span className="absolute right-[14%] top-[14%] h-1.5 w-1.5 rounded-full bg-white/15" />

        <span className="absolute left-[42%] top-[8%] h-0.5 w-0.5 rounded-full bg-white/30" />

        <span className="absolute right-[35%] top-[48%] h-0.5 w-0.5 rounded-full bg-white/20" />

        <span className="absolute bottom-[22%] left-[16%] h-1 w-1 rounded-full bg-white/15" />
      </div>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <div className="relative z-10 mx-auto w-full max-w-[1500px] px-4 pb-12 pt-20 sm:px-6 lg:px-8">
        {/* ===================================================
            HEADER
        =================================================== */}

        <header className="mb-8">
          <div
            className="
              flex
              flex-col
              gap-6
              xl:flex-row
              xl:items-end
              xl:justify-between
            "
          >
            {/* LEFT */}

            <div>
              {/* Eyebrow */}

              <div
                className="
                  mb-3
                  inline-flex
                  items-center
                  gap-2
                  rounded-full
                  border
                  border-[var(--archive-pink)]/20
                  bg-[var(--archive-pink)]/[0.05]
                  px-3
                  py-1.5
                "
              >
                <Camera size={11} className="text-[var(--archive-pink-soft)]" />

                <span
                  className="
                    text-[9px]
                    font-semibold
                    uppercase
                    tracking-[0.18em]
                    text-white/60
                  "
                >
                  Active Photobooth
                </span>
              </div>

              <h1
                className="
                  archive-display
                  text-[clamp(2.4rem,5vw,4.4rem)]
                  leading-[0.92]
                  tracking-[-0.04em]
                  text-white
                "
              >
                Monitoring
                <span className="block text-[var(--archive-pink-soft)]">
                  Photobooth
                </span>
              </h1>

              <p
                className="
                  mt-4
                  max-w-2xl
                  text-sm
                  leading-6
                  text-white/40
                "
              >
                Pantau hasil foto yang masih aktif di The Archive. Setiap photo
                strip yang tersimpan akan muncul di halaman ini.
              </p>
            </div>

            {/* RIGHT — STATS */}

            <div
              className="
                grid
                grid-cols-2
                gap-2
                sm:flex
              "
            >
              <StatCard
                icon={<Images size={14} />}
                label="Foto Aktif"
                value={items.length.toString()}
              />

              <StatCard
                icon={<ImageIcon size={14} />}
                label="Ditampilkan"
                value={filteredItems.length.toString()}
              />
            </div>
          </div>
        </header>

        {/* ===================================================
            INFO NOTICE
        =================================================== */}

        <div
          className="
            mb-6
            flex
            flex-col
            gap-3
            rounded-2xl
            border
            border-[var(--archive-gold-soft)]/[0.12]
            bg-[var(--archive-gold-soft)]/[0.025]
            p-4
            sm:flex-row
            sm:items-center
          "
        >
          <div
            className="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-full
              border
              border-[var(--archive-gold-soft)]/20
              bg-[var(--archive-gold-soft)]/[0.06]
            "
          >
            <Sparkles size={14} className="text-[var(--archive-gold-soft)]" />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-medium text-white/70">
              Monitoring hanya mengatur tampilan aktif.
            </p>

            <p className="mt-0.5 text-[10px] leading-5 text-white/30">
              Menghapus foto dari halaman ini hanya menghapus dokumen Firestore.
              File asli di Cloudinary tetap tersimpan di arsip.
            </p>
          </div>
        </div>

        {/* ===================================================
            ERROR
        =================================================== */}

        {error && (
          <div
            className="
              mb-6
              flex
              items-start
              justify-between
              gap-3
              rounded-2xl
              border
              border-red-400/20
              bg-red-500/[0.06]
              px-4
              py-3
              text-sm
              text-red-300
            "
          >
            <p>{error}</p>

            <button
              type="button"
              onClick={() => setError(null)}
              className="
                shrink-0
                rounded-full
                p-1
                text-red-300/60
                transition
                hover:bg-red-500/10
                hover:text-red-200
              "
              aria-label="Tutup error"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* ===================================================
            FILTER BAR
        =================================================== */}

        {!loading && items.length > 0 && (
          <section
            className="
              mb-7
              rounded-2xl
              border
              border-white/[0.07]
              bg-white/[0.025]
              p-3
              backdrop-blur-md
              sm:p-4
            "
          >
            <div
              className="
                flex
                flex-col
                gap-3
                lg:flex-row
                lg:items-center
              "
            >
              {/* SEARCH */}

              <div className="relative flex-1">
                <Search
                  size={14}
                  className="
                    pointer-events-none
                    absolute
                    left-4
                    top-1/2
                    -translate-y-1/2
                    text-white/25
                  "
                />

                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Cari template..."
                  className="
                    h-11
                    w-full
                    rounded-xl
                    border
                    border-white/[0.07]
                    bg-black/[0.12]
                    pl-10
                    pr-4
                    text-xs
                    text-white/80
                    outline-none
                    placeholder:text-white/20
                    transition
                    focus:border-[var(--archive-pink)]/30
                    focus:bg-white/[0.035]
                  "
                />
              </div>

              {/* TEMPLATE FILTER */}

              <div
                className="
                  flex
                  gap-2
                  overflow-x-auto
                  pb-0.5
                "
              >
                <FilterButton
                  active={selectedTemplate === "all"}
                  onClick={() => setSelectedTemplate("all")}
                >
                  Semua
                </FilterButton>

                {availableTemplates.map((templateId) => {
                  const info = getTemplateInfo(templateId);

                  return (
                    <FilterButton
                      key={templateId}
                      active={selectedTemplate === templateId}
                      onClick={() => setSelectedTemplate(templateId)}
                    >
                      {info.name}
                    </FilterButton>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ===================================================
            CONTENT
        =================================================== */}

        {loading ? (
          <LoadingGrid />
        ) : items.length === 0 ? (
          <EmptyState />
        ) : filteredItems.length === 0 ? (
          <NoResultState onClear={clearFilters} />
        ) : (
          <div
            className="
              grid
              grid-cols-1
              gap-5
              sm:grid-cols-2
              lg:grid-cols-3
              xl:grid-cols-4
            "
          >
            {filteredItems.map((item, index) => (
              <PhotoCard
                key={item.id}
                item={item}
                index={index}
                deleting={deletingId === item.id}
                onPreview={() => setSelectedPhoto(item)}
                onDownload={() => handleDownload(item.url, item.id)}
                onDelete={() => handleRemoveFromMonitoring(item)}
              />
            ))}
          </div>
        )}

        {/* ===================================================
            FOOTER
        =================================================== */}

        {!loading && items.length > 0 && (
          <div
            className="
              mt-8
              flex
              items-center
              justify-center
              gap-2
              text-center
            "
          >
            <Sparkles
              size={10}
              className="text-[var(--archive-gold-soft)]/50"
            />

            <p
              className="
                text-[9px]
                uppercase
                tracking-[0.14em]
                text-white/20
              "
            >
              Every photo is a little piece of memory
            </p>

            <Sparkles
              size={10}
              className="text-[var(--archive-gold-soft)]/50"
            />
          </div>
        )}
      </div>

      {/* =====================================================
          PREVIEW MODAL
      ===================================================== */}

      {selectedPhoto && (
        <PhotoPreviewModal
          item={selectedPhoto}
          deleting={deletingId === selectedPhoto.id}
          onClose={() => setSelectedPhoto(null)}
          onDownload={() => handleDownload(selectedPhoto.url, selectedPhoto.id)}
          onDelete={() => handleRemoveFromMonitoring(selectedPhoto)}
        />
      )}
    </main>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      className="
        flex
        min-w-[125px]
        items-center
        gap-3
        rounded-2xl
        border
        border-white/[0.07]
        bg-white/[0.025]
        px-4
        py-3
        backdrop-blur-md
      "
    >
      <div
        className="
          flex
          h-8
          w-8
          shrink-0
          items-center
          justify-center
          rounded-full
          border
          border-[var(--archive-pink)]/15
          bg-[var(--archive-pink)]/[0.06]
          text-[var(--archive-pink-soft)]
        "
      >
        {icon}
      </div>

      <div>
        <p className="text-[8px] uppercase tracking-[0.14em] text-white/25">
          {label}
        </p>

        <p className="mt-0.5 text-lg font-semibold leading-none text-white/75">
          {value}
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   FILTER BUTTON
========================================================= */

function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        inline-flex
        h-10
        shrink-0
        items-center
        justify-center
        rounded-xl
        border
        px-4
        text-[10px]
        font-medium
        transition
        ${
          active
            ? "border-[var(--archive-pink)]/30 bg-[var(--archive-pink)]/[0.12] text-white/80"
            : "border-white/[0.06] bg-white/[0.02] text-white/35 hover:border-white/[0.12] hover:bg-white/[0.04] hover:text-white/60"
        }
      `}
    >
      {children}
    </button>
  );
}

/* =========================================================
   PHOTO CARD
========================================================= */

function PhotoCard({
  item,
  index,
  deleting,
  onPreview,
  onDownload,
  onDelete,
}: {
  item: PhotoboothItem;
  index: number;
  deleting: boolean;
  onPreview: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const template = getTemplateInfo(item.template);

  return (
    <article
      className="
        group
        relative
        overflow-hidden
        rounded-3xl
        border
        border-white/[0.07]
        bg-white/[0.025]
        p-3
        shadow-[0_18px_60px_rgba(0,0,0,0.14)]
        backdrop-blur-md
        transition-all
        duration-300
        hover:-translate-y-1
        hover:border-white/[0.12]
        hover:bg-white/[0.035]
        hover:shadow-[0_25px_80px_rgba(0,0,0,0.22)]
      "
    >
      {/* =================================================
          PHOTO
      ================================================= */}

      <button
        type="button"
        onClick={onPreview}
        className="
          group/photo
          relative
          block
          w-full
          overflow-hidden
          rounded-2xl
          border
          border-white/[0.06]
          bg-[#080b20]
          text-left
        "
        aria-label={`Preview photo ${index + 1}`}
      >
        {/* Photo */}

        <img
          src={item.url}
          alt={`Photobooth ${template.name}`}
          className="
            block
            h-auto
            w-full
            object-contain
            transition
            duration-500
            group-hover/photo:scale-[1.025]
          "
          loading="lazy"
        />

        {/* Overlay */}

        <div
          className="
            pointer-events-none
            absolute
            inset-0
            flex
            items-center
            justify-center
            bg-black/0
            transition
            duration-300
            group-hover/photo:bg-black/25
          "
        >
          <span
            className="
              flex
              h-11
              w-11
              scale-90
              items-center
              justify-center
              rounded-full
              border
              border-white/20
              bg-[#080b20]/60
              text-white
              opacity-0
              shadow-xl
              backdrop-blur-md
              transition
              duration-300
              group-hover/photo:scale-100
              group-hover/photo:opacity-100
            "
          >
            <Eye size={17} />
          </span>
        </div>

        {/* Index */}

        <span
          className="
            absolute
            left-2.5
            top-2.5
            rounded-full
            border
            border-white/10
            bg-[#080b20]/65
            px-2
            py-1
            text-[8px]
            font-medium
            text-white/55
            backdrop-blur-md
          "
        >
          #{String(index + 1).padStart(2, "0")}
        </span>

        {/* Saved */}

        <span
          className="
            absolute
            right-2.5
            top-2.5
            flex
            items-center
            gap-1
            rounded-full
            border
            border-emerald-300/10
            bg-[#080b20]/65
            px-2
            py-1
            text-[7px]
            font-medium
            text-emerald-200/70
            backdrop-blur-md
          "
        >
          <Check size={8} />
          Active
        </span>
      </button>

      {/* =================================================
          META
      ================================================= */}

      <div className="px-1 pt-4">
        {/* Template */}

        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{
                backgroundColor: template.accent,
                boxShadow: `0 0 12px ${template.accent}55`,
              }}
            />

            <p className="truncate text-xs font-medium text-white/70">
              {template.name}
            </p>
          </div>

          <span
            className="
              shrink-0
              rounded-full
              border
              border-white/[0.06]
              bg-white/[0.02]
              px-2
              py-1
              text-[7px]
              uppercase
              tracking-[0.12em]
              text-white/25
            "
          >
            Strip
          </span>
        </div>

        {/* Date */}

        <div
          className="
            mt-3
            flex
            flex-wrap
            items-center
            gap-x-3
            gap-y-1
            text-[8px]
            text-white/25
          "
        >
          <span className="flex items-center gap-1.5">
            <CalendarDays size={9} />

            {formatDate(item.createdAt)}
          </span>

          <span className="flex items-center gap-1.5">
            <Clock3 size={9} />

            {formatTime(item.createdAt)}
          </span>
        </div>

        {/* Actions */}

        <div className="mt-4 grid grid-cols-[1fr_auto_auto] gap-2">
          <button
            type="button"
            onClick={onPreview}
            className="
              inline-flex
              h-9
              items-center
              justify-center
              gap-1.5
              rounded-xl
              bg-[var(--archive-pink)]
              px-3
              text-[9px]
              font-semibold
              text-white
              transition
              hover:bg-[var(--archive-pink-soft)]
            "
          >
            <Eye size={12} />
            Preview
          </button>

          <button
            type="button"
            onClick={onDownload}
            className="
              inline-flex
              h-9
              w-9
              items-center
              justify-center
              rounded-xl
              border
              border-white/[0.07]
              bg-white/[0.025]
              text-white/40
              transition
              hover:border-white/[0.13]
              hover:bg-white/[0.06]
              hover:text-white/75
            "
            aria-label="Download foto"
          >
            <Download size={13} />
          </button>

          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="
              inline-flex
              h-9
              w-9
              items-center
              justify-center
              rounded-xl
              border
              border-red-400/[0.12]
              bg-red-500/[0.035]
              text-red-300/60
              transition
              hover:border-red-400/20
              hover:bg-red-500/[0.08]
              hover:text-red-200
              disabled:cursor-not-allowed
              disabled:opacity-40
            "
            aria-label="Hapus dari monitoring"
          >
            {deleting ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Trash2 size={13} />
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

/* =========================================================
   LOADING GRID
========================================================= */

function LoadingGrid() {
  return (
    <div
      className="
        grid
        grid-cols-1
        gap-5
        sm:grid-cols-2
        lg:grid-cols-3
        xl:grid-cols-4
      "
    >
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="
            animate-pulse
            overflow-hidden
            rounded-3xl
            border
            border-white/[0.06]
            bg-white/[0.025]
            p-3
          "
        >
          <div className="aspect-[1/3] rounded-2xl bg-white/[0.05]" />

          <div className="px-1 pt-4">
            <div className="h-3 w-24 rounded-full bg-white/[0.06]" />

            <div className="mt-3 h-2 w-40 rounded-full bg-white/[0.04]" />

            <div className="mt-4 h-9 rounded-xl bg-white/[0.05]" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState() {
  return (
    <section
      className="
        relative
        overflow-hidden
        rounded-3xl
        border
        border-dashed
        border-white/[0.09]
        bg-white/[0.02]
        px-6
        py-20
        text-center
      "
    >
      {/* Glow */}

      <div
        className="
          pointer-events-none
          absolute
          left-1/2
          top-1/2
          h-52
          w-52
          -translate-x-1/2
          -translate-y-1/2
          rounded-full
          bg-[var(--archive-pink)]/[0.05]
          blur-[80px]
        "
      />

      <div
        className="
          relative
          mx-auto
          flex
          h-16
          w-16
          items-center
          justify-center
          rounded-full
          border
          border-white/[0.08]
          bg-white/[0.025]
        "
      >
        <Images size={25} className="text-[var(--archive-pink-soft)]/60" />
      </div>

      <p className="relative mt-5 text-sm font-medium text-white/65">
        Belum ada foto aktif
      </p>

      <p
        className="
          relative
          mx-auto
          mt-2
          max-w-md
          text-xs
          leading-5
          text-white/25
        "
      >
        Hasil Photobooth yang disimpan akan muncul di sini sebagai photo strip.
      </p>

      <div
        className="
          relative
          mx-auto
          mt-5
          flex
          w-fit
          items-center
          gap-2
          rounded-full
          border
          border-white/[0.06]
          bg-white/[0.02]
          px-3
          py-2
          text-[8px]
          uppercase
          tracking-[0.12em]
          text-white/20
        "
      >
        <Camera size={10} />
        Photobooth Archive
      </div>
    </section>
  );
}

/* =========================================================
   NO RESULT STATE
========================================================= */

function NoResultState({ onClear }: { onClear: () => void }) {
  return (
    <section
      className="
        rounded-3xl
        border
        border-dashed
        border-white/[0.08]
        bg-white/[0.02]
        px-6
        py-16
        text-center
      "
    >
      <Search size={25} className="mx-auto text-white/20" />

      <p className="mt-4 text-sm font-medium text-white/60">
        Tidak ada hasil yang ditemukan
      </p>

      <p className="mt-2 text-xs text-white/25">
        Coba gunakan kata kunci atau filter template lainnya.
      </p>

      <button
        type="button"
        onClick={onClear}
        className="
          mt-5
          inline-flex
          items-center
          gap-2
          rounded-full
          border
          border-white/[0.08]
          bg-white/[0.03]
          px-4
          py-2.5
          text-[9px]
          font-medium
          text-white/50
          transition
          hover:bg-white/[0.06]
          hover:text-white/75
        "
      >
        Reset Filter
      </button>
    </section>
  );
}

/* =========================================================
   PREVIEW MODAL
========================================================= */

function PhotoPreviewModal({
  item,
  deleting,
  onClose,
  onDownload,
  onDelete,
}: {
  item: PhotoboothItem;
  deleting: boolean;
  onClose: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const template = getTemplateInfo(item.template);

  return (
    <div
      className="
        fixed
        inset-0
        z-[100]
        flex
        items-center
        justify-center
        bg-[#030516]/90
        p-4
        backdrop-blur-xl
        sm:p-6
      "
      role="dialog"
      aria-modal="true"
      aria-label="Preview Photobooth"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      {/* =================================================
          MODAL
      ================================================= */}

      <div
        className="
          relative
          flex
          max-h-[92vh]
          w-full
          max-w-4xl
          flex-col
          overflow-hidden
          rounded-3xl
          border
          border-white/[0.09]
          bg-[#0c1028]/95
          shadow-[0_30px_120px_rgba(0,0,0,0.55)]
        "
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <header
          className="
            flex
            shrink-0
            items-center
            justify-between
            gap-4
            border-b
            border-white/[0.06]
            px-4
            py-3
            sm:px-5
          "
        >
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-full
                border
                border-[var(--archive-pink)]/20
                bg-[var(--archive-pink)]/[0.07]
              "
            >
              <Camera size={14} className="text-[var(--archive-pink-soft)]" />
            </div>

            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-white/70">
                Photobooth Preview
              </p>

              <p className="mt-0.5 truncate text-[8px] text-white/25">
                Template {template.name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-full
              border
              border-white/[0.07]
              bg-white/[0.025]
              text-white/40
              transition
              hover:bg-white/[0.07]
              hover:text-white/80
            "
            aria-label="Tutup preview"
          >
            <X size={15} />
          </button>
        </header>

        {/* =================================================
            BODY
        ================================================= */}

        <div
          className="
            min-h-0
            flex-1
            overflow-auto
            bg-[#070a1d]
            p-4
            sm:p-6
          "
        >
          <div className="flex min-h-full items-center justify-center">
            <div
              className="
                relative
                max-h-[65vh]
                overflow-hidden
                rounded-2xl
                border
                border-white/[0.08]
                bg-black/30
                shadow-[0_25px_80px_rgba(0,0,0,0.4)]
              "
            >
              <img
                src={item.url}
                alt={`Photobooth ${template.name}`}
                className="
                  block
                  max-h-[65vh]
                  max-w-full
                  object-contain
                "
              />
            </div>
          </div>
        </div>

        {/* =================================================
            FOOTER
        ================================================= */}

        <footer
          className="
            shrink-0
            border-t
            border-white/[0.06]
            px-4
            py-3
            sm:px-5
          "
        >
          <div
            className="
              flex
              flex-col
              gap-3
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >
            {/* META */}

            <div
              className="
                flex
                flex-wrap
                items-center
                gap-x-4
                gap-y-1
                text-[8px]
                text-white/25
              "
            >
              <span className="flex items-center gap-1.5">
                <CalendarDays size={9} />

                {formatDate(item.createdAt)}
              </span>

              <span className="flex items-center gap-1.5">
                <Clock3 size={9} />

                {formatTime(item.createdAt)}
              </span>

              <span className="flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    backgroundColor: template.accent,
                  }}
                />

                {template.name}
              </span>
            </div>

            {/* ACTIONS */}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onDownload}
                className="
                  inline-flex
                  h-9
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-[var(--archive-pink)]
                  px-4
                  text-[9px]
                  font-semibold
                  text-white
                  transition
                  hover:bg-[var(--archive-pink-soft)]
                "
              >
                <Download size={12} />
                Download
              </button>

              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                className="
                  inline-flex
                  h-9
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  border
                  border-red-400/[0.14]
                  bg-red-500/[0.04]
                  px-4
                  text-[9px]
                  font-medium
                  text-red-300/70
                  transition
                  hover:bg-red-500/[0.08]
                  hover:text-red-200
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
              >
                {deleting ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Trash2 size={12} />
                )}

                {deleting ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
