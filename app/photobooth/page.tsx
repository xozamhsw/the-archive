"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  serverTimestamp,
  deleteDoc,
  doc,
} from "firebase/firestore";

interface Template {
  id: string;
  name: string;
  bg: string;
  accent: string;
  textColor: string;
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

const STRIP_WIDTH = 600;
const STRIP_HEIGHT = 1800;
const STORAGE_KEY = "the-archive-my-photobooth";

type Stage = "select-template" | "camera" | "countdown" | "review" | "done";

export default function PhotoboothPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const stripCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [stage, setStage] = useState<Stage>("select-template");
  const [template, setTemplate] = useState<Template>(TEMPLATES[0]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [countdown, setCountdown] = useState(3);
  const [flash, setFlash] = useState(false);
  const [stripDataUrl, setStripDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedId, setUploadedId] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 1280, height: 960 },
        audio: false,
      });
      streamRef.current = stream;
      setStage("camera");
    } catch {
      setError("Tidak bisa mengakses kamera. Pastikan izin kamera diberikan.");
    }
  }

  // Pasang stream ke elemen video setelah video ter-mount di DOM
  useEffect(() => {
    if (
      (stage === "camera" || stage === "countdown") &&
      videoRef.current &&
      streamRef.current
    ) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {
        // beberapa browser butuh interaksi user dulu
      });
    }
  }, [stage]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  function captureFrame(): string {
    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    if (!video || !canvas) return "";

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    // Mirror karena selfie
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/jpeg", 0.92);
  }

  // Bunyi shutter sintetis
  function playShutterSound() {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (
          window as Window &
            typeof globalThis & {
              webkitAudioContext?: typeof AudioContext;
            }
        ).webkitAudioContext;

      if (!AudioContextClass) return;

      const audioCtx = new AudioContextClass();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioCtx.currentTime + 0.15,
      );

      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch {
      // abaikan jika tidak support
    }
  }

  const startSequence = useCallback(async () => {
    setStage("countdown");
    const captured: string[] = [];

    for (let shot = 0; shot < 4; shot++) {
      // Hitungan mundur 3, 2, 1
      for (let c = 3; c > 0; c--) {
        setCountdown(c);
        await new Promise((r) => setTimeout(r, 1000));
      }

      // Efek cekrek
      setFlash(true);
      playShutterSound();
      await new Promise((r) => setTimeout(r, 150));
      const photo = captureFrame();
      setFlash(false);

      captured.push(photo);
      setPhotos([...captured]);

      // Jeda antar foto, kecuali setelah foto ke-4
      if (shot < 3) {
        await new Promise((r) => setTimeout(r, 600));
      }
    }

    stopCamera();
    setStage("review");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopCamera]);

  // Susun foto jadi strip setelah 4 foto terkumpul
  useEffect(() => {
    if (stage !== "review" || photos.length !== 4) return;

    const canvas = stripCanvasRef.current;
    if (!canvas) return;
    canvas.width = STRIP_WIDTH;
    canvas.height = STRIP_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = template.bg;
    ctx.fillRect(0, 0, STRIP_WIDTH, STRIP_HEIGHT);

    ctx.fillStyle = template.textColor;
    ctx.font = "bold 34px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("THE ARCHIVE", STRIP_WIDTH / 2, 70);

    const margin = 30;
    const headerH = 110;
    const footerH = 90;
    const gap = 18;
    const slotW = STRIP_WIDTH - margin * 2;
    const slotH = (STRIP_HEIGHT - headerH - footerH - gap * 3) / 4;

    let loaded = 0;
    photos.forEach((src, i) => {
      const img = new window.Image();
      img.onload = () => {
        const y = headerH + i * (slotH + gap);

        ctx.save();
        ctx.strokeStyle = template.accent;
        ctx.lineWidth = 4;
        ctx.strokeRect(margin, y, slotW, slotH);

        const scale = Math.max(slotW / img.width, slotH / img.height);
        const sw = slotW / scale;
        const sh = slotH / scale;
        const sx = (img.width - sw) / 2;
        const sy = (img.height - sh) / 2;
        ctx.drawImage(img, sx, sy, sw, sh, margin, y, slotW, slotH);
        ctx.restore();

        loaded++;
        if (loaded === 4) {
          ctx.fillStyle = template.textColor;
          ctx.font = "20px sans-serif";
          ctx.fillText(
            new Date().toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }),
            STRIP_WIDTH / 2,
            STRIP_HEIGHT - 35,
          );
          setStripDataUrl(canvas.toDataURL("image/jpeg", 0.95));
        }
      };
      img.src = src;
    });
  }, [stage, photos, template]);

  function retakeAll() {
    setPhotos([]);
    setStripDataUrl(null);
    setUploadedId(null);
    setUploadedUrl(null);
    setStage("select-template");
  }

  async function handleUpload() {
    if (!stripDataUrl) return;
    setUploading(true);
    setError(null);

    try {
      const sigRes = await fetch(
        `/api/upload-signature?folder=the-archive/photobooth`,
      );
      if (!sigRes.ok) throw new Error("Gagal mengambil signature");
      const { timestamp, signature, cloudName, apiKey } = await sigRes.json();

      const blob = await (await fetch(stripDataUrl)).blob();
      const formData = new FormData();
      formData.append("file", blob);
      formData.append("api_key", apiKey);
      formData.append("timestamp", timestamp.toString());
      formData.append("signature", signature);
      formData.append("folder", "the-archive/photobooth");

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: "POST", body: formData },
      );
      if (!uploadRes.ok) throw new Error("Upload gagal");
      const data = await uploadRes.json();

      const docRef = await addDoc(collection(db, "photobooth"), {
        url: data.secure_url,
        publicId: data.public_id,
        template: template.id,
        createdAt: serverTimestamp(),
      });

      const stored = localStorage.getItem(STORAGE_KEY);
      const ids: string[] = stored ? JSON.parse(stored) : [];
      ids.push(docRef.id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));

      setUploadedId(docRef.id);
      setUploadedUrl(data.secure_url);
      setStage("done");
    } catch {
      setError("Gagal menyimpan hasil, coba lagi");
    } finally {
      setUploading(false);
    }
  }

  function handleDownload() {
    // Gunakan stripDataUrl (data URL lokal) agar download selalu berhasil
    const url = stripDataUrl;
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `the-archive-photobooth-${Date.now()}.jpg`;
    a.click();
  }

  async function handleDeleteOwn() {
    if (!uploadedId) return;
    const confirmed = window.confirm("Hapus hasil foto ini?");
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "photobooth", uploadedId));
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const ids: string[] = JSON.parse(stored).filter(
          (id: string) => id !== uploadedId,
        );
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
      }
      retakeAll();
    } catch {
      setError("Gagal menghapus, coba lagi");
    }
  }

  return (
    <main className="min-h-screen bg-[#F5F1FA] px-6 py-16">
      <div className="max-w-lg mx-auto text-center">
        <p className="text-[#6D4FC2]/60 text-sm tracking-widest mb-2">
          VIRTUAL PHOTOBOOTH
        </p>
        <h1 className="text-3xl font-bold text-[#3B2E52] mb-8">
          Ambil Momenmu
        </h1>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {stage === "select-template" && (
          <div className="bg-white/60 rounded-2xl p-6 shadow-sm">
            <p className="text-[#3B2E52] font-medium mb-4">Pilih Template</p>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTemplate(t)}
                  className={`rounded-xl p-3 border-2 transition ${
                    template.id === t.id
                      ? "border-[#A78BFA] scale-105"
                      : "border-transparent"
                  }`}
                  style={{ background: t.bg }}
                >
                  <div
                    className="w-full h-6 rounded mb-1"
                    style={{ background: t.accent }}
                  />
                  <p className="text-xs" style={{ color: t.textColor }}>
                    {t.name}
                  </p>
                </button>
              ))}
            </div>
            <button
              onClick={startCamera}
              className="w-full bg-[#A78BFA] text-white py-3 rounded-xl font-medium hover:bg-[#6D4FC2] transition"
            >
              Nyalakan Kamera
            </button>
          </div>
        )}

        {(stage === "camera" || stage === "countdown") && (
          <div className="bg-white/60 rounded-2xl p-4 shadow-sm">
            <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />

              {/* Overlay saat countdown */}
              {stage === "countdown" && (
                <>
                  {/* Tampilkan angka jika countdown masih > 0 */}
                  {countdown > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <span className="text-white text-7xl font-bold drop-shadow-lg">
                        {countdown}
                      </span>
                    </div>
                  )}

                  {/* Flash putih saat efek cekrek */}
                  {flash && (
                    <div
                      className="absolute inset-0 bg-white transition-opacity duration-150"
                      style={{ opacity: flash ? 1 : 0 }}
                    />
                  )}
                </>
              )}
            </div>

            <p className="text-[#3B2E52]/60 text-sm mt-3">
              Foto ke-{photos.length + (stage === "countdown" ? 1 : 0)} / 4
            </p>

            {stage === "camera" && (
              <button
                onClick={startSequence}
                className="w-full mt-4 bg-[#A78BFA] text-white py-3 rounded-xl font-medium hover:bg-[#6D4FC2] transition"
              >
                Mulai Ambil 4 Foto
              </button>
            )}
          </div>
        )}

        {stage === "review" && (
          <div className="bg-white/60 rounded-2xl p-4 shadow-sm">
            {stripDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={stripDataUrl}
                alt="Photo strip"
                className="w-full max-w-[220px] mx-auto rounded-lg shadow"
              />
            ) : (
              <p className="text-[#3B2E52]/60 py-10">Menyusun strip foto...</p>
            )}

            {stripDataUrl && (
              <div className="flex gap-3 mt-4">
                <button
                  onClick={retakeAll}
                  className="flex-1 border border-[#D8C8F0] text-[#3B2E52] py-3 rounded-xl hover:bg-[#E9D8FD] transition"
                >
                  Ambil Ulang
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="flex-1 bg-[#A78BFA] text-white py-3 rounded-xl font-medium hover:bg-[#6D4FC2] transition disabled:opacity-50"
                >
                  {uploading ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            )}
          </div>
        )}

        {stage === "done" && stripDataUrl && (
          <div className="bg-white/60 rounded-2xl p-4 shadow-sm">
            <p className="text-green-600 font-medium mb-3">Tersimpan! 🎉</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={stripDataUrl}
              alt="Photo strip"
              className="w-full max-w-[220px] mx-auto rounded-lg shadow"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleDownload}
                className="flex-1 bg-[#A78BFA] text-white py-3 rounded-xl font-medium hover:bg-[#6D4FC2] transition"
              >
                Download
              </button>
              <button
                onClick={handleDeleteOwn}
                className="flex-1 border border-red-300 text-red-500 py-3 rounded-xl hover:bg-red-50 transition"
              >
                Hapus
              </button>
            </div>
            <button
              onClick={retakeAll}
              className="w-full mt-3 text-sm text-[#6D4FC2] underline"
            >
              Foto lagi
            </button>
          </div>
        )}

        <canvas ref={captureCanvasRef} className="hidden" />
        <canvas ref={stripCanvasRef} className="hidden" />

        <div className="mt-10">
          <Link
            href="/wall"
            className="inline-block bg-[#A78BFA] text-white px-8 py-3 rounded-full font-medium hover:bg-[#6D4FC2] transition"
          >
            Lanjut ke Friendship Wall
          </Link>
        </div>
      </div>
    </main>
  );
}
