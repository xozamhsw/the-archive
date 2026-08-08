"use client";

import { useEffect, useState } from "react";

import { usePathname, useRouter } from "next/navigation";

import { onAuthStateChanged, signOut, type User } from "firebase/auth";

import Sidebar from "@/components/admin/Sidebar";

import { auth, verifyAdminSession } from "@/lib/firebase";

const PUBLIC_ADMIN_ROUTES = ["/admin/login"];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);

  const [checking, setChecking] = useState(true);

  const router = useRouter();

  const pathname = usePathname();

  const isPublicRoute = PUBLIC_ADMIN_ROUTES.includes(pathname);

  useEffect(() => {
    /**
     * Halaman login memang public.
     *
     * Jangan menjalankan admin guard pada halaman login
     * agar tidak terjadi redirect loop.
     */
    if (isPublicRoute) {
      return;
    }

    let cancelled = false;

    const unsubscribe = onAuthStateChanged(
      auth,

      (currentUser) => {
        void (async () => {
          /**
           * Tidak login atau anonymous visitor.
           */
          if (!currentUser || currentUser.isAnonymous) {
            if (!cancelled) {
              setUser(null);

              setChecking(false);

              router.replace("/admin/login");
            }

            return;
          }

          /**
           * Login saja belum cukup.
           *
           * Verifikasi UID ke server.
           */
          const isAdmin = await verifyAdminSession(currentUser);

          if (!isAdmin) {
            /**
             * Kalau user ternyata bukan admin,
             * logout account tersebut.
             */
            await signOut(auth).catch(() => undefined);

            if (!cancelled) {
              setUser(null);

              setChecking(false);

              router.replace("/admin/login?error=unauthorized");
            }

            return;
          }

          /**
           * Firebase user valid + UID admin valid.
           */
          if (!cancelled) {
            setUser(currentUser);

            setChecking(false);
          }
        })();
      },
    );

    return () => {
      cancelled = true;

      unsubscribe();
    };
  }, [isPublicRoute, router]);

  /**
   * Login page tidak memakai Sidebar.
   */
  if (isPublicRoute) {
    return <>{children}</>;
  }

  /**
   * Sedang mengecek authentication.
   */
  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F1FA]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-[#D8C8F0] border-b-[#A78BFA]" />

          <p className="text-sm text-[#3B2E52]/60">
            Memverifikasi akses admin...
          </p>
        </div>
      </div>
    );
  }

  /**
   * Redirect sedang berlangsung.
   */
  if (!user) {
    return null;
  }

  /**
   * Admin valid.
   */
  return (
    <div className="flex min-h-screen bg-[#F5F1FA]">
      <Sidebar userEmail={user.email} />

      <main className="min-w-0 flex-1 overflow-x-hidden lg:ml-0">
        {children}
      </main>
    </div>
  );
}
