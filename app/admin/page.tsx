"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";

export default function AdminDashboard() {
  const [photoCount, setPhotoCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
    const unsubPhotos = onSnapshot(
      query(collection(db, "photobooth"), orderBy("createdAt", "desc")),
      (snapshot) => setPhotoCount(snapshot.size),
    );

    const unsubMessages = onSnapshot(
      query(collection(db, "wall"), orderBy("createdAt", "desc")),
      (snapshot) => setMessageCount(snapshot.size),
    );

    return () => {
      unsubPhotos();
      unsubMessages();
    };
  }, []);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#3B2E52]">Dashboard</h1>
        <p className="text-sm text-[#6D4FC2]/60 mt-1">
          Selamat datang di panel admin The Archive
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <Link
          href="/admin/monitoring-photo"
          className="bg-white/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#A78BFA]/20 flex items-center justify-center group-hover:bg-[#A78BFA]/30 transition">
              <svg
                className="w-6 h-6 text-[#A78BFA]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-3xl font-bold text-[#3B2E52]">{photoCount}</p>
              <p className="text-sm text-[#6D4FC2]/60">Foto Photobooth</p>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/wall"
          className="bg-white/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#A78BFA]/20 flex items-center justify-center group-hover:bg-[#A78BFA]/30 transition">
              <svg
                className="w-6 h-6 text-[#A78BFA]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
            <div>
              <p className="text-3xl font-bold text-[#3B2E52]">
                {messageCount}
              </p>
              <p className="text-sm text-[#6D4FC2]/60">Pesan Wall</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
