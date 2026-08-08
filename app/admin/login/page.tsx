"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { useRouter } from "next/navigation";

import { auth, verifyAdminSession } from "@/lib/firebase";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [checking, setChecking] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      void (async () => {
        if (!currentUser) {
          if (!cancelled) {
            setChecking(false);
          }

          return;
        }

        /**
         * Anonymous visitor tidak boleh
         * dianggap sebagai admin.
         */
        if (currentUser.isAnonymous) {
          if (!cancelled) {
            setChecking(false);
          }

          return;
        }

        const isAdmin = await verifyAdminSession(currentUser);

        if (cancelled) {
          return;
        }

        if (isAdmin) {
          router.replace("/admin");
          return;
        }

        await signOut(auth).catch(() => undefined);

        if (!cancelled) {
          setError("Akun ini tidak memiliki akses admin.");

          setChecking(false);
        }
      })();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setError("Email dan password harus diisi.");

      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        trimmedEmail,
        password,
      );

      const isAdmin = await verifyAdminSession(credential.user);

      if (!isAdmin) {
        await signOut(auth).catch(() => undefined);

        setError("Akun ini tidak memiliki akses admin.");

        return;
      }

      router.replace("/admin");
    } catch (loginError) {
      console.error("Admin login error:", loginError);

      setError("Email atau password tidak sesuai.");
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4F0F7] px-6">
        <div className="text-center">
          <div className="relative mx-auto h-11 w-11">
            <div className="absolute inset-0 rounded-full border border-[#CBBCE1]" />

            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[#6D4FC2]" />
          </div>

          <p className="mt-5 text-xs font-medium tracking-[0.12em] text-[#3B2E52]/45">
            CHECKING ACCESS
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F4F0F7] text-[#342942]">
      <div className="grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
        {/* =========================================
            LEFT — ARCHIVE COVER
        ========================================== */}
        <section className="relative hidden overflow-hidden border-r border-[#3B2E52]/10 bg-[#30263E] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
          {/* Decorative glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-24 top-[-120px] h-[420px] w-[420px] rounded-full bg-[#A78BFA]/20 blur-[100px]"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-40 -right-24 h-[520px] w-[520px] rounded-full bg-[#D8C8F0]/10 blur-[120px]"
          />

          {/* Tiny dots */}
          <div
            aria-hidden="true"
            className="absolute right-12 top-12 grid grid-cols-4 gap-2 opacity-25"
          >
            {Array.from({
              length: 16,
            }).map((_, index) => (
              <span key={index} className="h-1 w-1 rounded-full bg-white" />
            ))}
          </div>

          {/* TOP */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-3">
              <span className="h-px w-8 bg-[#C7B4F5]" />

              <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#D8C8F0]">
                Private Access
              </span>
            </div>
          </div>

          {/* CENTER */}
          <div className="relative z-10 max-w-xl">
            <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-[1.25rem] border border-white/15 bg-white/10 backdrop-blur-sm">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-7 w-7"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 7.5A2.5 2.5 0 016.5 5h11A2.5 2.5 0 0120 7.5v9a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 014 16.5v-9z"
                />

                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 5V3.75M16 5V3.75M8 11h8M8 15h5"
                />
              </svg>
            </div>

            <p className="mb-4 text-xs font-medium uppercase tracking-[0.28em] text-[#C7B4F5]">
              The Archive
            </p>

            <h1 className="max-w-lg text-[3.4rem] font-semibold leading-[0.98] tracking-[-0.055em] xl:text-[4.6rem]">
              Some memories
              <span className="block text-[#C7B4F5]">deserve a keeper.</span>
            </h1>

            <p className="mt-7 max-w-md text-sm leading-7 text-white/55 xl:text-base xl:leading-8">
              Sebuah ruang kecil untuk menjaga foto, pesan, dan kenangan yang
              terlalu berarti untuk dibiarkan lewat begitu saja.
            </p>
          </div>

          {/* BOTTOM */}
          <div className="relative z-10">
            <div className="flex items-center justify-between border-t border-white/10 pt-6">
              <div>
                <p className="text-xs font-medium text-white/75">
                  Admin Workspace
                </p>

                <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/30">
                  The Archive · Private
                </p>
              </div>

              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Secure
              </div>
            </div>
          </div>
        </section>

        {/* =========================================
            RIGHT — LOGIN
        ========================================== */}
        <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10 sm:px-8 lg:px-10 xl:px-16">
          {/* Mobile decorative */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-28 -top-28 h-72 w-72 rounded-full bg-[#A78BFA]/10 blur-[90px]"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-[#D8C8F0]/30 blur-[90px]"
          />

          <div className="relative z-10 w-full max-w-[430px]">
            {/* MOBILE BRAND */}
            <div className="mb-12 lg:hidden">
              <div className="mb-7 flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#342942] text-white shadow-sm">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-5 w-5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 7.5A2.5 2.5 0 016.5 5h11A2.5 2.5 0 0120 7.5v9a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 014 16.5v-9z"
                    />

                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 11h8M8 15h5"
                    />
                  </svg>
                </div>

                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6D4FC2]/45">
                  Private Access
                </span>
              </div>

              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6D4FC2]/55">
                The Archive
              </p>
            </div>

            {/* FORM HEADER */}
            <header className="mb-9">
              <p className="mb-3 hidden text-xs font-semibold uppercase tracking-[0.22em] text-[#6D4FC2]/45 lg:block">
                Welcome back
              </p>

              <h2 className="text-[2rem] font-semibold leading-tight tracking-[-0.045em] text-[#342942] sm:text-[2.35rem]">
                Masuk ke ruang
                <span className="block text-[#6D4FC2]">pengelola.</span>
              </h2>

              <p className="mt-4 max-w-sm text-sm leading-6 text-[#3B2E52]/48">
                Gunakan akun admin yang terdaftar untuk mengelola seluruh isi
                The Archive.
              </p>
            </header>

            {/* LOGIN FORM */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* EMAIL */}
              <div>
                <label
                  htmlFor="admin-email"
                  className="mb-2.5 block text-[11px] font-semibold uppercase tracking-[0.13em] text-[#3B2E52]/55"
                >
                  Email
                </label>

                <div className="group relative">
                  <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#6D4FC2]/35 transition group-focus-within:text-[#6D4FC2]">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-5 w-5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 6.75A1.75 1.75 0 015.75 5h12.5A1.75 1.75 0 0120 6.75v10.5A1.75 1.75 0 0118.25 19H5.75A1.75 1.75 0 014 17.25V6.75z"
                      />

                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 7l7 5 7-5"
                      />
                    </svg>
                  </div>

                  <input
                    id="admin-email"
                    type="email"
                    value={email}
                    autoComplete="email"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="h-14 w-full rounded-2xl border border-[#D8C8F0]/75 bg-white/75 pl-12 pr-4 text-sm text-[#342942] shadow-[0_1px_0_rgba(59,46,82,0.02)] outline-none transition placeholder:text-[#3B2E52]/25 hover:border-[#B9A4D8] focus:border-[#8E70D4] focus:bg-white focus:ring-4 focus:ring-[#A78BFA]/10"
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div>
                <div className="mb-2.5 flex items-center justify-between">
                  <label
                    htmlFor="admin-password"
                    className="text-[11px] font-semibold uppercase tracking-[0.13em] text-[#3B2E52]/55"
                  >
                    Password
                  </label>

                  <span className="text-[10px] text-[#3B2E52]/30">
                    Admin only
                  </span>
                </div>

                <div className="group relative">
                  <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#6D4FC2]/35 transition group-focus-within:text-[#6D4FC2]">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-5 w-5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.5 10V8a5.5 5.5 0 0111 0v2M5.75 10h12.5A1.75 1.75 0 0120 11.75v6.5A1.75 1.75 0 0118.25 20H5.75A1.75 1.75 0 014 18.25v-6.5A1.75 1.75 0 015.75 10z"
                      />
                    </svg>
                  </div>

                  <input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    autoComplete="current-password"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Masukkan password"
                    className="h-14 w-full rounded-2xl border border-[#D8C8F0]/75 bg-white/75 pl-12 pr-14 text-sm text-[#342942] shadow-[0_1px_0_rgba(59,46,82,0.02)] outline-none transition placeholder:text-[#3B2E52]/25 hover:border-[#B9A4D8] focus:border-[#8E70D4] focus:bg-white focus:ring-4 focus:ring-[#A78BFA]/10"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-[#6D4FC2]/45 transition hover:bg-[#F1EBF7] hover:text-[#6D4FC2]"
                    aria-label={
                      showPassword
                        ? "Sembunyikan password"
                        : "Tampilkan password"
                    }
                  >
                    {showPassword ? (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="h-5 w-5"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.9 5.2A10.4 10.4 0 0112 5c5.2 0 8.5 4.7 9 7-.2.9-.8 2.1-1.7 3.2M6.2 6.2C4.4 7.5 3.3 9.5 3 12c.5 2.3 3.8 7 9 7 1.3 0 2.5-.3 3.5-.7"
                        />
                      </svg>
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="h-5 w-5"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 12c.5-2.3 3.8-7 9-7s8.5 4.7 9 7c-.5 2.3-3.8 7-9 7s-8.5-4.7-9-7z"
                        />

                        <circle cx="12" cy="12" r="2.5" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* ERROR */}
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-2xl border border-red-200/80 bg-red-50/80 px-4 py-3.5"
                >
                  <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-[11px] font-bold text-red-500">
                    !
                  </div>

                  <p className="text-xs leading-5 text-red-600">{error}</p>
                </div>
              )}

              {/* SUBMIT */}
              <button
                type="submit"
                disabled={submitting}
                className="group relative mt-2 flex h-14 w-full items-center justify-center overflow-hidden rounded-2xl bg-[#342942] px-6 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(52,41,66,0.16)] transition duration-300 hover:bg-[#49375F] hover:shadow-[0_14px_38px_rgba(52,41,66,0.2)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {submitting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Memverifikasi
                    </>
                  ) : (
                    <>
                      Masuk ke Archive
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 12h14M14 7l5 5-5 5"
                        />
                      </svg>
                    </>
                  )}
                </span>
              </button>
            </form>

            {/* FOOTER */}
            <div className="mt-10 flex items-center gap-4">
              <span className="h-px flex-1 bg-[#3B2E52]/10" />

              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#3B2E52]/25">
                Authorized Access Only
              </p>

              <span className="h-px flex-1 bg-[#3B2E52]/10" />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
