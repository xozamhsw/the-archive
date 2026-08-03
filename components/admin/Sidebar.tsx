"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  href: string;
}

interface SidebarProps {
  userEmail?: string | null;
  menuItems?: MenuItem[];
}

const DEFAULT_MENU_ITEMS: MenuItem[] = [
  {
    label: "Dashboard",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
        />
      </svg>
    ),
    href: "/admin",
  },
  {
    label: "Photobooth",
    icon: (
      <svg
        className="w-5 h-5"
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
    ),
    href: "/admin/monitoring-photo",
  },
  {
    label: "Wall Messages",
    icon: (
      <svg
        className="w-5 h-5"
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
    ),
    href: "/admin/wall",
  },
];

export default function Sidebar({
  userEmail,
  menuItems = DEFAULT_MENU_ITEMS,
}: SidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Deteksi ukuran layar
  useEffect(() => {
    function handleResize() {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      // Tutup mobile sidebar jika resize ke desktop
      if (!mobile) {
        setIsMobileOpen(false);
      }
    }

    // Set initial state
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handler untuk menutup mobile sidebar saat link diklik
  const handleLinkClick = useCallback(() => {
    if (isMobile) {
      setIsMobileOpen(false);
    }
  }, [isMobile]);

  async function handleLogout() {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  // Cek apakah menu item aktif (termasuk nested routes)
  function isActiveRoute(href: string): boolean {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md hover:shadow-lg transition-shadow"
        aria-label="Toggle sidebar"
      >
        <svg
          className="w-6 h-6 text-[#6D4FC2]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isMobileOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky inset-y-0 left-0 z-40 bg-white/80 backdrop-blur-sm border-r border-[#D8C8F0]/30 transition-all duration-300 flex flex-col h-screen
          ${
            isMobile
              ? isMobileOpen
                ? "translate-x-0 w-64"
                : "-translate-x-full w-64"
              : isDesktopCollapsed
                ? "w-20"
                : "w-64"
          }
        `}
      >
        {/* Header */}
        <div className="p-6 border-b border-[#D8C8F0]/30 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div
              className={`overflow-hidden transition-all duration-300 ${
                !isMobile && isDesktopCollapsed
                  ? "w-0 opacity-0"
                  : "w-auto opacity-100"
              }`}
            >
              <h2 className="text-lg font-bold text-[#3B2E52] whitespace-nowrap">
                The Archive
              </h2>
              <p className="text-xs text-[#6D4FC2]/60 whitespace-nowrap">
                Admin Panel
              </p>
            </div>
            <button
              onClick={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
              className="p-2 rounded-lg hover:bg-[#E9D8FD]/50 transition text-[#6D4FC2] hidden lg:block flex-shrink-0"
              aria-label={
                isDesktopCollapsed ? "Expand sidebar" : "Collapse sidebar"
              }
            >
              <svg
                className={`w-5 h-5 transition-transform duration-300 ${
                  isDesktopCollapsed ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = isActiveRoute(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleLinkClick}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all group relative ${
                  isActive
                    ? "bg-[#A78BFA] text-white shadow-md"
                    : "text-[#3B2E52] hover:bg-[#E9D8FD]/50"
                }`}
              >
                <span
                  className={`flex-shrink-0 ${
                    isActive ? "text-white" : "text-[#6D4FC2]"
                  }`}
                >
                  {item.icon}
                </span>
                <span
                  className={`font-medium text-sm whitespace-nowrap overflow-hidden transition-all duration-300 ${
                    !isMobile && isDesktopCollapsed
                      ? "w-0 opacity-0"
                      : "w-auto opacity-100"
                  }`}
                >
                  {item.label}
                </span>
                {/* Tooltip for collapsed state */}
                {!isMobile && isDesktopCollapsed && (
                  <span className="absolute left-full ml-2 px-2 py-1 bg-[#3B2E52] text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                    {item.label}
                  </span>
                )}
                {/* Active indicator */}
                {isActive && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-[#D8C8F0]/30 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div
              className={`flex items-center gap-3 overflow-hidden transition-all duration-300 ${
                !isMobile && isDesktopCollapsed
                  ? "w-0 opacity-0"
                  : "w-auto opacity-100"
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-[#A78BFA] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {userEmail?.charAt(0).toUpperCase() || "A"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#3B2E52] truncate">
                  {userEmail || "Admin"}
                </p>
                <p className="text-xs text-[#6D4FC2]/40 truncate">
                  Administrator
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-red-50 transition text-red-400 hover:text-red-600 flex-shrink-0 group relative"
              title="Logout"
              aria-label="Logout"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              {/* Tooltip untuk tombol logout saat collapsed */}
              {!isMobile && isDesktopCollapsed && (
                <span className="absolute left-full ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  Logout
                </span>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isMobile && isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
