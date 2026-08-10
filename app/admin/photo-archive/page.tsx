"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Bluetooth,
  CheckCircle2,
  Download,
  Loader2,
  Printer,
  RefreshCw,
  Trash2,
  Unplug,
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

/**
 * Mengambil satu halaman archive.
 */
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

export default function PhotoArchivePage() {
  const [photos, setPhotos] = useState<ArchivePhoto[]>([]);

  const [activeItems, setActiveItems] = useState<ActivePhotoboothItem[]>([]);

  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  const [loadingMore, setLoadingMore] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const [deletingPublicId, setDeletingPublicId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  /**
   * ============================================
   * PRINTER STATE
   * ============================================
   */

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

  /**
   * ============================================
   * RESTORE PRINTER
   * ============================================
   */

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

  /**
   * ============================================
   * MONITOR PHOTOBOOTH
   * ============================================
   */

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

  /**
   * ============================================
   * LOAD ARCHIVE
   * ============================================
   */

  useEffect(() => {
    const controller = new AbortController();

    const unsubscribeAuth = onAuthStateChanged(
      auth,

      (user) => {
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
      },
    );

    return () => {
      controller.abort();

      unsubscribeAuth();
    };
  }, []);

  /**
   * ============================================
   * ACTIVE PHOTO MAP
   * ============================================
   */

  const activeByPublicId = useMemo(() => {
    const map = new Map<string, string>();

    activeItems.forEach((item) => {
      if (item.publicId) {
        map.set(item.publicId, item.id);
      }
    });

    return map;
  }, [activeItems]);

  /**
   * ============================================
   * PRINTER HELPERS
   * ============================================
   */

  function updatePrinterInfo() {
    setPrinterInfo(getBluetoothPrinterInfo());
  }

  function clearPrinterMessages() {
    setPrinterError(null);

    setPrinterMessage(null);
  }

  /**
   * ============================================
   * CONNECT PRINTER
   * ============================================
   */

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

  /**
   * ============================================
   * DISCONNECT PRINTER
   * ============================================
   */

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

  /**
   * ============================================
   * TEST PRINTER
   * ============================================
   */

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

  /**
   * ============================================
   * PRINT THERMAL PHOTO
   * ============================================
   */

  async function handlePrintPhoto(photo: ArchivePhoto) {
    if (printingPublicId) {
      return;
    }

    clearPrinterMessages();

    setPrintingPublicId(photo.publicId);

    try {
      /**
       * Kalau printer belum terhubung,
       * chooser Bluetooth langsung muncul
       * dari tombol Cetak Thermal.
       */
      if (!isBluetoothPrinterConnected()) {
        await connectBluetoothPrinter();

        updatePrinterInfo();
      }

      /**
       * ========================================
       * FINAL PHOTO CONFIG
       * ========================================
       *
       * 384 dots:
       * full printable width RPP02N.
       *
       * threshold 128:
       * lebih terang daripada hasil sebelumnya.
       *
       * dither:
       * mempertahankan detail wajah.
       */
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

  /**
   * ============================================
   * LOAD MORE
   * ============================================
   */

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

  /**
   * ============================================
   * REFRESH ARCHIVE
   * ============================================
   */

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

  /**
   * ============================================
   * DOWNLOAD PHOTO
   * ============================================
   */

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

  /**
   * ============================================
   * DELETE PHOTO
   * ============================================
   */

  async function handlePermanentDelete(photo: ArchivePhoto) {
    const confirmed = window.confirm(
      `Hapus foto ini secara PERMANEN?

File akan dihapus dari Cloudinary dan tidak dapat dipulihkan melalui The Archive.`,
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
      /**
       * Hapus Cloudinary TERLEBIH DAHULU.
       *
       * Sebelumnya Firestore dihapus lebih dulu.
       * Kalau API Cloudinary gagal, record monitoring sudah telanjur
       * hilang walaupun file Cloudinary masih ada.
       */
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

      /**
       * Setelah Cloudinary berhasil / file memang sudah tidak ada,
       * bersihkan record Photobooth aktif jika masih tersedia.
       */
      const activeDocumentId = activeByPublicId.get(photo.publicId);

      if (activeDocumentId) {
        try {
          await deleteDoc(doc(db, "photobooth", activeDocumentId));
        } catch (firestoreDeleteError) {
          console.error(
            "Cloudinary deleted but Firestore cleanup failed:",
            firestoreDeleteError,
          );

          /**
           * File permanen sudah berhasil dihapus.
           * Tetap keluarkan dari archive UI, tetapi beritahu admin
           * kalau record monitoring perlu dibersihkan.
           */
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

  const printerConnected = printerInfo.connected;

  return (
    <div className="p-4 pt-20 sm:p-6 sm:pt-20 lg:p-8">
      {/* =========================
          HEADER
      ========================== */}
      <div className="mb-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#3B2E52] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
            Private
          </span>

          <span className="text-xs text-[#6D4FC2]/50">Admin only</span>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#3B2E52] sm:text-3xl">
              Private Photo Archive
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6D4FC2]/60">
              Semua hasil Photobooth yang masih tersimpan di Cloudinary berada
              di sini, termasuk foto yang sudah dihapus dari halaman user maupun
              Monitoring Photobooth.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* PRINTER */}
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
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#D8C8F0] bg-white/80 px-4 py-2.5 text-xs font-semibold text-[#6D4FC2] transition hover:bg-[#F5F1FA] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {testingPrinter ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Printer size={15} />
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
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {disconnectingPrinter ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={15} />
                      )}

                      {printerInfo.deviceName || "RPP02N"}

                      <Unplug size={14} />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleConnectPrinter()}
                    disabled={connectingPrinter}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#6D4FC2] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#5940A7] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {connectingPrinter ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Bluetooth size={15} />
                    )}

                    {connectingPrinter
                      ? "Menghubungkan..."
                      : "Hubungkan Printer"}
                  </button>
                )}
              </>
            )}

            {restoringPrinter && (
              <div className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#D8C8F0] bg-white/70 px-4 py-2.5 text-xs text-[#6D4FC2]/60">
                <Loader2 size={14} className="animate-spin" />
                Mencari printer...
              </div>
            )}

            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={refreshing || loading}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#D8C8F0] bg-white/70 px-4 py-2.5 text-xs font-semibold text-[#6D4FC2] transition hover:bg-[#E9D8FD]/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={14}
                className={refreshing ? "animate-spin" : ""}
              />

              {refreshing ? "Memperbarui..." : "Refresh Archive"}
            </button>
          </div>
        </div>
      </div>

      {/* =========================
          PRINTER STATUS
      ========================== */}
      {printerSupported && (
        <div
          className={`mb-6 rounded-2xl border px-4 py-4 ${
            printerConnected
              ? "border-emerald-200 bg-emerald-50/70"
              : "border-[#D8C8F0]/70 bg-white/50"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                printerConnected
                  ? "bg-emerald-100 text-emerald-600"
                  : "bg-[#E9D8FD] text-[#6D4FC2]"
              }`}
            >
              <Printer size={18} />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#3B2E52]">
                Thermal Photo Printer
              </p>

              {printerConnected ? (
                <p className="mt-0.5 text-xs text-emerald-700">
                  {printerInfo.deviceName || "RPP02N"} siap mencetak foto
                  thermal 58mm.
                </p>
              ) : (
                <p className="mt-0.5 text-xs leading-5 text-[#3B2E52]/55">
                  Hubungkan RPP02N untuk mencetak foto langsung dari archive.
                </p>
              )}

              {printerConnected && printerInfo.characteristicUuid && (
                <p className="mt-1 break-all font-mono text-[10px] text-[#3B2E52]/35">
                  BLE Write: {printerInfo.characteristicUuid}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {!printerSupported && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-xs leading-5 text-amber-800">
          Web Bluetooth tidak tersedia pada browser ini. Gunakan Google Chrome
          terbaru untuk mencetak menggunakan RPP02N.
        </div>
      )}

      {/* =========================
          PRINT INFO
      ========================== */}
      <div className="mb-6 rounded-2xl border border-blue-200/70 bg-blue-50/70 px-4 py-4 text-xs leading-5 text-blue-800">
        <span className="font-semibold">Cetak Thermal:</span> gunakan tombol
        <span className="font-semibold"> Tes Printer</span> terlebih dahulu.
        Setelah test berhasil, foto akan diubah menjadi grayscale + dithering
        dan dikirim ke RPP02N dengan aliran BLE yang diperlambat agar buffer
        printer tidak overload.
      </div>

      {/* =========================
          DELETE WARNING
      ========================== */}
      <div className="mb-6 rounded-2xl border border-amber-200/80 bg-amber-50 px-4 py-4 text-xs leading-5 text-amber-800">
        <span className="font-semibold">Hapus Permanen</span> benar-benar
        menghapus file dari Cloudinary. Gunakan hanya jika foto memang sudah
        tidak ingin disimpan sebagai kenangan.
      </div>

      {/* =========================
          PRINTER ERROR
      ========================== */}
      {printerError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {printerError}
        </div>
      )}

      {/* =========================
          PRINTER MESSAGE
      ========================== */}
      {printerMessage && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {printerMessage}
        </div>
      )}

      {/* =========================
          ARCHIVE ERROR
      ========================== */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* =========================
          LOADING
      ========================== */}
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

              <div className="mt-3 h-3 w-28 rounded bg-[#E9D8FD]" />

              <div className="mt-2 h-3 w-20 rounded bg-[#E9D8FD]/70" />

              <div className="mt-4 h-9 rounded-lg bg-[#E9D8FD]/70" />
            </div>
          ))}
        </div>
      ) : photos.length === 0 ? (
        /* =========================
            EMPTY
        ========================== */
        <div className="rounded-2xl border-2 border-dashed border-[#D8C8F0] bg-white/35 px-6 py-16 text-center">
          <p className="text-3xl">🗃️</p>

          <p className="mt-3 text-sm font-medium text-[#3B2E52]">
            Private archive masih kosong
          </p>

          <p className="mt-1 text-xs text-[#3B2E52]/50">
            Hasil Photobooth baru akan otomatis tersimpan di sini melalui
            Cloudinary.
          </p>
        </div>
      ) : (
        <>
          {/* =========================
              PHOTO GRID
          ========================== */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {photos.map((photo) => {
              const isActive = activeByPublicId.has(photo.publicId);

              const isPrinting = printingPublicId === photo.publicId;

              const isDeleting = deletingPublicId === photo.publicId;

              return (
                <article
                  key={photo.publicId}
                  className="overflow-hidden rounded-2xl border border-[#D8C8F0]/35 bg-white/75 p-3 shadow-sm backdrop-blur-sm"
                >
                  {/* PHOTO */}
                  <div className="relative overflow-hidden rounded-xl bg-[#F5F1FA]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt="Private Photobooth archive"
                      className="h-auto w-full"
                      loading="lazy"
                    />

                    {/* PRINT OVERLAY */}
                    {isPrinting && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#3B2E52]/75 text-white backdrop-blur-sm">
                        <Loader2 size={26} className="animate-spin" />

                        <p className="mt-3 text-xs font-semibold">
                          Mencetak foto...
                        </p>

                        <p className="mt-1 text-[10px] text-white/70">
                          Jangan matikan printer
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="px-1 pb-1 pt-3">
                    {/* STATUS */}
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                          isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-[#F5F1FA] text-[#6D4FC2]/65"
                        }`}
                      >
                        {isActive ? "Masih tampil" : "Arsip saja"}
                      </span>

                      <span className="text-[10px] uppercase text-[#3B2E52]/35">
                        {photo.format || "image"}
                      </span>
                    </div>

                    {/* DATE */}
                    <p className="text-xs leading-5 text-[#3B2E52]/55">
                      {formatArchiveDate(photo.createdAt)}
                    </p>

                    {/* SIZE */}
                    <p className="mt-1 text-[11px] text-[#3B2E52]/35">
                      {photo.width && photo.height
                        ? `${photo.width} × ${photo.height}`
                        : "Ukuran tidak tersedia"}

                      {" · "}

                      {formatBytes(photo.bytes)}
                    </p>

                    {/* =========================
                          ACTIONS
                      ========================== */}
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {/* DOWNLOAD */}
                      <button
                        type="button"
                        onClick={() => void handleDownload(photo)}
                        disabled={isPrinting}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-[#D8C8F0] bg-white px-3 py-2.5 text-xs font-medium text-[#6D4FC2] transition hover:bg-[#F5F1FA] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Download size={14} />
                        Download
                      </button>

                      {/* PRINT */}
                      <button
                        type="button"
                        onClick={() => void handlePrintPhoto(photo)}
                        disabled={
                          Boolean(printingPublicId) ||
                          testingPrinter ||
                          !printerSupported
                        }
                        className="flex items-center justify-center gap-1.5 rounded-lg bg-[#6D4FC2] px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-[#5940A7] disabled:cursor-not-allowed disabled:bg-[#D8C8F0] disabled:text-[#6D4FC2]/50"
                      >
                        {isPrinting ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Printer size={14} />
                        )}

                        {isPrinting ? "Mencetak..." : "Cetak Thermal"}
                      </button>

                      {/* DELETE */}
                      <button
                        type="button"
                        onClick={() => void handlePermanentDelete(photo)}
                        disabled={isDeleting || Boolean(printingPublicId)}
                        className="col-span-2 flex items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 py-2.5 text-xs font-medium text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isDeleting ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}

                        {isDeleting ? "Menghapus..." : "Hapus Permanen"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* =========================
              PAGINATION
          ========================== */}
          {nextCursor && (
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => void handleLoadMore()}
                disabled={loadingMore}
                className="rounded-full border border-[#D8C8F0] bg-white/70 px-6 py-3 text-sm font-medium text-[#6D4FC2] transition hover:bg-[#E9D8FD]/55 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingMore ? "Memuat..." : "Muat Foto Lainnya"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
