"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";

import {
  Archive,
  Bluetooth,
  CheckCircle2,
  Download,
  Image as ImageIcon,
  Loader2,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  Unplug,
  X,
} from "lucide-react";

import { onAuthStateChanged, type User } from "firebase/auth";

import { collection, deleteDoc, doc, onSnapshot } from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

import {
  connectBluetoothPrinter,
  disconnectBluetoothPrinter,
  getBluetoothPrinterInfo,
  isBluetoothPrinterConnected,
  isBluetoothPrinterSupported,
  printBluetoothPhoto,
  restoreBluetoothPrinter,
  testBluetoothPrinter,
  type BluetoothPrinterInfo,
} from "@/lib/bluetooth-thermal-printer";

/* ============================================================
   TYPES
============================================================ */

interface ArchivePhoto {
  publicId: string;
  url: string;
  format: string | null;
  width: number | null;
  height: number | null;
  bytes: number | null;
  createdAt: string | null;
}

interface ArchiveResponse {
  resources: ArchivePhoto[];
  nextCursor: string | null;
  message?: string;
}

interface ActivePhotoboothItem {
  id: string;
  publicId?: string;
}

const EMPTY_PRINTER_INFO: BluetoothPrinterInfo = {
  connected: false,
  deviceName: null,
  serviceUuid: null,
  characteristicUuid: null,
};

/* ============================================================
   HELPERS
============================================================ */

async function fetchArchivePage(
  user: User,
  cursor?: string,
  signal?: AbortSignal,
): Promise<ArchiveResponse> {
  const idToken = await user.getIdToken();

  const searchParams = new URLSearchParams();

  if (cursor) {
    searchParams.set("cursor", cursor);
  }

  const queryString = searchParams.toString();

  const response = await fetch(
    `/api/cloudinary/photo-archive${queryString ? `?${queryString}` : ""}`,
    {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
      cache: "no-store",
      signal,
    },
  );

  const data = (await response
    .json()
    .catch(() => null)) as ArchiveResponse | null;

  if (!response.ok || !data) {
    throw new Error(data?.message || "Gagal memuat Private Photo Archive.");
  }

  return data;
}

