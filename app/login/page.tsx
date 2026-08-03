"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  // Cek jika user sudah login, redirect ke admin
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Sudah login, redirect ke admin dashboard
        router.push("/admin");
      } else {
        setChecking(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/admin");
    } catch {
      setError("Email atau password salah");
    } finally {
      setLoading(false);
    }
  }

  // Loading state saat mengecek autentikasi
  if (checking) {
    return (
      <main className="min-h-screen bg-[#F5F1FA] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#A78BFA] mx-auto mb-4"></div>
          <p className="text-[#3B2E52]/60">Memeriksa sesi...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5F1FA] flex items-center justify-center px-6">
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 max-w-sm w-full shadow-sm">
        {/* Logo/Brand */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[#3B2E52] mb-1">
            The Archive
          </h1>
          <p className="text-sm text-[#6D4FC2]/60">Admin Panel</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#3B2E52] mb-1">
              Email
            </label>
            <input
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-[#D8C8F0] bg-white focus:outline-none focus:ring-2 focus:ring-[#A78BFA] text-[#3B2E52] placeholder-[#3B2E52]/40 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#3B2E52] mb-1">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-[#D8C8F0] bg-white focus:outline-none focus:ring-2 focus:ring-[#A78BFA] text-[#3B2E52] placeholder-[#3B2E52]/40 transition"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#A78BFA] text-white py-3 rounded-xl font-medium hover:bg-[#6D4FC2] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Memproses...
              </span>
            ) : (
              "Masuk"
            )}
          </button>
        </form>

        <p className="text-center text-xs text-[#3B2E52]/40 mt-6">
          Halaman khusus admin The Archive
        </p>
      </div>
    </main>
  );
}
