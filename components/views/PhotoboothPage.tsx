"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

import {
  Camera,
  Check,
  Download,
  Images,
  Loader2,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";

import { db } from "@/lib/firebase";

import ArchiveShell from "@/components/ui/ArchiveShell";
import ArchiveContainer from "@/components/ui/ArchiveContainer";
import SectionBadge from "@/components/ui/SectionBadge";
import PageNumber from "@/components/ui/PageNumber";
import JourneyNavigation from "@/components/navigation/JourneyNavigation";

/* =========================================================
   TYPES
========================================================= */

interface Template {
  id: string;
  name: string;
  bg: string;
  accent: string;
  textColor: string;
}

interface PhotoboothSignatureResponse {
  timestamp: number;
  signature: string;
  cloudName: string;
  apiKey: string;
  folder: string;
}

interface CloudinaryUploadResponse {
  secure_url?: string;
  public_id?: string;
}

type Stage = "select-template" | "camera" | "countdown" | "review" | "done";

/* =========================================================
   TEMPLATES
========================================================= */

const TEMPLATES: Template[] = [
  {
    id: "pastel",
    name: "Pastel",
    bg: "#FDE8F3",
    accent: "#F5A9D0",
    textColor: "#7A4869",
  },
  {
    id: "polaroid",
    name: "Polaroid",
    bg: "#FFFFFF",
    accent: "#2B2B2B",
    textColor: "#2B2B2B",
  },
  {
    id: "film",
    name: "Film",
    bg: "#111111",
    accent: "#F2C94C",
    textColor: "#F2C94C",
  },
  {
    id: "vintage",
    name: "Vintage",
    bg: "#EFE6D8",
    accent: "#8B5E3C",
    textColor: "#5B3A29",
  },
  {
    id: "sakura",
    name: "Sakura",
    bg: "#FFF0F5",
    accent: "#FFB7C5",
    textColor: "#B23A62",
  },
  {
    id: "birthday",
    name: "Birthday",
    bg: "#FFF7E0",
    accent: "#FF6B6B",
    textColor: "#B33939",
  },
  {
    id: "elegant",
    name: "Elegant",
    bg: "#1B1B2F",
    accent: "#D4AF37",
    textColor: "#D4AF37",
  },
  {
    id: "kawaii",
    name: "Kawaii",
    bg: "#FFE6F0",
    accent: "#FF9AC1",
    textColor: "#D6396D",
  },
  {
    id: "minimal",
    name: "Minimal",
    bg: "#FFFFFF",
    accent: "#3B2E52",
    textColor: "#3B2E52",
  },
];

/* =========================================================
   CONSTANTS
========================================================= */

const PHOTO_COUNT = 4;
const COUNTDOWN_START = 3;

const MAX_CAPTURE_WIDTH = 960;
const CAPTURE_QUALITY = 0.88;

const STRIP_WIDTH = 600;
const STRIP_HEIGHT = 1800;

/* =========================================================
   HELPERS
========================================================= */

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error("Canvas gagal menghasilkan gambar."));
      },
      type,
      quality,
    );
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();

    image.onload = () => resolve(image);

    image.onerror = () => {
      reject(new Error("Gagal membaca hasil foto."));
    };

    image.src = src;
  });
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function PhotoboothPage() {
  /* =======================================================
     REFS
  ======================================================== */

  const videoRef = useRef<HTMLVideoElement>(null);

  const captureCanvasRef = useRef<HTMLCanvasElement>(null);

  const stripCanvasRef = useRef<HTMLCanvasElement>(null);

  const streamRef = useRef<MediaStream | null>(null);

  const photoUrlsRef = useRef<string[]>([]);

  const stripUrlRef = useRef<string | null>(null);

  const sequenceRunningRef = useRef(false);

  const sequenceCancelledRef = useRef(false);

  const mountedRef = useRef(true);

  /* =======================================================
     STATE
  ======================================================== */

  const [stage, setStage] = useState<Stage>("select-template");

  const [template, setTemplate] = useState<Template>(TEMPLATES[0]);

  const [photos, setPhotos] = useState<string[]>([]);

  const [countdown, setCountdown] = useState(COUNTDOWN_START);

  const [flash, setFlash] = useState(false);

  const [cameraReady, setCameraReady] = useState(false);

  const [cameraStarting, setCameraStarting] = useState(false);

  const [stripBlob, setStripBlob] = useState<Blob | null>(null);

  const [stripPreviewUrl, setStripPreviewUrl] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);

  const [deleting, setDeleting] = useState(false);

  const [uploadedId, setUploadedId] = useState<string | null>(null);

  /* =======================================================
     STOP CAMERA
  ======================================================== */

  const stopCamera = useCallback(() => {
    const stream = streamRef.current;

    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore
        }
      });
    }

    streamRef.current = null;

    const video = videoRef.current;

    if (video) {
      video.pause();
      video.srcObject = null;
    }

    setCameraReady(false);
  }, []);

  /* =======================================================
     REVOKE PHOTO URLS
  ======================================================== */

  const revokePhotoUrls = useCallback(() => {
    photoUrlsRef.current.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // Ignore
      }
    });

    photoUrlsRef.current = [];
  }, []);

  /* =======================================================
     REVOKE STRIP URL
  ======================================================== */

  const revokeStripUrl = useCallback(() => {
    if (stripUrlRef.current) {
      try {
        URL.revokeObjectURL(stripUrlRef.current);
      } catch {
        // Ignore
      }

      stripUrlRef.current = null;
    }
  }, []);

  /* =======================================================
     CLEAR LOCAL MEDIA
  ======================================================== */

  const clearLocalMedia = useCallback(() => {
    revokePhotoUrls();

    revokeStripUrl();

    setPhotos([]);

    setStripBlob(null);

    setStripPreviewUrl(null);
  }, [revokePhotoUrls, revokeStripUrl]);

  /* =======================================================
     UNMOUNT CLEANUP
  ======================================================== */

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      sequenceCancelledRef.current = true;

      sequenceRunningRef.current = false;

      const stream = streamRef.current;

      if (stream) {
        stream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {
            // Ignore
          }
        });
      }

      streamRef.current = null;

      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }

      photoUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // Ignore
        }
      });

      photoUrlsRef.current = [];

      if (stripUrlRef.current) {
        try {
          URL.revokeObjectURL(stripUrlRef.current);
        } catch {
          // Ignore
        }

        stripUrlRef.current = null;
      }
    };
  }, []);

  /* =======================================================
     CONNECT STREAM TO VIDEO
     
     IMPORTANT:
     Ini bagian utama yang memperbaiki masalah
     "Menyiapkan kamera..." terus-menerus.
  ======================================================== */

  useEffect(() => {
    if (stage !== "camera" && stage !== "countdown") {
      return;
    }

    const video = videoRef.current;

    const stream = streamRef.current;

    if (!video || !stream) {
      return;
    }

    let cancelled = false;

    const markCameraReady = async () => {
      if (cancelled || !mountedRef.current) {
        return;
      }

      try {
        if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
          setCameraReady(true);
        }

        await video.play();

        if (!cancelled && mountedRef.current) {
          setCameraReady(true);
        }
      } catch {
        /*
         * Autoplay mungkin ditolak browser.
         * Tetapi stream sudah tersedia.
         */
        if (
          !cancelled &&
          mountedRef.current &&
          video.videoWidth > 0 &&
          video.videoHeight > 0
        ) {
          setCameraReady(true);
        }
      }
    };

    const handleLoadedMetadata = () => {
      markCameraReady();
    };

    const handleCanPlay = () => {
      markCameraReady();
    };

    /*
     * Pastikan stream benar-benar masuk ke video.
     */
    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    video.addEventListener("loadedmetadata", handleLoadedMetadata);

    video.addEventListener("canplay", handleCanPlay);

    /*
     * Kalau metadata sudah tersedia sebelum listener
     * terpasang, langsung cek.
     */
    if (
      video.readyState >= HTMLMediaElement.HAVE_METADATA &&
      video.videoWidth > 0 &&
      video.videoHeight > 0
    ) {
      markCameraReady();
    }

    /*
     * Coba play langsung.
     */
    markCameraReady();

    return () => {
      cancelled = true;

      video.removeEventListener("loadedmetadata", handleLoadedMetadata);

      video.removeEventListener("canplay", handleCanPlay);
    };
  }, [stage]);

  /* =======================================================
     START CAMERA
  ======================================================== */

  async function startCamera() {
    if (cameraStarting) {
      return;
    }

    setError(null);

    setCameraStarting(true);

    setCameraReady(false);

    sequenceCancelledRef.current = false;

    stopCamera();

    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "Browser ini tidak mendukung akses kamera. Gunakan Chrome, Safari, atau browser modern lainnya.",
      );

      setCameraStarting(false);

      return;
    }

    try {
      /*
       * Pastikan browser berada pada secure context.
       *
       * localhost dianggap aman oleh browser modern.
       */
      if (!window.isSecureContext && window.location.hostname !== "localhost") {
        throw new Error("Akses kamera membutuhkan HTTPS atau localhost.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: {
            ideal: "user",
          },
          width: {
            ideal: 1280,
            min: 640,
          },
          height: {
            ideal: 960,
            min: 480,
          },
          frameRate: {
            ideal: 30,
            max: 30,
          },
        },
        audio: false,
      });

      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());

        return;
      }

      streamRef.current = stream;

      /*
       * Jangan langsung menganggap kamera ready.
       *
       * Kita pindah ke stage camera terlebih dahulu,
       * lalu effect di atas akan memasang stream ke
       * video dan menunggu loadedmetadata/canplay.
       */
      setStage("camera");
    } catch (cameraError) {
      let message =
        "Tidak bisa mengakses kamera. Pastikan izin kamera diberikan.";

      if (cameraError instanceof DOMException) {
        if (cameraError.name === "NotAllowedError") {
          message =
            "Izin kamera ditolak. Izinkan akses kamera untuk localhost di pengaturan browser.";
        } else if (cameraError.name === "NotFoundError") {
          message =
            "Kamera tidak ditemukan. Pastikan MacBook memiliki kamera atau webcam sedang terhubung.";
        } else if (cameraError.name === "NotReadableError") {
          message =
            "Kamera sedang digunakan aplikasi lain. Tutup aplikasi yang menggunakan kamera lalu coba lagi.";
        } else if (cameraError.name === "OverconstrainedError") {
          message =
            "Konfigurasi kamera tidak didukung perangkat. Coba gunakan webcam dengan resolusi standar.";
        } else if (cameraError.name === "SecurityError") {
          message = "Browser tidak mengizinkan akses kamera pada halaman ini.";
        }
      } else if (cameraError instanceof Error) {
        message = cameraError.message;
      }

      setError(message);

      setCameraReady(false);

      setStage("select-template");
    } finally {
      if (mountedRef.current) {
        setCameraStarting(false);
      }
    }
  }

  /* =======================================================
     CAPTURE FRAME
  ======================================================== */

  async function captureFrame(): Promise<string> {
    const video = videoRef.current;

    const canvas = captureCanvasRef.current;

    if (!video || !canvas) {
      throw new Error("Elemen kamera belum tersedia.");
    }

    /*
     * Pastikan video benar-benar mempunyai ukuran.
     */
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      throw new Error(
        "Kamera belum siap mengambil foto. Silakan tunggu beberapa saat.",
      );
    }

    /*
     * Pastikan kamera masih aktif.
     */
    if (
      !streamRef.current ||
      streamRef.current
        .getVideoTracks()
        .every((track) => track.readyState !== "live")
    ) {
      throw new Error(
        "Koneksi kamera terputus. Silakan nyalakan kamera kembali.",
      );
    }

    const scale = Math.min(1, MAX_CAPTURE_WIDTH / video.videoWidth);

    canvas.width = Math.round(video.videoWidth * scale);

    canvas.height = Math.round(video.videoHeight * scale);

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Browser gagal menyiapkan canvas foto.");
    }

    /*
     * Mirror hasil foto agar sama dengan preview kamera.
     */
    context.save();

    context.translate(canvas.width, 0);

    context.scale(-1, 1);

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    context.restore();

    const blob = await canvasToBlob(canvas, "image/jpeg", CAPTURE_QUALITY);

    canvas.width = 1;

    canvas.height = 1;

    const objectUrl = URL.createObjectURL(blob);

    photoUrlsRef.current.push(objectUrl);

    return objectUrl;
  }

  /* =======================================================
     SHUTTER SOUND
  ======================================================== */

  function playShutterSound() {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (
          window as Window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;

      if (!AudioContextClass) {
        return;
      }

      const audioContext = new AudioContextClass();

      const oscillator = audioContext.createOscillator();

      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);

      gainNode.connect(audioContext.destination);

      oscillator.type = "square";

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);

      gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);

      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.15,
      );

      oscillator.onended = () => {
        audioContext.close().catch(() => undefined);
      };

      oscillator.start(audioContext.currentTime);

      oscillator.stop(audioContext.currentTime + 0.15);
    } catch {
      // Ignore audio error.
    }
  }

  /* =======================================================
     CANCEL CAPTURE SESSION
  ======================================================== */

  const cancelCaptureSession = useCallback(() => {
    sequenceCancelledRef.current = true;

    sequenceRunningRef.current = false;

    stopCamera();

    clearLocalMedia();

    setCountdown(COUNTDOWN_START);

    setFlash(false);

    setUploadedId(null);

    setError(null);

    setStage("select-template");
  }, [clearLocalMedia, stopCamera]);

  /* =======================================================
     START PHOTO SEQUENCE
  ======================================================== */

  const startSequence = useCallback(async () => {
    if (!cameraReady || sequenceRunningRef.current) {
      return;
    }

    /*
     * Double-check video.
     */
    const video = videoRef.current;

    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setError(
        "Kamera belum benar-benar siap. Tunggu sebentar lalu coba lagi.",
      );

      return;
    }

    sequenceRunningRef.current = true;

    sequenceCancelledRef.current = false;

    setError(null);

    setStage("countdown");

    const captured: string[] = [];

    try {
      for (let shot = 0; shot < PHOTO_COUNT; shot += 1) {
        /*
         * Countdown.
         */
        for (let current = COUNTDOWN_START; current > 0; current -= 1) {
          if (sequenceCancelledRef.current) {
            return;
          }

          setCountdown(current);

          await delay(1000);
        }

        if (sequenceCancelledRef.current) {
          return;
        }

        /*
         * Flash.
         */
        setFlash(true);

        playShutterSound();

        await delay(120);

        /*
         * Capture.
         */
        const photoUrl = await captureFrame();

        setFlash(false);

        captured.push(photoUrl);

        setPhotos([...captured]);

        /*
         * Jeda sebelum foto berikutnya.
         */
        if (shot < PHOTO_COUNT - 1) {
          await delay(500);
        }
      }

      if (!sequenceCancelledRef.current && captured.length === PHOTO_COUNT) {
        stopCamera();

        setStage("review");
      }
    } catch (captureError) {
      stopCamera();

      setStage("select-template");

      clearLocalMedia();

      setError(
        captureError instanceof Error
          ? captureError.message
          : "Gagal mengambil foto. Silakan coba lagi.",
      );
    } finally {
      sequenceRunningRef.current = false;

      setFlash(false);

      setCountdown(COUNTDOWN_START);
    }
  }, [cameraReady, captureFrame, clearLocalMedia, stopCamera]);

  /* =======================================================
     COMPOSE PHOTO STRIP
  ======================================================== */

  useEffect(() => {
    if (stage !== "review" || photos.length !== PHOTO_COUNT) {
      return;
    }

    const canvas = stripCanvasRef.current;

    if (!canvas) {
      return;
    }

    let cancelled = false;

    async function composeStrip() {
      try {
        const images = await Promise.all(photos.map((src) => loadImage(src)));

        if (cancelled || !canvas) {
          return;
        }

        canvas.width = STRIP_WIDTH;

        canvas.height = STRIP_HEIGHT;

        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("Browser gagal menyusun photo strip.");
        }

        /*
         * BACKGROUND
         */
        context.fillStyle = template.bg;

        context.fillRect(0, 0, STRIP_WIDTH, STRIP_HEIGHT);

        /*
         * HEADER
         */
        context.fillStyle = template.textColor;

        context.font = "700 34px sans-serif";

        context.textAlign = "center";

        context.fillText("THE ARCHIVE", STRIP_WIDTH / 2, 70);

        /*
         * PHOTO SLOTS
         */
        const margin = 30;

        const headerHeight = 110;

        const footerHeight = 90;

        const gap = 18;

        const slotWidth = STRIP_WIDTH - margin * 2;

        const slotHeight =
          (STRIP_HEIGHT -
            headerHeight -
            footerHeight -
            gap * (PHOTO_COUNT - 1)) /
          PHOTO_COUNT;

        images.forEach((image, index) => {
          const y = headerHeight + index * (slotHeight + gap);

          context.save();

          context.strokeStyle = template.accent;

          context.lineWidth = 4;

          context.strokeRect(margin, y, slotWidth, slotHeight);

          const imageScale = Math.max(
            slotWidth / image.width,
            slotHeight / image.height,
          );

          const sourceWidth = slotWidth / imageScale;

          const sourceHeight = slotHeight / imageScale;

          const sourceX = (image.width - sourceWidth) / 2;

          const sourceY = (image.height - sourceHeight) / 2;

          context.drawImage(
            image,
            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight,
            margin,
            y,
            slotWidth,
            slotHeight,
          );

          context.restore();
        });

        /*
         * FOOTER DATE
         */
        context.fillStyle = template.textColor;

        context.font = "20px sans-serif";

        context.textAlign = "center";

        context.fillText(
          new Date().toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          STRIP_WIDTH / 2,
          STRIP_HEIGHT - 35,
        );

        const blob = await canvasToBlob(canvas, "image/jpeg", 0.92);

        canvas.width = 1;

        canvas.height = 1;

        if (cancelled) {
          return;
        }

        revokeStripUrl();

        const previewUrl = URL.createObjectURL(blob);

        stripUrlRef.current = previewUrl;

        setStripBlob(blob);

        setStripPreviewUrl(previewUrl);
      } catch (composeError) {
        if (!cancelled) {
          setError(
            composeError instanceof Error
              ? composeError.message
              : "Gagal menyusun photo strip.",
          );
        }
      }
    }

    composeStrip();

    return () => {
      cancelled = true;
    };
  }, [photos, revokeStripUrl, stage, template]);

  /* =======================================================
     RETAKE ALL
  ======================================================== */

  function retakeAll() {
    sequenceCancelledRef.current = true;

    sequenceRunningRef.current = false;

    stopCamera();

    clearLocalMedia();

    setCountdown(COUNTDOWN_START);

    setFlash(false);

    setUploadedId(null);

    setError(null);

    setStage("select-template");
  }

  /* =======================================================
     UPLOAD TO CLOUDINARY
  ======================================================== */

  async function handleUpload() {
    if (!stripBlob || uploading) {
      return;
    }

    setUploading(true);

    setError(null);

    try {
      const signatureResponse = await fetch(
        "/api/upload-signature?folder=the-archive/photobooth",
        {
          cache: "no-store",
        },
      );

      if (!signatureResponse.ok) {
        const data = (await signatureResponse.json().catch(() => null)) as {
          message?: string;
        } | null;

        throw new Error(data?.message || "Gagal menyiapkan upload Photobooth.");
      }

      const signatureData =
        (await signatureResponse.json()) as PhotoboothSignatureResponse;

      const formData = new FormData();

      formData.append("file", stripBlob, "the-archive-photobooth.jpg");

      formData.append("api_key", signatureData.apiKey);

      formData.append("timestamp", signatureData.timestamp.toString());

      formData.append("signature", signatureData.signature);

      formData.append("folder", signatureData.folder);

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!uploadResponse.ok) {
        throw new Error("Cloudinary gagal menyimpan hasil Photobooth.");
      }

      const uploadData =
        (await uploadResponse.json()) as CloudinaryUploadResponse;

      if (!uploadData.secure_url || !uploadData.public_id) {
        throw new Error("Respons Cloudinary tidak lengkap.");
      }

      /*
       * Firestore hanya menyimpan metadata.
       */
      const documentReference = await addDoc(collection(db, "photobooth"), {
        url: uploadData.secure_url,
        publicId: uploadData.public_id,
        template: template.id,
        createdAt: serverTimestamp(),
      });

      setUploadedId(documentReference.id);

      setStage("done");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Gagal menyimpan hasil. Silakan coba lagi.",
      );
    } finally {
      setUploading(false);
    }
  }

  /* =======================================================
     DOWNLOAD
  ======================================================== */

  function handleDownload() {
    if (!stripPreviewUrl) {
      return;
    }

    const anchor = document.createElement("a");

    anchor.href = stripPreviewUrl;

    anchor.download = `the-archive-photobooth-${Date.now()}.jpg`;

    document.body.appendChild(anchor);

    anchor.click();

    document.body.removeChild(anchor);
  }

  /* =======================================================
     DELETE FROM ARCHIVE VIEW
  ======================================================== */

  async function handleRemoveFromArchiveView() {
    if (!uploadedId || deleting) {
      return;
    }

    const confirmed = window.confirm(
      "Hapus foto dari tampilan The Archive? Foto akan hilang dari halaman monitoring, tetapi satu salinan tetap tersimpan di arsip pribadi.",
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);

    setError(null);

    try {
      /*
       * Hanya Firestore yang dihapus.
       * File Cloudinary tetap tersimpan.
       */
      await deleteDoc(doc(db, "photobooth", uploadedId));

      retakeAll();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Gagal menghapus foto dari tampilan The Archive.",
      );
    } finally {
      setDeleting(false);
    }
  }

  /* =======================================================
     RENDER
  ======================================================== */

  return (
    <ArchiveShell>
      <main className="relative min-h-[calc(100vh-80px)] overflow-hidden">
        {/* =================================================
            AMBIENT BACKGROUND
        ================================================= */}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div
            className="
              archive-ambient-pulse
              absolute
              left-[8%]
              top-[12%]
              h-[260px]
              w-[260px]
              rounded-full
              bg-[#9c5d94]/[0.035]
              blur-[90px]
            "
          />

          <div
            className="
              absolute
              right-[10%]
              top-[32%]
              h-[220px]
              w-[220px]
              rounded-full
              bg-[#5d6fa8]/[0.025]
              blur-[90px]
            "
          />
        </div>

        {/* =================================================
            PAGE HEADER
        ================================================= */}

        <section className="relative pt-8 sm:pt-12">
          <ArchiveContainer size="wide">
            <div
              className="
                flex
                flex-col
                items-start
                gap-5
                xl:flex-row
                xl:gap-12
              "
            >
              <PageNumber
                number="02"
                title="Photobooth"
                description="Abadikan senyum terbaikmu di sini. Setiap foto adalah potongan bahagia yang kita simpan bersama."
                className="hidden xl:flex xl:w-[180px] xl:shrink-0"
              />

              <div className="flex-1">
                <SectionBadge icon={<Camera size={11} />}>
                  Ambil Momen Seru
                </SectionBadge>

                <h1
                  className="
                    archive-display
                    mt-4
                    text-[clamp(2.5rem,5vw,4.7rem)]
                    leading-[0.92]
                    tracking-[-0.04em]
                    text-[var(--archive-text)]
                  "
                >
                  Photobooth
                </h1>

                <p
                  className="
                    mt-3
                    max-w-xl
                    text-sm
                    leading-relaxed
                    text-[var(--archive-muted)]/70
                  "
                >
                  Pilih template favoritmu, bersiap, dan abadikan momen
                  terbaikmu!
                </p>
              </div>
            </div>
          </ArchiveContainer>
        </section>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <section className="relative mt-5">
            <ArchiveContainer size="wide">
              <div
                className="
                  rounded-xl
                  border
                  border-red-400/20
                  bg-red-500/[0.05]
                  px-4
                  py-3
                  text-sm
                  text-red-300
                "
              >
                {error}
              </div>
            </ArchiveContainer>
          </section>
        )}

        {/* =================================================
            PHOTOBOOTH WORKSPACE
        ================================================= */}

        <section className="relative py-7 sm:py-9">
          <ArchiveContainer size="wide">
            <div
              className="
                grid
                grid-cols-1
                items-stretch
                gap-4
                lg:grid-cols-[180px_minmax(0,1fr)_180px]
                xl:grid-cols-[190px_minmax(0,1fr)_205px]
                xl:gap-5
              "
            >
              {/* LEFT */}

              <TemplatePanel
                templates={TEMPLATES}
                selectedTemplate={template}
                onSelect={setTemplate}
              />

              {/* CENTER */}

              <CameraPanel
                stage={stage}
                template={template}
                videoRef={videoRef}
                cameraReady={cameraReady}
                cameraStarting={cameraStarting}
                countdown={countdown}
                flash={flash}
                photosCount={photos.length}
                onStartCamera={startCamera}
                onStartSequence={startSequence}
                onCancel={cancelCaptureSession}
                onRetake={retakeAll}
                onDownload={handleDownload}
                onUpload={handleUpload}
                uploading={uploading}
                stripPreviewUrl={stripPreviewUrl}
              />

              {/* RIGHT */}

              <StripPreviewPanel
                photos={photos}
                stripPreviewUrl={stripPreviewUrl}
                stage={stage}
              />
            </div>

            {/* =================================================
                MOBILE ACTIONS / RESULT
            ================================================= */}

            {(stage === "review" || stage === "done") && stripPreviewUrl && (
              <div
                className="
                    mt-5
                    grid
                    grid-cols-1
                    gap-2
                    sm:grid-cols-2
                  "
              >
                {stage === "review" && (
                  <>
                    <button
                      type="button"
                      onClick={retakeAll}
                      disabled={uploading}
                      className="
                          inline-flex
                          min-h-11
                          items-center
                          justify-center
                          gap-2
                          rounded-full
                          border
                          border-white/10
                          bg-white/[0.03]
                          px-5
                          text-sm
                          font-medium
                          text-[var(--archive-text)]
                          transition
                          hover:bg-white/[0.06]
                          disabled:cursor-not-allowed
                          disabled:opacity-40
                        "
                    >
                      <RotateCcw size={14} />
                      Ambil Ulang
                    </button>

                    <button
                      type="button"
                      onClick={handleUpload}
                      disabled={uploading}
                      className="
                          inline-flex
                          min-h-11
                          items-center
                          justify-center
                          gap-2
                          rounded-full
                          bg-[var(--archive-pink)]
                          px-5
                          text-sm
                          font-medium
                          text-white
                          shadow-[0_8px_30px_rgba(156,93,148,0.2)]
                          transition
                          hover:bg-[var(--archive-pink-soft)]
                          disabled:cursor-not-allowed
                          disabled:opacity-50
                        "
                    >
                      {uploading ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Menyimpan...
                        </>
                      ) : (
                        <>
                          <Check size={14} />
                          Simpan
                        </>
                      )}
                    </button>
                  </>
                )}

                {stage === "done" && (
                  <>
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="
                          inline-flex
                          min-h-11
                          items-center
                          justify-center
                          gap-2
                          rounded-full
                          bg-[var(--archive-pink)]
                          px-5
                          text-sm
                          font-medium
                          text-white
                          transition
                          hover:bg-[var(--archive-pink-soft)]
                        "
                    >
                      <Download size={14} />
                      Download
                    </button>

                    <button
                      type="button"
                      onClick={handleRemoveFromArchiveView}
                      disabled={deleting || !uploadedId}
                      className="
                          inline-flex
                          min-h-11
                          items-center
                          justify-center
                          gap-2
                          rounded-full
                          border
                          border-red-400/20
                          bg-red-500/[0.04]
                          px-5
                          text-sm
                          font-medium
                          text-red-300
                          transition
                          hover:bg-red-500/[0.08]
                          disabled:cursor-not-allowed
                          disabled:opacity-40
                        "
                    >
                      {deleting ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}

                      {deleting ? "Menghapus..." : "Hapus dari Archive"}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* =================================================
                TIP
            ================================================= */}

            <div
              className="
                mt-6
                flex
                items-center
                justify-center
                gap-2
                text-center
              "
            >
              <Sparkles
                size={10}
                className="text-[var(--archive-gold-soft)]/60"
              />

              <p
                className="
                  text-[10px]
                  uppercase
                  tracking-[0.13em]
                  text-[var(--archive-muted)]/35
                "
              >
                Senyum terbaikmu adalah kenangan terindah
              </p>

              <Sparkles
                size={10}
                className="text-[var(--archive-gold-soft)]/60"
              />
            </div>

            {/* NAVIGATION */}

            <div className="mt-8">
              <JourneyNavigation />
            </div>
          </ArchiveContainer>
        </section>

        {/* HIDDEN CANVAS */}

        <canvas ref={captureCanvasRef} className="hidden" />

        <canvas ref={stripCanvasRef} className="hidden" />
      </main>
    </ArchiveShell>
  );
}

/* =========================================================
   TEMPLATE PANEL
========================================================= */

interface TemplatePanelProps {
  templates: Template[];
  selectedTemplate: Template;
  onSelect: (template: Template) => void;
}

function TemplatePanel({
  templates,
  selectedTemplate,
  onSelect,
}: TemplatePanelProps) {
  return (
    <aside
      className="
        rounded-2xl
        border
        border-white/[0.07]
        bg-white/[0.025]
        p-3
        backdrop-blur-md
        sm:p-4
      "
    >
      <div className="mb-3 px-1">
        <p
          className="
            text-[9px]
            font-semibold
            uppercase
            tracking-[0.16em]
            text-[var(--archive-text)]/75
          "
        >
          Pilih Template
        </p>

        <p
          className="
            mt-1
            text-[8px]
            leading-4
            text-[var(--archive-muted)]/40
          "
        >
          Pilih gaya foto favoritmu
        </p>
      </div>

      <div
        className="
          grid
          grid-cols-3
          gap-2
          lg:grid-cols-1
        "
      >
        {templates.map((item) => {
          const selected = selectedTemplate.id === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item)}
              className={`
                group
                relative
                overflow-hidden
                rounded-xl
                border
                p-1.5
                text-left
                transition-all
                duration-200
                ${
                  selected
                    ? "border-[var(--archive-gold)]/60 bg-white/[0.08] shadow-[0_0_20px_rgba(213,166,95,0.08)]"
                    : "border-white/[0.05] bg-white/[0.02] hover:border-white/[0.13] hover:bg-white/[0.05]"
                }
              `}
              aria-pressed={selected}
            >
              <div
                className="
                  relative
                  aspect-[4/3]
                  overflow-hidden
                  rounded-lg
                "
                style={{
                  background: item.bg,
                }}
              >
                <div
                  className="
                    absolute
                    inset-x-1
                    top-1
                    h-1
                    rounded-full
                  "
                  style={{
                    background: item.accent,
                  }}
                />

                <div
                  className="
                    absolute
                    inset-x-1
                    bottom-1
                    top-3
                    grid
                    grid-cols-2
                    gap-0.5
                  "
                >
                  {[1, 2, 3, 4].map((number) => (
                    <span
                      key={number}
                      className="rounded-[2px] opacity-70"
                      style={{
                        background: item.accent,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="px-0.5 pb-0.5 pt-1.5">
                <p
                  className="
                    truncate
                    text-[8px]
                    font-medium
                  "
                  style={{
                    color: selected ? "var(--archive-text)" : item.textColor,
                  }}
                >
                  {item.name}
                </p>
              </div>

              {selected && (
                <span
                  className="
                    absolute
                    right-1.5
                    top-1.5
                    flex
                    h-4
                    w-4
                    items-center
                    justify-center
                    rounded-full
                    bg-[var(--archive-gold)]
                    text-[#0b0e27]
                  "
                >
                  <Check size={9} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

/* =========================================================
   CAMERA PANEL
========================================================= */

interface CameraPanelProps {
  stage: Stage;
  template: Template;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraReady: boolean;
  cameraStarting: boolean;
  countdown: number;
  flash: boolean;
  photosCount: number;
  onStartCamera: () => void;
  onStartSequence: () => void;
  onCancel: () => void;
  onRetake: () => void;
  onDownload: () => void;
  onUpload: () => void;
  uploading: boolean;
  stripPreviewUrl: string | null;
}

function CameraPanel({
  stage,
  template,
  videoRef,
  cameraReady,
  cameraStarting,
  countdown,
  flash,
  photosCount,
  onStartCamera,
  onStartSequence,
  onCancel,
  onRetake,
  onDownload,
  onUpload,
  uploading,
  stripPreviewUrl,
}: CameraPanelProps) {
  const cameraActive = stage === "camera" || stage === "countdown";

  return (
    <section
      className="
        min-w-0
        rounded-3xl
        border
        border-white/[0.08]
        bg-white/[0.025]
        p-3
        shadow-[0_20px_70px_rgba(0,0,0,0.12)]
        backdrop-blur-md
        sm:p-4
      "
    >
      {/* CAMERA FRAME */}

      <div
        className="
          relative
          aspect-[4/3]
          overflow-hidden
          rounded-2xl
          border
          border-white/[0.08]
          bg-[#080b20]
        "
      >
        {cameraActive ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="
                h-full
                w-full
                scale-x-[-1]
                object-cover
              "
            />

            {/* =================================================
                CAMERA LOADING
            ================================================= */}

            {!cameraReady && (
              <div
                className="
                  absolute
                  inset-0
                  z-20
                  flex
                  flex-col
                  items-center
                  justify-center
                  gap-3
                  bg-[#080b20]/85
                  px-6
                  text-center
                  backdrop-blur-sm
                "
              >
                <Loader2
                  size={22}
                  className="
                    animate-spin
                    text-[var(--archive-gold-soft)]
                  "
                />

                <p
                  className="
                    text-xs
                    text-white/55
                  "
                >
                  Menyiapkan kamera...
                </p>

                <p
                  className="
                    max-w-xs
                    text-[9px]
                    leading-4
                    text-white/30
                  "
                >
                  Tunggu sebentar sampai kamera siap digunakan.
                </p>
              </div>
            )}

            {/* TOP STATUS */}

            <div
              className="
                absolute
                left-3
                right-3
                top-3
                z-10
                flex
                items-center
                justify-between
              "
            >
              <span
                className="
                  rounded-full
                  border
                  border-white/10
                  bg-[#080b20]/55
                  px-2.5
                  py-1
                  text-[8px]
                  font-semibold
                  text-white/70
                  backdrop-blur-md
                "
              >
                PHOTO {Math.min(photosCount + 1, PHOTO_COUNT)} / {PHOTO_COUNT}
              </span>

              <span
                className="
                  rounded-full
                  border
                  border-white/10
                  bg-[#080b20]/55
                  px-2.5
                  py-1
                  text-[8px]
                  font-medium
                  text-white/60
                  backdrop-blur-md
                "
              >
                {template.name}
              </span>
            </div>

            {/* COUNTDOWN */}

            {stage === "countdown" && cameraReady && (
              <>
                {countdown > 0 && (
                  <div
                    className="
                        absolute
                        inset-0
                        z-10
                        flex
                        items-center
                        justify-center
                        bg-black/20
                      "
                  >
                    <span
                      className="
                          archive-display
                          text-7xl
                          text-white
                          drop-shadow-[0_4px_25px_rgba(0,0,0,0.5)]
                          sm:text-8xl
                        "
                    >
                      {countdown}
                    </span>
                  </div>
                )}

                {flash && (
                  <div
                    className="
                        absolute
                        inset-0
                        z-30
                        bg-white
                      "
                    aria-hidden="true"
                  />
                )}
              </>
            )}
          </>
        ) : stage === "review" && stripPreviewUrl ? (
          <div
            className="
              flex
              h-full
              items-center
              justify-center
              bg-[#080b20]
              p-5
            "
          >
            <img
              src={stripPreviewUrl}
              alt="Hasil photo strip"
              className="
                h-full
                max-h-full
                w-auto
                max-w-full
                rounded-lg
                object-contain
                shadow-[0_15px_50px_rgba(0,0,0,0.4)]
              "
            />
          </div>
        ) : stage === "done" && stripPreviewUrl ? (
          <div
            className="
              flex
              h-full
              items-center
              justify-center
              bg-[#080b20]
              p-5
            "
          >
            <img
              src={stripPreviewUrl}
              alt="Hasil photo strip tersimpan"
              className="
                h-full
                max-h-full
                w-auto
                max-w-full
                rounded-lg
                object-contain
                shadow-[0_15px_50px_rgba(0,0,0,0.4)]
              "
            />
          </div>
        ) : (
          <CameraPlaceholder
            cameraStarting={cameraStarting}
            onStartCamera={onStartCamera}
          />
        )}

        {/* CAMERA CORNERS */}

        {cameraActive && (
          <>
            <span className="absolute left-4 top-4 z-10 h-5 w-5 border-l border-t border-white/30" />

            <span className="absolute right-4 top-4 z-10 h-5 w-5 border-r border-t border-white/30" />

            <span className="absolute bottom-4 left-4 z-10 h-5 w-5 border-b border-l border-white/30" />

            <span className="absolute bottom-4 right-4 z-10 h-5 w-5 border-b border-r border-white/30" />
          </>
        )}
      </div>

      {/* CAMERA META */}

      <div
        className="
          mt-3
          flex
          items-center
          justify-between
          gap-3
          px-1
        "
      >
        <div
          className="
            flex
            items-center
            gap-1.5
            text-[9px]
            text-[var(--archive-muted)]/45
          "
        >
          <span
            className={`
              h-1.5
              w-1.5
              rounded-full
              ${cameraReady ? "bg-emerald-400" : "bg-white/20"}
            `}
          />

          {cameraReady ? "Kamera siap" : "Kamera belum aktif"}
        </div>

        <span
          className="
            text-[9px]
            text-[var(--archive-muted)]/40
          "
        >
          {template.name}
        </span>
      </div>

      {/* CONTROLS */}

      <div
        className="
          mt-4
          flex
          items-center
          justify-center
          gap-3
        "
      >
        {/* SELECT TEMPLATE */}

        {stage === "select-template" && (
          <button
            type="button"
            onClick={onStartCamera}
            disabled={cameraStarting}
            className="
              inline-flex
              min-h-11
              flex-1
              items-center
              justify-center
              gap-2
              rounded-full
              bg-[var(--archive-pink)]
              px-5
              text-xs
              font-semibold
              text-white
              shadow-[0_8px_25px_rgba(156,93,148,0.18)]
              transition
              hover:bg-[var(--archive-pink-soft)]
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {cameraStarting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Menyiapkan Kamera...
              </>
            ) : (
              <>
                <Camera size={14} />
                Nyalakan Kamera
              </>
            )}
          </button>
        )}

        {/* CAMERA */}

        {stage === "camera" && (
          <>
            <button
              type="button"
              onClick={onCancel}
              className="
                inline-flex
                h-10
                flex-1
                items-center
                justify-center
                gap-2
                rounded-full
                border
                border-white/10
                bg-white/[0.03]
                px-4
                text-[10px]
                font-medium
                text-white/65
                transition
                hover:bg-white/[0.06]
              "
            >
              Batal
            </button>

            <button
              type="button"
              onClick={onStartSequence}
              disabled={!cameraReady}
              className="
                inline-flex
                h-14
                w-14
                shrink-0
                items-center
                justify-center
                rounded-full
                border
                border-[var(--archive-pink-soft)]/50
                bg-[var(--archive-pink)]
                text-white
                shadow-[0_0_30px_rgba(156,93,148,0.25)]
                transition
                hover:scale-105
                hover:bg-[var(--archive-pink-soft)]
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
              aria-label="Mulai mengambil foto"
            >
              <Camera size={22} />
            </button>

            <div
              className="
                flex
                flex-1
                items-center
                justify-center
                gap-1.5
                rounded-full
                border
                border-white/10
                bg-white/[0.03]
                px-4
                text-[9px]
                text-white/45
              "
            >
              <span>{photosCount}</span> / {PHOTO_COUNT}
            </div>
          </>
        )}

        {/* COUNTDOWN */}

        {stage === "countdown" && (
          <button
            type="button"
            onClick={onCancel}
            className="
              inline-flex
              min-h-10
              w-full
              items-center
              justify-center
              gap-2
              rounded-full
              border
              border-red-400/20
              bg-red-500/[0.04]
              px-4
              text-[10px]
              font-medium
              text-red-300
              transition
              hover:bg-red-500/[0.08]
            "
          >
            Batalkan Sesi
          </button>
        )}

        {/* REVIEW */}

        {stage === "review" && stripPreviewUrl && (
          <>
            <button
              type="button"
              onClick={onRetake}
              disabled={uploading}
              className="
                  inline-flex
                  h-10
                  flex-1
                  items-center
                  justify-center
                  gap-2
                  rounded-full
                  border
                  border-white/10
                  bg-white/[0.03]
                  px-4
                  text-[10px]
                  font-medium
                  text-white/65
                  transition
                  hover:bg-white/[0.06]
                  disabled:opacity-40
                "
            >
              <RotateCcw size={12} />
              Ambil Ulang
            </button>

            <button
              type="button"
              onClick={onUpload}
              disabled={uploading}
              className="
                  inline-flex
                  h-10
                  flex-1
                  items-center
                  justify-center
                  gap-2
                  rounded-full
                  bg-[var(--archive-pink)]
                  px-4
                  text-[10px]
                  font-semibold
                  text-white
                  transition
                  hover:bg-[var(--archive-pink-soft)]
                  disabled:opacity-50
                "
            >
              {uploading ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Menyimpan
                </>
              ) : (
                <>
                  <Check size={12} />
                  Simpan
                </>
              )}
            </button>
          </>
        )}

        {/* DONE */}

        {stage === "done" && stripPreviewUrl && (
          <>
            <button
              type="button"
              onClick={onDownload}
              className="
                  inline-flex
                  h-10
                  flex-1
                  items-center
                  justify-center
                  gap-2
                  rounded-full
                  bg-[var(--archive-pink)]
                  px-4
                  text-[10px]
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
              onClick={onRetake}
              className="
                  inline-flex
                  h-10
                  flex-1
                  items-center
                  justify-center
                  gap-2
                  rounded-full
                  border
                  border-white/10
                  bg-white/[0.03]
                  px-4
                  text-[10px]
                  font-medium
                  text-white/60
                  transition
                  hover:bg-white/[0.06]
                "
            >
              <RotateCcw size={12} />
              Foto Lagi
            </button>
          </>
        )}
      </div>

      {/* DONE MESSAGE */}

      {stage === "done" && (
        <div
          className="
            mt-3
            flex
            items-center
            justify-center
            gap-2
            rounded-xl
            border
            border-emerald-400/10
            bg-emerald-400/[0.04]
            px-3
            py-2
          "
        >
          <Check size={11} className="text-emerald-300" />

          <p
            className="
              text-[9px]
              text-emerald-200/70
            "
          >
            Foto berhasil disimpan!
          </p>
        </div>
      )}
    </section>
  );
}

/* =========================================================
   CAMERA PLACEHOLDER
========================================================= */

function CameraPlaceholder({
  cameraStarting,
  onStartCamera,
}: {
  cameraStarting: boolean;
  onStartCamera: () => void;
}) {
  return (
    <div
      className="
        relative
        flex
        h-full
        min-h-[280px]
        flex-col
        items-center
        justify-center
        overflow-hidden
        bg-gradient-to-br
        from-[#111634]
        via-[#11122D]
        to-[#170F27]
        px-6
        text-center
      "
    >
      {/* MOON */}

      <div
        className="
          absolute
          left-8
          top-8
          h-8
          w-8
          rounded-full
          bg-[var(--archive-gold-soft)]/80
          shadow-[0_0_25px_rgba(240,196,130,0.15)]
        "
      />

      <div
        className="
          absolute
          left-6
          top-6
          h-8
          w-8
          translate-x-2
          translate-y-[-2px]
          rounded-full
          bg-[#111634]
        "
      />

      {/* STARS */}

      <span className="absolute right-[18%] top-[18%] h-1 w-1 rounded-full bg-white/50" />

      <span className="absolute left-[20%] top-[28%] h-0.5 w-0.5 rounded-full bg-white/30" />

      <span className="absolute right-[30%] top-[38%] h-0.5 w-0.5 rounded-full bg-white/40" />

      {/* ICON */}

      <div
        className="
          relative
          flex
          h-14
          w-14
          items-center
          justify-center
          rounded-full
          border
          border-[var(--archive-pink-soft)]/25
          bg-[var(--archive-pink)]/10
          text-[var(--archive-pink-soft)]
        "
      >
        {cameraStarting ? (
          <Loader2 size={21} className="animate-spin" />
        ) : (
          <Camera size={21} />
        )}
      </div>

      <p
        className="
          relative
          mt-4
          text-sm
          font-medium
          text-white/75
        "
      >
        {cameraStarting ? "Menyiapkan kamera..." : "Kamera siap digunakan"}
      </p>

      <p
        className="
          relative
          mt-1.5
          max-w-xs
          text-[10px]
          leading-5
          text-white/35
        "
      >
        Izinkan akses kamera untuk mengabadikan empat momen terbaikmu.
      </p>

      {!cameraStarting && (
        <button
          type="button"
          onClick={onStartCamera}
          className="
            relative
            mt-5
            inline-flex
            items-center
            gap-2
            rounded-full
            border
            border-[var(--archive-pink-soft)]/30
            bg-[var(--archive-pink)]/15
            px-5
            py-2.5
            text-[10px]
            font-semibold
            text-white/80
            transition
            hover:bg-[var(--archive-pink)]/25
          "
        >
          <Camera size={12} />
          Nyalakan Kamera
        </button>
      )}
    </div>
  );
}

/* =========================================================
   STRIP PREVIEW PANEL
========================================================= */

interface StripPreviewPanelProps {
  photos: string[];
  stripPreviewUrl: string | null;
  stage: Stage;
}

function StripPreviewPanel({
  photos,
  stripPreviewUrl,
  stage,
}: StripPreviewPanelProps) {
  const previewPhotos = photos.slice(0, PHOTO_COUNT);

  return (
    <aside
      className="
        rounded-2xl
        border
        border-white/[0.07]
        bg-white/[0.025]
        p-3
        backdrop-blur-md
        sm:p-4
      "
    >
      {/* HEADER */}

      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <div>
          <p
            className="
              text-[9px]
              font-semibold
              uppercase
              tracking-[0.16em]
              text-[var(--archive-text)]/75
            "
          >
            Strip Preview
          </p>

          <p
            className="
              mt-1
              text-[8px]
              text-[var(--archive-muted)]/40
            "
          >
            {previewPhotos.length} /{PHOTO_COUNT} foto
          </p>
        </div>

        <Images
          size={13}
          className="
            text-[var(--archive-gold-soft)]/60
          "
        />
      </div>

      {/* STRIP */}

      <div
        className="
          rounded-xl
          border
          border-white/[0.07]
          bg-[#080b20]/60
          p-2
        "
      >
        {stripPreviewUrl && (stage === "review" || stage === "done") ? (
          <div className="relative overflow-hidden rounded-lg">
            <img
              src={stripPreviewUrl}
              alt="Preview photo strip"
              className="
                block
                h-auto
                w-full
                object-contain
              "
            />

            {stage === "done" && (
              <div
                className="
                  absolute
                  left-1/2
                  top-2
                  flex
                  -translate-x-1/2
                  items-center
                  gap-1
                  rounded-full
                  border
                  border-emerald-300/20
                  bg-[#080b20]/70
                  px-2
                  py-1
                  text-[7px]
                  font-medium
                  text-emerald-200
                  backdrop-blur-md
                "
              >
                <Check size={8} />
                Tersimpan
              </div>
            )}
          </div>
        ) : (
          <div
            className="
              flex
              min-h-[260px]
              flex-col
              gap-2
              rounded-lg
              border
              border-dashed
              border-white/[0.07]
              p-2
            "
          >
            {Array.from({
              length: PHOTO_COUNT,
            }).map((_, index) => {
              const photo = previewPhotos[index];

              return (
                <div
                  key={index}
                  className="
                    relative
                    aspect-[4/3]
                    overflow-hidden
                    rounded-md
                    border
                    border-white/[0.06]
                    bg-white/[0.025]
                  "
                >
                  {photo ? (
                    <img
                      src={photo}
                      alt={`Foto ${index + 1}`}
                      className="
                        h-full
                        w-full
                        object-cover
                      "
                    />
                  ) : (
                    <div
                      className="
                        absolute
                        inset-0
                        flex
                        items-center
                        justify-center
                      "
                    >
                      <span
                        className="
                          flex
                          h-5
                          w-5
                          items-center
                          justify-center
                          rounded-full
                          border
                          border-white/[0.08]
                          text-[7px]
                          text-white/25
                        "
                      >
                        {index + 1}
                      </span>
                    </div>
                  )}

                  <span
                    className="
                      absolute
                      left-1.5
                      top-1.5
                      rounded-full
                      bg-[#080b20]/60
                      px-1.5
                      py-0.5
                      text-[7px]
                      text-white/45
                      backdrop-blur-sm
                    "
                  >
                    {index + 1}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* HINT */}

      <div
        className="
          mt-3
          flex
          items-start
          gap-2
          px-1
        "
      >
        <Sparkles
          size={10}
          className="
            mt-0.5
            shrink-0
            text-[var(--archive-gold-soft)]/50
          "
        />

        <p
          className="
            text-[8px]
            leading-4
            text-[var(--archive-muted)]/35
          "
        >
          {stage === "select-template"
            ? "Hasil foto akan muncul di sini."
            : stage === "camera" || stage === "countdown"
              ? "Setiap jepretan akan masuk ke strip."
              : "Preview siap disimpan sebagai kenangan."}
        </p>
      </div>
    </aside>
  );
}