function formatBytes(bytes: number | null) {
  if (!bytes || bytes <= 0) {
    return "-";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatArchiveDate(value: string | null) {
  if (!value) {
    return "Tanggal tidak tersedia";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Tanggal tidak tersedia";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function isToday(value: string | null) {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const today = new Date();

  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/* ============================================================
   PAGE
============================================================ */

export default function PhotoArchivePage() {
  /* ==========================================================
     ARCHIVE STATE
  ========================================================== */

  const [photos, setPhotos] = useState<ArchivePhoto[]>([]);

  const [activeItems, setActiveItems] = useState<ActivePhotoboothItem[]>([]);

  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  const [loadingMore, setLoadingMore] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const [deletingPublicId, setDeletingPublicId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");

  /* ==========================================================
     PRINTER STATE
  ========================================================== */

  const [printerSupported] = useState(() => isBluetoothPrinterSupported());

  const [printerInfo, setPrinterInfo] =
    useState<BluetoothPrinterInfo>(EMPTY_PRINTER_INFO);

  const [restoringPrinter, setRestoringPrinter] = useState(printerSupported);

  const [connectingPrinter, setConnectingPrinter] = useState(false);

  const [disconnectingPrinter, setDisconnectingPrinter] = useState(false);

  const [testingPrinter, setTestingPrinter] = useState(false);

  const [printingPublicId, setPrintingPublicId] = useState<string | null>(null);

  const [printerError, setPrinterError] = useState<string | null>(null);

  const [printerMessage, setPrinterMessage] = useState<string | null>(null);

  /* ==========================================================
     RESTORE PRINTER
  ========================================================== */

  useEffect(() => {
    if (!printerSupported) {
      return;
    }

    let mounted = true;

    void restoreBluetoothPrinter()
      .then((restored) => {
        if (!mounted) {
          return;
        }

        setPrinterInfo(getBluetoothPrinterInfo());

        if (restored) {
          setPrinterMessage("RPP02N berhasil terhubung kembali.");
        }
      })
      .catch((restoreError) => {
        console.warn("Restore printer:", restoreError);

        if (!mounted) {
          return;
        }

        setPrinterInfo(EMPTY_PRINTER_INFO);
      })
      .finally(() => {
        if (mounted) {
          setRestoringPrinter(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [printerSupported]);

  /* ==========================================================
     MONITOR PHOTOBOOTH
  ========================================================== */

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "photobooth"),
      (snapshot) => {
        const items = snapshot.docs.map((snapshotDoc) => {
          const data = snapshotDoc.data();

          return {
            id: snapshotDoc.id,
            publicId:
              typeof data.publicId === "string" ? data.publicId : undefined,
          };
        });

        setActiveItems(items);
      },
      (snapshotError) => {
        console.error("Active photobooth archive map error:", snapshotError);
      },
    );

    return () => {
      unsubscribe();
    };
  }, []);

  /* ==========================================================
     LOAD ARCHIVE
  ========================================================== */

  useEffect(() => {
    const controller = new AbortController();

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setError("Sesi admin tidak ditemukan. Silakan login ulang.");

        setLoading(false);

        return;
      }

      void (async () => {
        try {
          const data = await fetchArchivePage(
            user,
            undefined,
            controller.signal,
          );

          if (controller.signal.aborted) {
            return;
          }

          setPhotos(data.resources);

          setNextCursor(data.nextCursor);

          setError(null);
        } catch (archiveError) {
          if (controller.signal.aborted) {
            return;
          }

          setError(
            archiveError instanceof Error
              ? archiveError.message
              : "Gagal memuat Private Photo Archive.",
          );
        } finally {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        }
      })();
    });

    return () => {
      controller.abort();
      unsubscribeAuth();
    };
  }, []);

  /* ==========================================================
     ACTIVE PHOTO MAP
  ========================================================== */

  const activeByPublicId = useMemo(() => {
    const map = new Map<string, string>();

    activeItems.forEach((item) => {
      if (item.publicId) {
        map.set(item.publicId, item.id);
      }
    });

    return map;
  }, [activeItems]);

  /* ==========================================================
     FILTERED PHOTOS
  ========================================================== */

  const filteredPhotos = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    if (!keyword) {
      return photos;
    }

    return photos.filter((photo) => {
      const fileName = photo.publicId.split("/").pop()?.toLowerCase() || "";

      const format = photo.format?.toLowerCase() || "";

      const date = formatArchiveDate(photo.createdAt).toLowerCase();

      return (
        photo.publicId.toLowerCase().includes(keyword) ||
        fileName.includes(keyword) ||
        format.includes(keyword) ||
        date.includes(keyword)
      );
    });
  }, [photos, searchQuery]);

  /* ==========================================================
     STATISTICS
  ========================================================== */

  const activePhotos = useMemo(() => {
    return photos.filter((photo) => activeByPublicId.has(photo.publicId))
      .length;
  }, [photos, activeByPublicId]);

  const archivedPhotos = useMemo(() => {
    return photos.filter((photo) => !activeByPublicId.has(photo.publicId))
      .length;
  }, [photos, activeByPublicId]);

  const todayPhotos = useMemo(() => {
    return photos.filter((photo) => isToday(photo.createdAt)).length;
  }, [photos]);

  /* ==========================================================
     PRINTER HELPERS
  ========================================================== */

  function updatePrinterInfo() {
    setPrinterInfo(getBluetoothPrinterInfo());
  }

  function clearPrinterMessages() {
    setPrinterError(null);
    setPrinterMessage(null);
  }

  function resetSearch() {
    setSearchQuery("");
  }

  /* ==========================================================
     CONNECT PRINTER
  ========================================================== */

  async function handleConnectPrinter() {
    if (connectingPrinter || printingPublicId) {
      return;
    }

    clearPrinterMessages();

    setConnectingPrinter(true);

    try {
      await connectBluetoothPrinter();

      updatePrinterInfo();

      setPrinterMessage("RPP02N berhasil terhubung. Foto siap dicetak.");
    } catch (connectError) {
      console.error("Connect thermal printer:", connectError);

      updatePrinterInfo();

      setPrinterError(
        connectError instanceof Error
          ? connectError.message
          : "Gagal menghubungkan printer.",
      );
    } finally {
      setConnectingPrinter(false);
    }
  }

  /* ==========================================================
     DISCONNECT PRINTER
  ========================================================== */

  async function handleDisconnectPrinter() {
    if (disconnectingPrinter || printingPublicId) {
      return;
    }

    clearPrinterMessages();

    setDisconnectingPrinter(true);

    try {
      await disconnectBluetoothPrinter();

      setPrinterInfo(EMPTY_PRINTER_INFO);

      setPrinterMessage("Printer berhasil diputuskan.");
    } catch (disconnectError) {
      console.error("Disconnect thermal printer:", disconnectError);

      setPrinterError("Gagal memutuskan printer.");
    } finally {
      setDisconnectingPrinter(false);
    }
  }

  /* ==========================================================
     TEST PRINTER
  ========================================================== */

  async function handleTestPrinter() {
    if (testingPrinter || printingPublicId) {
      return;
    }

    clearPrinterMessages();

    setTestingPrinter(true);

    try {
      if (!isBluetoothPrinterConnected()) {
        await connectBluetoothPrinter();

        updatePrinterInfo();
      }

      await testBluetoothPrinter();

      updatePrinterInfo();

      setPrinterMessage(
        "Tes printer berhasil. Jika kertas test keluar, koneksi BLE sudah benar.",
      );
    } catch (testError) {
      console.error("Thermal printer test error:", testError);

      updatePrinterInfo();

      setPrinterError(
        testError instanceof Error ? testError.message : "Tes printer gagal.",
      );
    } finally {
      setTestingPrinter(false);
    }
  }

  /* ==========================================================
     PRINT THERMAL PHOTO
  ========================================================== */

  async function handlePrintPhoto(photo: ArchivePhoto) {
    if (printingPublicId) {
      return;
    }

    clearPrinterMessages();

    setPrintingPublicId(photo.publicId);

    try {
      if (!isBluetoothPrinterConnected()) {
        await connectBluetoothPrinter();

        updatePrinterInfo();
      }

      await printBluetoothPhoto(photo.url, {
        widthDots: 384,
        dither: true,
        threshold: 128,
        feedLines: 4,
      });

      updatePrinterInfo();

      setPrinterMessage("Foto berhasil dikirim ke RPP02N.");
    } catch (printError) {
      console.error("Thermal photo print error:", printError);

      updatePrinterInfo();

      setPrinterError(
        printError instanceof Error
          ? printError.message
          : "Gagal mencetak foto.",
      );
    } finally {
      setPrintingPublicId(null);
    }
  }

  /* ==========================================================
     LOAD MORE
  ========================================================== */

  async function handleLoadMore() {
    if (!nextCursor || loadingMore) {
      return;
    }

    const currentUser = auth.currentUser;

    if (!currentUser) {
      setError("Sesi admin tidak ditemukan. Silakan login ulang.");

      return;
    }

    setLoadingMore(true);

    setError(null);

    try {
      const data = await fetchArchivePage(currentUser, nextCursor);

      setPhotos((currentPhotos) => {
        const existingPublicIds = new Set(
          currentPhotos.map((photo) => photo.publicId),
        );

        const newPhotos = data.resources.filter(
          (photo) => !existingPublicIds.has(photo.publicId),
        );

        return [...currentPhotos, ...newPhotos];
      });

      setNextCursor(data.nextCursor);
    } catch (loadMoreError) {
      setError(
        loadMoreError instanceof Error
          ? loadMoreError.message
          : "Gagal memuat foto lainnya.",
      );
    } finally {
      setLoadingMore(false);
    }
  }

  /* ==========================================================
     REFRESH
  ========================================================== */

  async function handleRefresh() {
    if (refreshing) {
      return;
    }

    const currentUser = auth.currentUser;

    if (!currentUser) {
      setError("Sesi admin tidak ditemukan. Silakan login ulang.");

      return;
    }

    setRefreshing(true);

    setError(null);

    try {
      const data = await fetchArchivePage(currentUser);

      setPhotos(data.resources);

      setNextCursor(data.nextCursor);
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Gagal memperbarui Private Photo Archive.",
      );
    } finally {
      setRefreshing(false);
    }
  }

  /* ==========================================================
     DOWNLOAD
  ========================================================== */

  async function handleDownload(photo: ArchivePhoto) {
    try {
      const response = await fetch(photo.url);

      if (!response.ok) {
        throw new Error("Gagal mengambil file.");
      }

      const blob = await response.blob();

      const blobUrl = URL.createObjectURL(blob);

      const anchor = document.createElement("a");

      const fileName = photo.publicId.split("/").pop() || "photobooth";

      anchor.href = blobUrl;

      anchor.download = `${fileName}.${photo.format || "jpg"}`;

      document.body.appendChild(anchor);

      anchor.click();

      document.body.removeChild(anchor);

      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(photo.url, "_blank", "noopener,noreferrer");
    }
  }

  /* ==========================================================
     DELETE PERMANENTLY
  ========================================================== */

  async function handlePermanentDelete(photo: ArchivePhoto) {
    const confirmed = window.confirm(
      `Hapus foto ini secara PERMANEN?\n\nFile akan dihapus dari Cloudinary dan tidak dapat dipulihkan melalui The Archive.`,
    );

    if (!confirmed) {
      return;
    }

    const currentUser = auth.currentUser;

    if (!currentUser) {
      setError("Sesi admin tidak ditemukan. Silakan login ulang.");

      return;
    }

    setDeletingPublicId(photo.publicId);

    setError(null);

    try {
      const idToken = await currentUser.getIdToken(true);

      const response = await fetch("/api/cloudinary/delete", {
        method: "DELETE",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },

        body: JSON.stringify({
          publicId: photo.publicId,
        }),

        cache: "no-store",
      });

      const data = (await response.json().catch(() => null)) as {
        success?: boolean;
        result?: string;
        message?: string;
      } | null;

      if (!response.ok) {
        throw new Error(
          data?.message || "Gagal menghapus foto dari Cloudinary.",
        );
      }

      const activeDocumentId = activeByPublicId.get(photo.publicId);

      if (activeDocumentId) {
        try {
          await deleteDoc(doc(db, "photobooth", activeDocumentId));
        } catch (firestoreDeleteError) {
          console.error(
            "Cloudinary deleted but Firestore cleanup failed:",
            firestoreDeleteError,
          );

          setPhotos((currentPhotos) =>
            currentPhotos.filter((item) => item.publicId !== photo.publicId),
          );

          throw new Error(
            "File Cloudinary sudah berhasil dihapus, tetapi record Monitoring Photobooth gagal dibersihkan. Refresh halaman lalu hapus record monitoring yang tersisa.",
          );
        }
      }

      setPhotos((currentPhotos) =>
        currentPhotos.filter((item) => item.publicId !== photo.publicId),
      );
    } catch (deleteError) {
      console.error("Permanent archive delete error:", deleteError);

      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Gagal menghapus foto permanen.",
      );
    } finally {
      setDeletingPublicId(null);
    }
  }

  /* ==========================================================
     RENDER
  ========================================================== */

  const printerConnected = printerInfo.connected;

  return (
    <MotionConfig
      reducedMotion={process.env.NODE_ENV === "production" ? "user" : "never"}
    >
      <div className="min-h-screen bg-[#08091F] px-4 pb-16 pt-8 text-white sm:px-6 lg:px-8">
        {/* ==================================================
            BACKGROUND ATMOSPHERE
        ================================================== */}

        <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
          <div className="absolute left-[10%] top-[8%] h-80 w-80 rounded-full bg-[#8B5CF6]/5 blur-[130px]" />

          <div className="absolute right-[5%] top-[28%] h-96 w-96 rounded-full bg-[#EC4899]/5 blur-[150px]" />

          <div className="absolute bottom-[5%] left-[35%] h-80 w-80 rounded-full bg-[#6366F1]/5 blur-[140px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-[1450px]">
          {/* ==================================================
              HEADER
          ================================================== */}

          <motion.header
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
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mb-8"
          >
            <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
              {/* TITLE */}

              <div>
                <div className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#D8B4FE]/65">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-[#C084FC]/20 bg-[#C084FC]/10 text-[#D8B4FE]">
                    <Archive size={12} />
                  </span>
                  The Archive · Photobooth
                </div>

                <h1 className="font-serif text-4xl leading-[0.95] tracking-tight text-white sm:text-5xl lg:text-[56px]">
                  Private
                  <br />
                  <span className="text-[#F3A9C7]">Photo Archive</span>
                </h1>

                <p className="mt-5 max-w-2xl text-sm leading-6 text-white/35">
                  Semua hasil Photobooth yang tersimpan di Cloudinary
                  dikumpulkan di sini sebagai ruang arsip pribadi dan pusat
                  pengelolaan kenangan.
                </p>
              </div>

              {/* HEADER ACTIONS */}

              <div className="flex flex-wrap items-center gap-2">
                {printerSupported && !restoringPrinter && (
                  <>
                    {printerConnected ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void handleTestPrinter()}
                          disabled={
                            testingPrinter ||
                            disconnectingPrinter ||
                            Boolean(printingPublicId)
                          }
                          className="
                            inline-flex
                            min-h-10
                            items-center
                            justify-center
                            gap-2
                            rounded-xl
                            border
                            border-white/[0.08]
                            bg-white/[0.025]
                            px-4
                            py-2.5
                            text-xs
                            font-semibold
                            text-white/65
                            backdrop-blur-xl
                            transition
                            hover:border-[#F3A9C7]/20
                            hover:bg-white/[0.05]
                            hover:text-white
                            disabled:cursor-not-allowed
                            disabled:opacity-40
                          "
                        >
                          {testingPrinter ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Printer size={14} />
                          )}

                          {testingPrinter ? "Mengetes..." : "Tes Printer"}
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleDisconnectPrinter()}
                          disabled={
                            disconnectingPrinter ||
                            testingPrinter ||
                            Boolean(printingPublicId)
                          }
                          className="
                            inline-flex
                            min-h-10
                            items-center
                            justify-center
                            gap-2
                            rounded-xl
                            border
                            border-emerald-400/10
                            bg-emerald-400/[0.04]
                            px-4
                            py-2.5
                            text-xs
                            font-semibold
                            text-emerald-300/70
                            transition
                            hover:border-emerald-400/20
                            hover:bg-emerald-400/[0.08]
                            hover:text-emerald-300
                            disabled:cursor-not-allowed
                            disabled:opacity-40
                          "
                        >
                          {disconnectingPrinter ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={14} />
                          )}

                          {printerInfo.deviceName || "RPP02N"}

                          <Unplug size={13} />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleConnectPrinter()}
                        disabled={connectingPrinter}
                        className="
                          inline-flex
                          min-h-10
                          items-center
                          justify-center
                          gap-2
                          rounded-xl
                          border
                          border-[#F3A9C7]/15
                          bg-[#F3A9C7]/[0.08]
                          px-4
                          py-2.5
                          text-xs
                          font-semibold
                          text-[#F3A9C7]
                          transition
                          hover:border-[#F3A9C7]/25
                          hover:bg-[#F3A9C7]/[0.13]
                          disabled:cursor-not-allowed
                          disabled:opacity-40
                        "
                      >
                        {connectingPrinter ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Bluetooth size={14} />
                        )}

                        {connectingPrinter
                          ? "Menghubungkan..."
                          : "Hubungkan Printer"}
                      </button>
                    )}
                  </>
                )}

                {restoringPrinter && (
                  <div
                    className="
                      inline-flex
                      min-h-10
                      items-center
                      justify-center
                      gap-2
                      rounded-xl
                      border
                      border-white/[0.08]
                      bg-white/[0.025]
                      px-4
                      py-2.5
                      text-xs
                      text-white/35
                    "
                  >
                    <Loader2 size={14} className="animate-spin" />
                    Mencari printer...
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void handleRefresh()}
                  disabled={refreshing || loading}
                  className="
                    inline-flex
                    min-h-10
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    border
                    border-white/[0.08]
                    bg-white/[0.025]
                    px-4
                    py-2.5
                    text-xs
                    font-semibold
                    text-white/60
                    backdrop-blur-xl
                    transition
                    hover:border-[#F3A9C7]/20
                    hover:bg-white/[0.05]
                    hover:text-white
                    disabled:cursor-not-allowed
                    disabled:opacity-40
                  "
                >
                  <RefreshCw
                    size={14}
                    className={refreshing ? "animate-spin" : ""}
                  />

                  {refreshing ? "Memperbarui..." : "Refresh Archive"}
                </button>
              </div>
            </div>

            {/* STATS */}

            <div className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <ArchiveStat
                icon={<ImageIcon size={14} />}
                label="Total Foto"
                value={photos.length}
              />

              <ArchiveStat
                icon={<CheckCircle2 size={14} />}
                label="Masih Tampil"
                value={activePhotos}
                accent
              />

              <ArchiveStat
                icon={<Archive size={14} />}
                label="Arsip Saja"
                value={archivedPhotos}
              />

              <ArchiveStat
                icon={<ImageIcon size={14} />}
                label="Hari Ini"
                value={todayPhotos}
              />
            </div>
          </motion.header>

          {/* ==================================================
              PRINTER STATUS
          ================================================== */}

          <AnimatePresence mode="wait">
            {printerSupported && (
              <motion.div
                key="printer"
                initial={{
                  opacity: 0,
                  y: -8,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  y: -8,
                }}
                className="
                  mb-5
                  rounded-2xl
                  border
                  border-white/[0.06]
                  bg-white/[0.02]
                  px-4
                  py-3.5
                  backdrop-blur-xl
                "
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        printerConnected
                          ? "border border-emerald-400/10 bg-emerald-400/[0.07] text-emerald-300"
                          : "border border-[#F3A9C7]/10 bg-[#F3A9C7]/[0.05] text-[#F3A9C7]"
                      }`}
                    >
                      <Printer size={15} />
                    </span>

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">
                        Thermal Printer
                      </p>

                      <p
                        className={`mt-0.5 text-[10px] ${
                          printerConnected
                            ? "text-emerald-300/60"
                            : "text-white/25"
                        }`}
                      >
                        {printerConnected
                          ? `${
                              printerInfo.deviceName || "RPP02N"
                            } siap mencetak foto thermal 58mm.`
                          : "RPP02N belum terhubung."}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.12em] ${
                      printerConnected
                        ? "border-emerald-400/10 bg-emerald-400/[0.05] text-emerald-300/65"
                        : "border-white/[0.07] bg-white/[0.025] text-white/25"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        printerConnected ? "bg-emerald-400" : "bg-white/20"
                      }`}
                    />

                    {printerConnected ? "Connected" : "Disconnected"}
                  </div>
                </div>

                {printerConnected && printerInfo.characteristicUuid && (
                  <p className="mt-3 break-all border-t border-white/[0.04] pt-3 font-mono text-[9px] text-white/15">
                    BLE Write: {printerInfo.characteristicUuid}
                  </p>
                )}
              </motion.div>
            )}

            {!printerSupported && (
              <motion.div
                key="unsupported"
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: 1,
                }}
                className="
                  mb-5
                  rounded-2xl
                  border
                  border-amber-400/10
                  bg-amber-400/[0.04]
                  px-4
                  py-3.5
                  text-[10px]
                  leading-5
                  text-amber-200/55
                "
              >
                <span className="font-semibold text-amber-200/75">
                  Web Bluetooth tidak tersedia.
                </span>{" "}
                Gunakan Google Chrome terbaru untuk mencetak menggunakan RPP02N.
              </motion.div>
            )}
          </AnimatePresence>

          {/* ==================================================
              MESSAGES
          ================================================== */}

          <AnimatePresence mode="wait">
            {error ? (
              <motion.div
                key="error"
                initial={{
                  opacity: 0,
                  y: -8,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  y: -8,
                }}
                className="
                  mb-5
                  flex
                  items-start
                  justify-between
                  gap-4
                  rounded-2xl
                  border
                  border-red-400/15
                  bg-red-500/[0.05]
                  px-4
                  py-3.5
                  text-xs
                  text-red-300/80
                  backdrop-blur-xl
                "
              >
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400" />

                  <p>{error}</p>
                </div>

                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="shrink-0 text-white/25 transition hover:text-white"
                  aria-label="Tutup error"
                >
                  <X size={15} />
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="info"
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: 1,
                }}
                className="
                  mb-7
                  flex
                  flex-col
                  gap-3
                  rounded-2xl
                  border
                  border-white/[0.06]
                  bg-white/[0.02]
                  px-4
                  py-3.5
                  sm:flex-row
                  sm:items-center
                "
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#F3A9C7]/10 bg-[#F3A9C7]/5 text-[#F3A9C7]">
                  <Archive size={14} />
                </span>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">
                    Private Collection
                  </p>

                  <p className="mt-0.5 text-[10px] leading-5 text-white/25">
                    Archive ini berisi file foto yang masih tersimpan di
                    Cloudinary, termasuk foto yang sudah tidak tampil pada
                    halaman Photobooth.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* PRINTER MESSAGE */}

          <AnimatePresence>
            {printerMessage && (
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
                className="mb-5 overflow-hidden"
              >
                <div className="rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.04] px-4 py-3 text-[10px] text-emerald-300/70">
                  {printerMessage}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* PRINTER ERROR */}

          <AnimatePresence>
            {printerError && (
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
                className="mb-5 overflow-hidden"
              >
                <div className="rounded-2xl border border-red-400/10 bg-red-400/[0.04] px-4 py-3 text-[10px] text-red-300/70">
                  {printerError}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ==================================================
              COLLECTION HEADER
          ================================================== */}

          <motion.section
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.5,
              delay: 0.08,
            }}
          >
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              {/* TITLE */}

              <div>
                <div className="mb-1 flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#F3A9C7]/50">
                  <ImageIcon size={11} />
                  Collection
                </div>

                <h2 className="font-serif text-2xl text-white/90">
                  Photobooth Memories
                </h2>

                <p className="mt-1 text-[10px] text-white/25">
                  Kelola, download, cetak, atau hapus foto dari private archive.
                </p>
              </div>

              {/* SEARCH */}

              <div className="relative w-full lg:w-[300px]">
                <Search
                  size={14}
                  className="
                    pointer-events-none
                    absolute
                    left-3.5
                    top-1/2
                    -translate-y-1/2
                    text-white/20
                  "
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
                    pr-10
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

                {searchQuery && (
                  <button
                    type="button"
                    onClick={resetSearch}
                    className="
                      absolute
                      right-2.5
                      top-1/2
                      flex
                      h-6
                      w-6
                      -translate-y-1/2
                      items-center
                      justify-center
                      rounded-full
                      text-white/25
                      transition
                      hover:bg-white/[0.05]
                      hover:text-white/60
                    "
                    aria-label="Hapus pencarian"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* COLLECTION LINE */}

            <div className="mb-5 flex items-center gap-3">
              <span className="text-[9px] uppercase tracking-[0.16em] text-white/20">
                {searchQuery
                  ? `${filteredPhotos.length} Results`
                  : `${photos.length} Photos`}
              </span>

              <div className="h-px flex-1 bg-white/[0.05]" />

              <span className="text-[9px] uppercase tracking-[0.16em] text-[#F3A9C7]/35">
                The Archive
              </span>
            </div>
          </motion.section>

          {/* ==================================================
              PRINT INFO
          ================================================== */}

          {printerSupported && printerConnected && (
            <motion.div
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              className="
                mb-5
                flex
                items-center
                gap-3
                rounded-2xl
                border
                border-white/[0.06]
                bg-white/[0.015]
                px-4
                py-3
              "
            >
              <Printer size={13} className="shrink-0 text-[#F3A9C7]/50" />

              <p className="text-[9px] leading-5 text-white/25">
                <span className="font-semibold text-white/45">
                  Thermal Print:
                </span>{" "}
                foto akan diubah menjadi grayscale + dithering 384 dots sebelum
                dikirim melalui BLE ke RPP02N.
              </p>
            </motion.div>
          )}

          {/* ==================================================
              DELETE WARNING
          ================================================== */}

          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            transition={{
              delay: 0.12,
            }}
            className="
              mb-7
              flex
              items-center
              gap-3
              rounded-2xl
              border
              border-amber-400/[0.08]
              bg-amber-400/[0.025]
              px-4
              py-3
            "
          >
            <Trash2 size={13} className="shrink-0 text-amber-300/45" />

            <p className="text-[9px] leading-5 text-amber-200/35">
              <span className="font-semibold text-amber-200/55">
                Permanent Delete:
              </span>{" "}
              menghapus file secara permanen dari Cloudinary. Gunakan hanya jika
              foto benar-benar tidak ingin disimpan lagi.
            </p>
          </motion.div>

          {/* ==================================================
              CONTENT
          ================================================== */}

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <ArchiveSkeletonCard key={index} />
              ))}
            </div>
          ) : photos.length === 0 ? (
            <EmptyArchiveState />
          ) : filteredPhotos.length === 0 ? (
            <SearchEmptyState searchQuery={searchQuery} onReset={resetSearch} />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                <AnimatePresence mode="popLayout">
                  {filteredPhotos.map((photo, index) => (
                    <ArchivePhotoCard
                      key={photo.publicId}
                      photo={photo}
                      index={index}
                      isActive={activeByPublicId.has(photo.publicId)}
                      isPrinting={printingPublicId === photo.publicId}
                      isDeleting={deletingPublicId === photo.publicId}
                      printerSupported={printerSupported}
                      printerBusy={Boolean(printingPublicId) || testingPrinter}
                      onDownload={handleDownload}
                      onPrint={handlePrintPhoto}
                      onDelete={handlePermanentDelete}
                    />
                  ))}
                </AnimatePresence>
              </div>

              {/* ==================================================
                  LOAD MORE
              ================================================== */}

              {nextCursor && !searchQuery && (
                <motion.div
                  initial={{
                    opacity: 0,
                    y: 10,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  className="mt-8 flex justify-center"
                >
                  <button
                    type="button"
                    onClick={() => void handleLoadMore()}
                    disabled={loadingMore}
                    className="
                      inline-flex
                      items-center
                      justify-center
                      gap-2
                      rounded-full
                      border
                      border-white/[0.08]
                      bg-white/[0.025]
                      px-6
                      py-3
                      text-[9px]
                      font-semibold
                      uppercase
                      tracking-[0.14em]
                      text-white/45
                      transition
                      hover:border-[#F3A9C7]/20
                      hover:bg-[#F3A9C7]/[0.05]
                      hover:text-[#F3A9C7]/80
                      disabled:cursor-not-allowed
                      disabled:opacity-40
                    "
                  >
                    {loadingMore ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Archive size={13} />
                    )}

                    {loadingMore ? "Memuat..." : "Muat Foto Lainnya"}
                  </button>
                </motion.div>
              )}
            </>
          )}

          {/* ==================================================
              FOOTER
          ================================================== */}

          {!loading && photos.length > 0 && (
            <motion.div
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              transition={{
                delay: 0.3,
              }}
              className="mt-8 flex items-center justify-center gap-3"
            >
              <span
                className="
                  h-px
                  w-10
                  bg-gradient-to-r
                  from-transparent
                  to-white/[0.08]
                "
              />

              <span
                className="
                  text-[8px]
                  uppercase
                  tracking-[0.2em]
                  text-[#A98B9B]/25
                "
              >
                {filteredPhotos.length} dari {photos.length} foto
              </span>

              <span
                className="
                  h-px
                  w-10
                  bg-gradient-to-l
                  from-transparent
                  to-white/[0.08]
                "
              />
            </motion.div>
          )}
        </div>
      </div>
    </MotionConfig>
  );
}

/* ============================================================
   STAT
============================================================ */

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
    <div
      className="
        min-w-[105px]
        rounded-2xl
        border
        border-white/[0.07]
        bg-white/[0.025]
        px-4
        py-3
        backdrop-blur-xl
      "
    >
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

/* ============================================================
   PHOTO CARD
============================================================ */

interface ArchivePhotoCardProps {
  photo: ArchivePhoto;
  index: number;
  isActive: boolean;
  isPrinting: boolean;
  isDeleting: boolean;
  printerSupported: boolean;
  printerBusy: boolean;
  onDownload: (photo: ArchivePhoto) => void;
  onPrint: (photo: ArchivePhoto) => void;
  onDelete: (photo: ArchivePhoto) => void;
}

function ArchivePhotoCard({
  photo,
  index,
  isActive,
  isPrinting,
  isDeleting,
  printerSupported,
  printerBusy,
  onDownload,
  onPrint,
  onDelete,
}: ArchivePhotoCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <motion.article
      layout
      initial={{
        opacity: 0,
        y: 15,
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
        duration: 0.35,
        delay: Math.min(index * 0.035, 0.25),
      }}
      className="
        group
        relative
        overflow-hidden
        rounded-[24px]
        border
        border-white/[0.07]
        bg-[#0D0E28]/75
        shadow-[0_15px_50px_rgba(0,0,0,0.18)]
        backdrop-blur-xl
        transition-all
        duration-500
        hover:-translate-y-1
        hover:border-[#F3A9C7]/15
        hover:bg-[#10112D]
        hover:shadow-[0_25px_65px_rgba(0,0,0,0.28)]
      "
    >
      {/* ==================================================
          CARD ATMOSPHERE
      ================================================== */}

      <div
        className="
          pointer-events-none
          absolute
          -right-20
          -top-20
          h-40
          w-40
          rounded-full
          bg-[#D86D9E]/[0.05]
          blur-[60px]
          transition
          duration-500
          group-hover:bg-[#D86D9E]/[0.12]
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          bottom-0
          left-0
          h-px
          w-full
          bg-gradient-to-r
          from-transparent
          via-[#F3A9C7]/30
          to-transparent
          opacity-0
          transition
          duration-500
          group-hover:opacity-100
        "
      />

      <div className="relative p-3">
        {/* ==================================================
            IMAGE / PREVIEW
        ================================================== */}

        <div
          className="
            relative
            flex
            h-[560px]
            w-full
            items-center
            justify-center
            overflow-hidden
            rounded-[18px]
            bg-[#090A21]
          "
        >
          {!imageLoaded && (
            <div
              className="
                absolute
                inset-0
                z-10
                flex
                animate-pulse
                items-center
                justify-center
                bg-white/[0.025]
              "
            >
              <ImageIcon size={22} className="text-white/10" />
            </div>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.url}
            alt="Private Photobooth archive"
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            className={`
              block
              h-full
              w-full
              object-contain
              transition-all
              duration-700
              ${imageLoaded ? "opacity-100" : "opacity-0"}
            `}
          />

          {/* ==================================================
              TOP STATUS
          ================================================== */}

          <div className="absolute left-3 top-3">
            <span
              className={`
                inline-flex
                items-center
                gap-1.5
                rounded-full
                border
                px-2.5
                py-1
                text-[7px]
                font-semibold
                uppercase
                tracking-[0.1em]
                backdrop-blur-xl
                ${
                  isActive
                    ? "border-emerald-400/15 bg-[#071B15]/75 text-emerald-300/80"
                    : "border-white/[0.08] bg-[#08091F]/75 text-white/45"
                }
              `}
            >
              <span
                className={`
                  h-1.5
                  w-1.5
                  rounded-full
                  ${isActive ? "bg-emerald-400" : "bg-white/25"}
                `}
              />

              {isActive ? "Masih Tampil" : "Arsip Saja"}
            </span>
          </div>

          {/* ==================================================
              FORMAT
          ================================================== */}

          <div className="absolute right-3 top-3">
            <span
              className="
                rounded-full
                border
                border-white/[0.08]
                bg-[#08091F]/70
                px-2.5
                py-1
                text-[7px]
                uppercase
                tracking-[0.1em]
                text-white/35
                backdrop-blur-xl
              "
            >
              {photo.format || "image"}
            </span>
          </div>

          {/* ==================================================
              PRINTING OVERLAY
          ================================================== */}

          <AnimatePresence>
            {isPrinting && (
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
                  absolute
                  inset-0
                  z-20
                  flex
                  flex-col
                  items-center
                  justify-center
                  bg-[#08091F]/80
                  text-white
                  backdrop-blur-md
                "
              >
                <div
                  className="
                    flex
                    h-12
                    w-12
                    items-center
                    justify-center
                    rounded-2xl
                    border
                    border-[#F3A9C7]/15
                    bg-[#F3A9C7]/[0.07]
                    text-[#F3A9C7]
                  "
                >
                  <Loader2 size={20} className="animate-spin" />
                </div>

                <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/80">
                  Mencetak Foto
                </p>

                <p className="mt-1 text-[8px] text-white/30">
                  Jangan matikan printer
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ==================================================
            CONTENT
        ================================================== */}

        <div className="px-1 pb-1 pt-4">
          {/* DATE */}

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[11px] font-medium text-white/70">
                {formatArchiveDate(photo.createdAt)}
              </p>

              <p className="mt-1 text-[8px] text-white/20">
                {photo.width && photo.height
                  ? `${photo.width} × ${photo.height}`
                  : "Ukuran tidak tersedia"}

                {" · "}

                {formatBytes(photo.bytes)}
              </p>
            </div>

            <span
              className="
                shrink-0
                rounded-lg
                border
                border-white/[0.06]
                bg-white/[0.025]
                px-2
                py-1
                text-[7px]
                uppercase
                tracking-[0.08em]
                text-white/20
              "
            >
              PHOTO
            </span>
          </div>

          {/* DIVIDER */}

          <div className="my-3 h-px bg-white/[0.05]" />

          {/* ACTIONS */}

          <div className="grid grid-cols-2 gap-2">
            {/* DOWNLOAD */}

            <button
              type="button"
              onClick={() => onDownload(photo)}
              disabled={isPrinting || isDeleting}
              className="
                flex
                min-h-9
                items-center
                justify-center
                gap-1.5
                rounded-xl
                border
                border-white/[0.07]
                bg-white/[0.025]
                px-3
                py-2.5
                text-[9px]
                font-semibold
                uppercase
                tracking-[0.08em]
                text-white/45
                transition
                hover:border-[#F3A9C7]/15
                hover:bg-[#F3A9C7]/[0.04]
                hover:text-[#F3A9C7]/75
                disabled:cursor-not-allowed
                disabled:opacity-30
              "
            >
              <Download size={12} />
              Download
            </button>

            {/* PRINT */}

            <button
              type="button"
              onClick={() => onPrint(photo)}
              disabled={Boolean(printerBusy) || isDeleting || !printerSupported}
              className="
                flex
                min-h-9
                items-center
                justify-center
                gap-1.5
                rounded-xl
                border
                border-[#F3A9C7]/15
                bg-[#F3A9C7]/[0.07]
                px-3
                py-2.5
                text-[9px]
                font-semibold
                uppercase
                tracking-[0.08em]
                text-[#F3A9C7]/75
                transition
                hover:border-[#F3A9C7]/25
                hover:bg-[#F3A9C7]/[0.12]
                hover:text-[#F3A9C7]
                disabled:cursor-not-allowed
                disabled:opacity-25
              "
            >
              {isPrinting ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Printer size={12} />
              )}

              {isPrinting ? "Mencetak..." : "Cetak"}
            </button>

            {/* DELETE */}

            <button
              type="button"
              onClick={() => onDelete(photo)}
              disabled={isDeleting || Boolean(printingPublicIdGlobal())}
              className="
                col-span-2
                flex
                min-h-9
                items-center
                justify-center
                gap-1.5
                rounded-xl
                border
                border-red-400/10
                bg-red-400/[0.025]
                px-3
                py-2.5
                text-[9px]
                font-semibold
                uppercase
                tracking-[0.08em]
                text-red-300/40
                transition
                hover:border-red-400/20
                hover:bg-red-400/[0.06]
                hover:text-red-300/80
                disabled:cursor-not-allowed
                disabled:opacity-25
              "
            >
              {isDeleting ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Trash2 size={12} />
              )}

              {isDeleting ? "Menghapus..." : "Hapus Permanen"}
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

/*
 * Dummy helper hanya digunakan untuk menjaga tombol delete
 * tetap disabled ketika card sedang printing.
 *
 * Status printing sebenarnya dikontrol parent melalui
 * printerBusy. Fungsi ini selalu false agar card lain
 * tidak ikut ter-disable secara global.
 */
function printingPublicIdGlobal() {
  return false;
}

/* ============================================================
   SKELETON
============================================================ */

function ArchiveSkeletonCard() {
  return (
    <div
      className="
        overflow-hidden
        rounded-[24px]
        border
        border-white/[0.06]
        bg-[#0D0E28]/70
      "
    >
      <div className="p-3">
        <div className="aspect-[4/5] animate-pulse rounded-[18px] bg-white/[0.035]" />

        <div className="px-1 pb-1 pt-4">
          <div className="h-3 w-32 animate-pulse rounded bg-white/[0.06]" />

          <div className="mt-2 h-2 w-24 animate-pulse rounded bg-white/[0.035]" />

          <div className="my-3 h-px bg-white/[0.04]" />

          <div className="grid grid-cols-2 gap-2">
            <div className="h-9 animate-pulse rounded-xl bg-white/[0.035]" />

            <div className="h-9 animate-pulse rounded-xl bg-white/[0.035]" />

            <div className="col-span-2 h-9 animate-pulse rounded-xl bg-white/[0.035]" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   EMPTY ARCHIVE
============================================================ */

function EmptyArchiveState() {
  return (
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
        min-h-[420px]
        flex-col
        items-center
        justify-center
        rounded-[28px]
        border
        border-dashed
        border-white/[0.08]
        bg-white/[0.015]
        px-6
        text-center
      "
    >
      <div
        className="
          flex
          h-16
          w-16
          items-center
          justify-center
          rounded-2xl
          border
          border-[#F3A9C7]/10
          bg-[#F3A9C7]/5
          text-[#F3A9C7]/60
        "
      >
        <Archive size={23} />
      </div>

      <p className="mt-5 font-serif text-xl text-white/80">
        Private archive masih kosong
      </p>

      <p className="mt-2 max-w-sm text-xs leading-5 text-white/25">
        Hasil Photobooth yang tersimpan di Cloudinary akan otomatis muncul di
        ruang arsip ini.
      </p>
    </motion.div>
  );
}

/* ============================================================
   SEARCH EMPTY
============================================================ */

function SearchEmptyState({
  searchQuery,
  onReset,
}: {
  searchQuery: string;
  onReset: () => void;
}) {
  return (
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
        min-h-[330px]
        flex-col
        items-center
        justify-center
        rounded-[28px]
        border
        border-white/[0.07]
        bg-white/[0.015]
        px-6
        text-center
      "
    >
      <div
        className="
          flex
          h-14
          w-14
          items-center
          justify-center
          rounded-full
          border
          border-white/[0.07]
          bg-white/[0.025]
          text-white/30
        "
      >
        <Search size={18} />
      </div>

      <p className="mt-4 font-serif text-lg text-white/75">
        Foto tidak ditemukan
      </p>

      <p className="mt-1 text-xs text-white/25">
        Tidak ada hasil untuk &quot;{searchQuery}&quot;.
      </p>

      <button
        type="button"
        onClick={onReset}
        className="
          mt-5
          rounded-xl
          border
          border-[#F3A9C7]/15
          bg-[#F3A9C7]/5
          px-4
          py-2
          text-[9px]
          font-semibold
          uppercase
          tracking-[0.1em]
          text-[#F3A9C7]/65
          transition
          hover:border-[#F3A9C7]/25
          hover:bg-[#F3A9C7]/10
          hover:text-[#F3A9C7]
        "
      >
        Reset Pencarian
      </button>
    </motion.div>
  );
}
