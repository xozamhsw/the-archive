"use client";

import Link from "next/link";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

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

const PHOTO_COUNT = 4;

const COUNTDOWN_START = 3;

const MAX_CAPTURE_WIDTH = 960;

const CAPTURE_QUALITY = 0.88;

const STRIP_WIDTH = 600;

const STRIP_HEIGHT = 1800;

type Stage = "select-template" | "camera" | "countdown" | "review" | "done";

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

    image.onerror = () => reject(new Error("Gagal membaca hasil foto."));

    image.src = src;
  });
}

export default function PhotoboothPage() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const captureCanvasRef = useRef<HTMLCanvasElement>(null);

  const stripCanvasRef = useRef<HTMLCanvasElement>(null);

  const streamRef = useRef<MediaStream | null>(null);

  const photoUrlsRef = useRef<string[]>([]);

  const stripUrlRef = useRef<string | null>(null);

  const sequenceRunningRef = useRef(false);

  const sequenceCancelledRef = useRef(false);

  const mountedRef = useRef(true);

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

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());

    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraReady(false);
  }, []);

  const revokePhotoUrls = useCallback(() => {
    photoUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));

    photoUrlsRef.current = [];
  }, []);

  const revokeStripUrl = useCallback(() => {
    if (stripUrlRef.current) {
      URL.revokeObjectURL(stripUrlRef.current);

      stripUrlRef.current = null;
    }
  }, []);

  const clearLocalMedia = useCallback(() => {
    revokePhotoUrls();

    revokeStripUrl();

    setPhotos([]);

    setStripBlob(null);

    setStripPreviewUrl(null);
  }, [revokePhotoUrls, revokeStripUrl]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      sequenceCancelledRef.current = true;

      sequenceRunningRef.current = false;

      streamRef.current?.getTracks().forEach((track) => track.stop());

      streamRef.current = null;

      photoUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));

      photoUrlsRef.current = [];

      if (stripUrlRef.current) {
        URL.revokeObjectURL(stripUrlRef.current);

        stripUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (
      (stage === "camera" || stage === "countdown") &&
      videoRef.current &&
      streamRef.current
    ) {
      videoRef.current.srcObject = streamRef.current;

      videoRef.current.play().catch(() => undefined);
    }
  }, [stage]);

  async function startCamera() {
    setError(null);

    setCameraStarting(true);

    setCameraReady(false);

    sequenceCancelledRef.current = false;

    stopCamera();

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Browser ini tidak mendukung akses kamera.");

      setCameraStarting(false);

      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",

          width: {
            ideal: 1280,
          },

          height: {
            ideal: 960,
          },
        },

        audio: false,
      });

      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());

        return;
      }

      streamRef.current = stream;

      setStage("camera");
    } catch {
      setError("Tidak bisa mengakses kamera. Pastikan izin kamera diberikan.");
    } finally {
      if (mountedRef.current) {
        setCameraStarting(false);
      }
    }
  }

  async function captureFrame(): Promise<string> {
    const video = videoRef.current;

    const canvas = captureCanvasRef.current;

    if (
      !video ||
      !canvas ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      throw new Error("Kamera belum siap mengambil foto.");
    }

    const scale = Math.min(1, MAX_CAPTURE_WIDTH / video.videoWidth);

    canvas.width = Math.round(video.videoWidth * scale);

    canvas.height = Math.round(video.videoHeight * scale);

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Browser gagal menyiapkan canvas foto.");
    }

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
      // Abaikan jika browser tidak mendukung audio sintetis.
    }
  }

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

  const startSequence = useCallback(async () => {
    if (!cameraReady || sequenceRunningRef.current) {
      return;
    }

    sequenceRunningRef.current = true;

    sequenceCancelledRef.current = false;

    setError(null);

    setStage("countdown");

    const captured: string[] = [];

    try {
      for (let shot = 0; shot < PHOTO_COUNT; shot += 1) {
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

        setFlash(true);

        playShutterSound();

        await delay(120);

        const photoUrl = await captureFrame();

        setFlash(false);

        captured.push(photoUrl);

        setPhotos([...captured]);

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
    }
  }, [cameraReady, clearLocalMedia, stopCamera]);

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

        context.fillStyle = template.bg;

        context.fillRect(0, 0, STRIP_WIDTH, STRIP_HEIGHT);

        context.fillStyle = template.textColor;

        context.font = "700 34px sans-serif";

        context.textAlign = "center";

        context.fillText("THE ARCHIVE", STRIP_WIDTH / 2, 70);

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

        revokePhotoUrls();

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
  }, [photos, revokePhotoUrls, revokeStripUrl, stage, template]);

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

      /**
       * Collection photobooth hanya mewakili
       * foto yang masih tampil di sistem.
       *
       * File Cloudinary tetap menjadi
       * arsip pribadi admin.
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
      /**
       * HANYA Firestore.
       *
       * File Cloudinary sengaja
       * tidak dihapus.
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

  return (
    <main className="min-h-screen bg-[#F5F1FA] px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-lg text-center">
        <p className="mb-2 text-xs font-semibold tracking-[0.22em] text-[#6D4FC2]/55 sm:text-sm">
          VIRTUAL PHOTOBOOTH
        </p>

        <h1 className="mb-7 text-3xl font-bold text-[#3B2E52] sm:mb-8">
          Ambil Momenmu
        </h1>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-600">
            {error}
          </div>
        )}

        {stage === "select-template" && (
          <section className="rounded-2xl border border-[#D8C8F0]/30 bg-white/65 p-4 shadow-sm backdrop-blur-sm sm:p-6">
            <p className="mb-4 font-medium text-[#3B2E52]">Pilih Template</p>

            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {TEMPLATES.map((item) => {
                const selected = template.id === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTemplate(item)}
                    className={`rounded-xl border-2 p-3 transition duration-200 ${
                      selected
                        ? "scale-[1.03] border-[#A78BFA] shadow-sm"
                        : "border-transparent hover:scale-[1.02]"
                    }`}
                    style={{
                      background: item.bg,
                    }}
                    aria-pressed={selected}
                  >
                    <div
                      className="mb-2 h-6 w-full rounded-md"
                      style={{
                        background: item.accent,
                      }}
                    />

                    <p
                      className="text-xs font-medium"
                      style={{
                        color: item.textColor,
                      }}
                    >
                      {item.name}
                    </p>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={startCamera}
              disabled={cameraStarting}
              className="w-full rounded-xl bg-[#A78BFA] py-3 font-medium text-white transition hover:bg-[#6D4FC2] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cameraStarting ? "Menyiapkan Kamera..." : "Nyalakan Kamera"}
            </button>
          </section>
        )}

        {(stage === "camera" || stage === "countdown") && (
          <section className="rounded-2xl border border-[#D8C8F0]/30 bg-white/65 p-3 shadow-sm backdrop-blur-sm sm:p-4">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={() => {
                  setCameraReady(true);

                  videoRef.current?.play().catch(() => undefined);
                }}
                className="h-full w-full scale-x-[-1] object-cover"
              />

              {!cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/55 px-6 text-sm text-white/80">
                  Menyiapkan kamera...
                </div>
              )}

              {stage === "countdown" && cameraReady && (
                <>
                  {countdown > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                      <span className="text-7xl font-bold text-white drop-shadow-lg sm:text-8xl">
                        {countdown}
                      </span>
                    </div>
                  )}

                  {flash && (
                    <div
                      className="absolute inset-0 bg-white"
                      aria-hidden="true"
                    />
                  )}
                </>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 px-1 text-sm text-[#3B2E52]/55">
              <span>
                Foto {Math.min(photos.length + 1, PHOTO_COUNT)} dari{" "}
                {PHOTO_COUNT}
              </span>

              <span>{template.name}</span>
            </div>

            {stage === "camera" && (
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={cancelCaptureSession}
                  className="rounded-xl border border-[#D8C8F0] px-4 py-3 font-medium text-[#3B2E52] transition hover:bg-[#E9D8FD]/55"
                >
                  Batalkan
                </button>

                <button
                  type="button"
                  onClick={startSequence}
                  disabled={!cameraReady}
                  className="rounded-xl bg-[#A78BFA] px-4 py-3 font-medium text-white transition hover:bg-[#6D4FC2] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Mulai Ambil 4 Foto
                </button>
              </div>
            )}

            {stage === "countdown" && (
              <button
                type="button"
                onClick={cancelCaptureSession}
                className="mt-4 w-full rounded-xl border border-red-200 px-4 py-3 text-sm font-medium text-red-500 transition hover:bg-red-50"
              >
                Batalkan Sesi
              </button>
            )}
          </section>
        )}

        {stage === "review" && (
          <section className="rounded-2xl border border-[#D8C8F0]/30 bg-white/65 p-4 shadow-sm backdrop-blur-sm">
            {stripPreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={stripPreviewUrl}
                alt="Hasil photo strip"
                className="mx-auto w-full max-w-[220px] rounded-lg shadow"
              />
            ) : (
              <div className="py-12 text-sm text-[#3B2E52]/55">
                Menyusun photo strip...
              </div>
            )}

            {stripPreviewUrl && (
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={retakeAll}
                  disabled={uploading}
                  className="rounded-xl border border-[#D8C8F0] py-3 font-medium text-[#3B2E52] transition hover:bg-[#E9D8FD] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Ambil Ulang
                </button>

                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={uploading}
                  className="rounded-xl bg-[#A78BFA] py-3 font-medium text-white transition hover:bg-[#6D4FC2] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {uploading ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            )}
          </section>
        )}

        {stage === "done" && stripPreviewUrl && (
          <section className="rounded-2xl border border-[#D8C8F0]/30 bg-white/65 p-4 shadow-sm backdrop-blur-sm">
            <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              Tersimpan! 🎉
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={stripPreviewUrl}
              alt="Hasil photo strip tersimpan"
              className="mx-auto w-full max-w-[220px] rounded-lg shadow"
            />

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleDownload}
                className="rounded-xl bg-[#A78BFA] py-3 font-medium text-white transition hover:bg-[#6D4FC2]"
              >
                Download
              </button>

              <button
                type="button"
                onClick={handleRemoveFromArchiveView}
                disabled={deleting || !uploadedId}
                className="rounded-xl border border-red-300 py-3 font-medium text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? "Menghapus..." : "Hapus dari The Archive"}
              </button>
            </div>

            <p className="mt-3 text-xs leading-5 text-[#3B2E52]/45">
              Jika dihapus, foto tidak lagi tampil di The Archive.
            </p>

            <button
              type="button"
              onClick={retakeAll}
              disabled={deleting}
              className="mt-4 text-sm font-medium text-[#6D4FC2] underline decoration-[#A78BFA]/40 underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Foto lagi
            </button>
          </section>
        )}

        <canvas ref={captureCanvasRef} className="hidden" />

        <canvas ref={stripCanvasRef} className="hidden" />

        <div className="mt-10">
          <Link
            href="/wall"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#A78BFA] px-7 py-3 text-sm font-medium text-white transition hover:bg-[#6D4FC2] sm:px-8"
          >
            Lanjut ke Friendship Wall
          </Link>
        </div>
      </div>
    </main>
  );
}
