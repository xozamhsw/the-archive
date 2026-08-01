"use client";

import { useState } from "react";
import Image from "next/image";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  created_at: string;
  [key: string]: unknown;
}

export default function TestUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<CloudinaryUploadResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedToFirestore, setSavedToFirestore] = useState(false);

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSavedToFirestore(false);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData: { error?: string } = await res.json();
        throw new Error(errData.error || "Upload gagal");
      }

      const data: CloudinaryUploadResult = await res.json();
      setResult(data);

      // Simpan metadata ke Firestore
      await addDoc(collection(db, "gallery"), {
        url: data.secure_url,
        publicId: data.public_id,
        format: data.format,
        width: data.width,
        height: data.height,
        bytes: data.bytes,
        createdAt: serverTimestamp(),
      });

      setSavedToFirestore(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-4">
        Test Upload Cloudinary + Firestore
      </h1>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="mb-4 block"
      />

      <button
        onClick={handleUpload}
        disabled={!file || loading}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? "Uploading..." : "Upload"}
      </button>

      {error && <p className="text-red-600 mt-4">Error: {error}</p>}

      {result && (
        <div className="mt-6">
          <p className="text-green-600 font-medium">
            Upload ke Cloudinary berhasil!
          </p>
          {savedToFirestore && (
            <p className="text-green-600 font-medium">
              Metadata tersimpan ke Firestore!
            </p>
          )}
          <Image
            src={result.secure_url}
            alt="uploaded"
            className="mt-2 rounded max-w-full"
            width={result.width}
            height={result.height}
          />
          <pre className="text-xs bg-gray-100 p-2 mt-2 overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
