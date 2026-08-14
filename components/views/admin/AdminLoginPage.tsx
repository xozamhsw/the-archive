"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { useRouter } from "next/navigation";

import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { auth, verifyAdminSession } from "@/lib/firebase";

import ArchiveShell from "@/components/ui/ArchiveShell";
import ArchiveContainer from "@/components/ui/ArchiveContainer";
import SectionBadge from "@/components/ui/SectionBadge";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);

  const [error, setError] = useState<string | null>(null);

  /*
   * =========================================================
   * CHECK ADMIN SESSION
   * =========================================================
   */

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

        try {
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
        } catch (sessionError) {
          console.error("Admin session verification error:", sessionError);

          if (!cancelled) {
            await signOut(auth).catch(() => undefined);

            setError("Sesi admin tidak dapat diverifikasi.");
            setChecking(false);
          }
        }
      })();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [router]);

  /*
   * =========================================================
   * LOGIN
   * =========================================================
   */

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

  /*
   * =========================================================
   * CHECKING SCREEN
   * =========================================================
   */

  if (checking) {
    return (
      <ArchiveShell>
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden">
          {/* AMBIENT BACKGROUND */}

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden"
          >
            <div
              className="
                archive-ambient-pulse
                absolute
                left-[8%]
                top-[10%]
                h-[280px]
                w-[280px]
                rounded-full
                bg-[#9c5d94]/[0.045]
                blur-[90px]
              "
            />

            <div
              className="
                absolute
                right-[5%]
                bottom-[8%]
                h-[300px]
                w-[300px]
                rounded-full
                bg-[var(--archive-gold)]/[0.025]
                blur-[110px]
              "
            />

            <div className="absolute left-[20%] top-[16%] text-[var(--archive-gold-soft)]/20">
              ✦
            </div>

            <div className="absolute right-[18%] top-[25%] text-[var(--archive-pink-soft)]/20">
              ✧
            </div>

            <div className="absolute bottom-[20%] left-[12%] text-[var(--archive-pink-soft)]/15">
              ✦
            </div>
          </div>

          <div className="relative z-10 text-center">
            <div
              className="
                mx-auto
                flex
                h-14
                w-14
                items-center
                justify-center
                rounded-2xl
                border
                border-white/[0.08]
                bg-[#0b0e24]
                shadow-[0_15px_50px_rgba(0,0,0,0.22)]
              "
            >
              <div
                className="
                  h-5
                  w-5
                  animate-spin
                  rounded-full
                  border
                  border-white/10
                  border-t-[var(--archive-pink-soft)]
                "
              />
            </div>

            <p
              className="
                mt-5
                text-[9px]
                font-semibold
                uppercase
                tracking-[0.2em]
                text-[var(--archive-muted)]/45
              "
            >
              Checking Access
            </p>

            <p
              className="
                mt-2
                text-xs
                text-[var(--archive-muted)]/30
              "
            >
              Memeriksa ruang pengelola...
            </p>
          </div>
        </main>
      </ArchiveShell>
    );
  }

  return (
    <ArchiveShell>
      <main className="relative min-h-screen overflow-hidden">
        {/* =====================================================
            AMBIENT BACKGROUND
        ====================================================== */}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          {/* Purple glow */}

          <div
            className="
              archive-ambient-pulse
              absolute
              left-[3%]
              top-[8%]
              h-[280px]
              w-[280px]
              rounded-full
              bg-[#9c5d94]/[0.045]
              blur-[90px]
              sm:h-[360px]
              sm:w-[360px]
            "
          />

          {/* Pink glow */}

          <div
            className="
              absolute
              right-[2%]
              top-[15%]
              h-[260px]
              w-[260px]
              rounded-full
              bg-[var(--archive-pink-soft)]/[0.025]
              blur-[100px]
            "
          />

          {/* Gold glow */}

          <div
            className="
              absolute
              bottom-[5%]
              left-[40%]
              h-[300px]
              w-[300px]
              rounded-full
              bg-[var(--archive-gold)]/[0.025]
              blur-[110px]
            "
          />

          {/* Tiny stars */}

          <div className="absolute left-[12%] top-[18%] text-[var(--archive-gold-soft)]/20">
            ✦
          </div>

          <div className="absolute left-[34%] top-[9%] text-[var(--archive-pink-soft)]/20">
            ·
          </div>

          <div className="absolute right-[15%] top-[27%] text-[var(--archive-gold-soft)]/20">
            ✧
          </div>

          <div className="absolute bottom-[18%] left-[9%] text-[var(--archive-pink-soft)]/15">
            ✦
          </div>

          <div className="absolute bottom-[12%] right-[20%] text-[var(--archive-gold-soft)]/15">
            ·
          </div>
        </div>

        <ArchiveContainer size="wide">
          <div
            className="
              relative
              flex
              min-h-screen
              items-center
              py-10
              sm:py-14
              lg:py-16
            "
          >
            <div
              className="
                grid
                w-full
                gap-10
                lg:grid-cols-[0.9fr_1.1fr]
                lg:items-center
                lg:gap-16
                xl:grid-cols-[1fr_1fr]
                xl:gap-20
              "
            >
              {/* =================================================
                  LEFT — ARCHIVE INTRO
              ================================================== */}

              <section className="relative">
                <div className="max-w-xl">
                  <SectionBadge icon={<ShieldCheck size={11} />}>
                    Private Access
                  </SectionBadge>

                  <div className="mt-7">
                    <p
                      className="
                        text-[9px]
                        font-semibold
                        uppercase
                        tracking-[0.24em]
                        text-[var(--archive-gold-soft)]/55
                      "
                    >
                      The Archive
                    </p>

                    <h1
                      className="
                        archive-display
                        mt-4
                        text-[clamp(2.8rem,7vw,5.5rem)]
                        leading-[0.9]
                        tracking-[-0.055em]
                        text-[var(--archive-text)]
                      "
                    >
                      Some memories
                      <br />
                      <span className="text-[var(--archive-pink-soft)]/90">
                        need a keeper.
                      </span>
                    </h1>

                    <p
                      className="
                        mt-6
                        max-w-lg
                        text-sm
                        leading-7
                        text-[var(--archive-muted)]/65
                        sm:text-[15px]
                      "
                    >
                      Sebuah ruang pribadi untuk menjaga foto, pesan, dan
                      kenangan yang terlalu berarti untuk dibiarkan berlalu.
                    </p>
                  </div>

                  {/* ARCHIVE NOTE */}

                  <div
                    className="
                      mt-9
                      max-w-md
                      rounded-[22px]
                      border
                      border-white/[0.07]
                      bg-[#0b0e24]/75
                      p-5
                      shadow-[0_15px_50px_rgba(0,0,0,0.18)]
                      backdrop-blur-xl
                    "
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="
                          flex
                          h-10
                          w-10
                          shrink-0
                          items-center
                          justify-center
                          rounded-xl
                          border
                          border-[var(--archive-gold)]/15
                          bg-[var(--archive-gold)]/[0.04]
                        "
                      >
                        <KeyRound
                          size={16}
                          className="text-[var(--archive-gold-soft)]/65"
                        />
                      </div>

                      <div>
                        <p
                          className="
                            text-xs
                            font-semibold
                            text-[var(--archive-text)]
                          "
                        >
                          Ruang pengelola
                        </p>

                        <p
                          className="
                            mt-1.5
                            text-[10px]
                            leading-5
                            text-[var(--archive-muted)]/45
                          "
                        >
                          Hanya akun yang telah mendapatkan izin admin yang
                          dapat memasuki ruang ini.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* STATUS */}

                  <div className="mt-7 flex items-center gap-3">
                    <span
                      className="
                        flex
                        h-7
                        w-7
                        items-center
                        justify-center
                        rounded-full
                        border
                        border-emerald-400/15
                        bg-emerald-400/[0.04]
                      "
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
                    </span>

                    <div>
                      <p
                        className="
                          text-[9px]
                          font-semibold
                          uppercase
                          tracking-[0.16em]
                          text-[var(--archive-muted)]/45
                        "
                      >
                        Secure Workspace
                      </p>

                      <p
                        className="
                          mt-0.5
                          text-[9px]
                          text-[var(--archive-muted)]/25
                        "
                      >
                        Authorized access only
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* =================================================
                  RIGHT — LOGIN CARD
              ================================================== */}

              <section className="relative">
                <div
                  className="
                    relative
                    overflow-hidden
                    rounded-[26px]
                    border
                    border-white/[0.08]
                    bg-[#0b0e24]
                    p-5
                    shadow-[0_20px_70px_rgba(0,0,0,0.28)]
                    backdrop-blur-xl
                    sm:p-7
                    lg:p-8
                  "
                >
                  {/* CARD GLOW */}

                  <div
                    className="
                      pointer-events-none
                      absolute
                      -right-24
                      -top-24
                      h-56
                      w-56
                      rounded-full
                      bg-[var(--archive-pink-soft)]/[0.065]
                      blur-[80px]
                    "
                  />

                  <div
                    className="
                      pointer-events-none
                      absolute
                      -bottom-24
                      left-1/3
                      h-48
                      w-48
                      rounded-full
                      bg-[var(--archive-gold)]/[0.025]
                      blur-[75px]
                    "
                  />

                  <div className="relative">
                    {/* HEADER */}

                    <header className="mb-7">
                      <div className="flex items-center justify-between">
                        <div
                          className="
                            flex
                            h-11
                            w-11
                            items-center
                            justify-center
                            rounded-xl
                            border
                            border-white/[0.08]
                            bg-white/[0.025]
                            text-[var(--archive-pink-soft)]/75
                          "
                        >
                          <LockKeyhole size={18} />
                        </div>

                        <Sparkles
                          size={16}
                          className="text-[var(--archive-gold-soft)]/30"
                        />
                      </div>

                      <p
                        className="
                          mt-6
                          text-[9px]
                          font-semibold
                          uppercase
                          tracking-[0.2em]
                          text-[var(--archive-gold-soft)]/50
                        "
                      >
                        Welcome back
                      </p>

                      <h2
                        className="
                          archive-display
                          mt-2
                          text-[clamp(1.8rem,4vw,2.5rem)]
                          leading-tight
                          tracking-[-0.04em]
                          text-[var(--archive-text)]
                        "
                      >
                        Masuk ke ruang
                        <br />
                        <span className="text-[var(--archive-pink-soft)]/90">
                          pengelola.
                        </span>
                      </h2>

                      <p
                        className="
                          mt-3
                          max-w-sm
                          text-xs
                          leading-6
                          text-[var(--archive-muted)]/45
                        "
                      >
                        Gunakan akun admin yang terdaftar untuk mengelola
                        seluruh isi The Archive.
                      </p>
                    </header>

                    {/* FORM */}

                    <form onSubmit={handleSubmit} className="space-y-5">
                      {/* EMAIL */}

                      <div>
                        <label
                          htmlFor="admin-email"
                          className="
                            mb-2
                            block
                            text-[9px]
                            font-semibold
                            uppercase
                            tracking-[0.16em]
                            text-[var(--archive-muted)]/45
                          "
                        >
                          Email
                        </label>

                        <div className="group relative">
                          <div
                            className="
                              pointer-events-none
                              absolute
                              left-4
                              top-1/2
                              -translate-y-1/2
                              text-[var(--archive-pink-soft)]/40
                              transition-colors
                              group-focus-within:text-[var(--archive-pink-soft)]
                            "
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              className="h-4 w-4"
                              stroke="currentColor"
                              strokeWidth="1.5"
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
                            disabled={submitting}
                            onChange={(event) => {
                              setEmail(event.target.value);

                              if (error) {
                                setError(null);
                              }
                            }}
                            placeholder="you@example.com"
                            className="
                              h-12
                              w-full
                              rounded-xl
                              border
                              border-white/[0.07]
                              bg-white/[0.02]
                              pl-11
                              pr-4
                              text-xs
                              text-[var(--archive-text)]
                              outline-none
                              transition-all
                              placeholder:text-[var(--archive-muted)]/25
                              hover:border-white/[0.12]
                              focus:border-[var(--archive-gold)]/30
                              focus:bg-white/[0.035]
                              focus:shadow-[0_0_25px_rgba(190,160,100,0.035)]
                              disabled:cursor-not-allowed
                              disabled:opacity-50
                            "
                          />
                        </div>
                      </div>

                      {/* PASSWORD */}

                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <label
                            htmlFor="admin-password"
                            className="
                              text-[9px]
                              font-semibold
                              uppercase
                              tracking-[0.16em]
                              text-[var(--archive-muted)]/45
                            "
                          >
                            Password
                          </label>

                          <span
                            className="
                              text-[8px]
                              uppercase
                              tracking-[0.12em]
                              text-[var(--archive-muted)]/25
                            "
                          >
                            Admin only
                          </span>
                        </div>

                        <div className="group relative">
                          <div
                            className="
                              pointer-events-none
                              absolute
                              left-4
                              top-1/2
                              -translate-y-1/2
                              text-[var(--archive-pink-soft)]/40
                              transition-colors
                              group-focus-within:text-[var(--archive-pink-soft)]
                            "
                          >
                            <LockKeyhole size={15} />
                          </div>

                          <input
                            id="admin-password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            autoComplete="current-password"
                            disabled={submitting}
                            onChange={(event) => {
                              setPassword(event.target.value);

                              if (error) {
                                setError(null);
                              }
                            }}
                            placeholder="Masukkan password"
                            className="
                              h-12
                              w-full
                              rounded-xl
                              border
                              border-white/[0.07]
                              bg-white/[0.02]
                              pl-11
                              pr-12
                              text-xs
                              text-[var(--archive-text)]
                              outline-none
                              transition-all
                              placeholder:text-[var(--archive-muted)]/25
                              hover:border-white/[0.12]
                              focus:border-[var(--archive-gold)]/30
                              focus:bg-white/[0.035]
                              focus:shadow-[0_0_25px_rgba(190,160,100,0.035)]
                              disabled:cursor-not-allowed
                              disabled:opacity-50
                            "
                          />

                          <button
                            type="button"
                            onClick={() =>
                              setShowPassword((current) => !current)
                            }
                            disabled={submitting}
                            className="
                              absolute
                              right-2
                              top-1/2
                              flex
                              h-8
                              w-8
                              -translate-y-1/2
                              items-center
                              justify-center
                              rounded-lg
                              text-[var(--archive-muted)]/35
                              transition-all
                              hover:bg-white/[0.04]
                              hover:text-[var(--archive-pink-soft)]/80
                              disabled:cursor-not-allowed
                              disabled:opacity-40
                            "
                            aria-label={
                              showPassword
                                ? "Sembunyikan password"
                                : "Tampilkan password"
                            }
                          >
                            {showPassword ? (
                              <EyeOff size={15} />
                            ) : (
                              <Eye size={15} />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* ERROR */}

                      {error && (
                        <div
                          role="alert"
                          className="
                            flex
                            items-start
                            gap-3
                            rounded-xl
                            border
                            border-red-500/20
                            bg-red-500/[0.04]
                            px-4
                            py-3
                          "
                        >
                          <div
                            className="
                              mt-0.5
                              flex
                              h-5
                              w-5
                              shrink-0
                              items-center
                              justify-center
                              rounded-full
                              border
                              border-red-400/20
                              bg-red-500/[0.06]
                              text-[9px]
                              font-bold
                              text-red-400
                            "
                          >
                            !
                          </div>

                          <p className="text-[10px] leading-5 text-red-400/90">
                            {error}
                          </p>
                        </div>
                      )}

                      {/* SUBMIT */}

                      <button
                        type="submit"
                        disabled={submitting}
                        className="
                          group
                          relative
                          flex
                          h-12
                          w-full
                          items-center
                          justify-center
                          overflow-hidden
                          rounded-xl
                          border
                          border-[var(--archive-pink-soft)]/20
                          bg-[var(--archive-pink-soft)]/[0.10]
                          px-6
                          text-[10px]
                          font-semibold
                          text-[var(--archive-pink-soft)]
                          shadow-[0_0_25px_rgba(190,100,160,0.08)]
                          transition-all
                          duration-300
                          hover:border-[var(--archive-pink-soft)]/35
                          hover:bg-[var(--archive-pink-soft)]/[0.16]
                          hover:shadow-[0_0_35px_rgba(190,100,160,0.14)]
                          active:scale-[0.99]
                          disabled:cursor-not-allowed
                          disabled:opacity-50
                        "
                      >
                        <span className="relative z-10 flex items-center gap-2">
                          {submitting ? (
                            <>
                              <span
                                className="
                                  h-3
                                  w-3
                                  animate-spin
                                  rounded-full
                                  border
                                  border-white/20
                                  border-t-[var(--archive-pink-soft)]
                                "
                              />
                              Memverifikasi...
                            </>
                          ) : (
                            <>
                              Masuk ke Archive
                              <ArrowRight
                                size={13}
                                className="
                                  transition-transform
                                  duration-300
                                  group-hover:translate-x-1
                                "
                              />
                            </>
                          )}
                        </span>
                      </button>
                    </form>

                    {/* FOOTER */}

                    <div className="mt-7 flex items-center gap-3">
                      <span
                        className="
                          h-px
                          flex-1
                          bg-gradient-to-r
                          from-transparent
                          to-white/[0.07]
                        "
                      />

                      <p
                        className="
                          text-[7px]
                          font-semibold
                          uppercase
                          tracking-[0.2em]
                          text-[var(--archive-muted)]/25
                        "
                      >
                        Authorized Access Only
                      </p>

                      <span
                        className="
                          h-px
                          flex-1
                          bg-gradient-to-l
                          from-transparent
                          to-white/[0.07]
                        "
                      />
                    </div>
                  </div>

                  {/* BOTTOM SHINE */}

                  <div
                    className="
                      pointer-events-none
                      absolute
                      inset-x-0
                      bottom-0
                      h-px
                      bg-gradient-to-r
                      from-transparent
                      via-[var(--archive-gold)]/30
                      to-transparent
                    "
                  />
                </div>
              </section>
            </div>
          </div>
        </ArchiveContainer>

        {/* =====================================================
            MOBILE BOTTOM LABEL
        ====================================================== */}

        <div
          className="
            pointer-events-none
            absolute
            bottom-4
            left-0
            right-0
            flex
            justify-center
            lg:hidden
          "
        >
          <div className="flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-emerald-400/50" />

            <span
              className="
                text-[7px]
                uppercase
                tracking-[0.18em]
                text-[var(--archive-muted)]/20
              "
            >
              The Archive · Private
            </span>
          </div>
        </div>
      </main>
    </ArchiveShell>
  );
}
