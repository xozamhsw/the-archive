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
        className="h-5 w-5"
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

  // =========================
  // MEMORY GALLERY
  // =========================
  {
    label: "Memory Gallery",
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
    href: "/admin/manage-gallery",
  },

  // =========================
  // PHOTOBOOTH
  // =========================
  {
    label: "Photobooth",
    icon: (
      <svg
        className="h-5 w-5"
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
    label: "Photo Archive",
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 8h14M5 8a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v1a2 2 0 01-2 2M5 8v11a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
        />
      </svg>
    ),
    href: "/admin/photo-archive",
  },

  // =========================
  // WALL MESSAGES
  // =========================
  {
    label: "Wall Messages",
    icon: (
      <svg
        className="h-5 w-5"
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

  // =========================
  // TIME CAPSULE
  // =========================
  {
    label: "Time Capsule",
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    href: "/admin/monitoring-capsule",
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

  useEffect(() => {
    function handleResize() {
      const mobile = window.innerWidth < 1024;

      setIsMobile(mobile);

      if (!mobile) {
        setIsMobileOpen(false);
      }
    }

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleLinkClick = useCallback(() => {
    if (isMobile) {
      setIsMobileOpen(false);
    }
  }, [isMobile]);

  async function handleLogout() {
    try {
      await signOut(auth);

      router.push("/admin/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  function isActiveRoute(href: string): boolean {
    if (href === "/admin") {
      return pathname === "/admin";
    }

    return pathname.startsWith(href);
  }

  return (
    <>
      {/* =========================
          MOBILE MENU BUTTON
      ========================== */}
      <button
        type="button"
        onClick={() => setIsMobileOpen((previous) => !previous)}
        className="fixed left-4 top-4 z-50 rounded-xl border border-[#D8C8F0]/40 bg-white/90 p-2.5 shadow-md backdrop-blur-md transition hover:shadow-lg lg:hidden"
        aria-label={isMobileOpen ? "Tutup sidebar" : "Buka sidebar"}
      >
        <svg
          className="h-5 w-5 text-[#6D4FC2]"
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

      {/* =========================
          SIDEBAR
      ========================== */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex h-screen flex-col
          border-r border-[#D8C8F0]/30
          bg-white/90 backdrop-blur-xl
          transition-all duration-300
          lg:sticky
          ${
            isMobile
              ? isMobileOpen
                ? "w-72 translate-x-0"
                : "w-72 -translate-x-full"
              : isDesktopCollapsed
                ? "w-20"
                : "w-64"
          }
        `}
      >
        {/* =========================
            HEADER
        ========================== */}
        <div className="flex-shrink-0 border-b border-[#D8C8F0]/30 p-5">
          <div className="flex items-center justify-between gap-3">
            <div
              className={`
                overflow-hidden transition-all duration-300
                ${
                  !isMobile && isDesktopCollapsed
                    ? "w-0 opacity-0"
                    : "w-auto opacity-100"
                }
              `}
            >
              <p className="mb-1 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6D4FC2]/45">
                Admin Workspace
              </p>

              <h2 className="whitespace-nowrap text-lg font-bold text-[#3B2E52]">
                The Archive
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setIsDesktopCollapsed((previous) => !previous)}
              className="hidden flex-shrink-0 rounded-lg p-2 text-[#6D4FC2] transition hover:bg-[#E9D8FD]/50 lg:block"
              aria-label={
                isDesktopCollapsed ? "Perbesar sidebar" : "Perkecil sidebar"
              }
            >
              <svg
                className={`h-5 w-5 transition-transform duration-300 ${
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

        {/* =========================
            NAVIGATION
        ========================== */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto p-4">
          {menuItems.map((item) => {
            const isActive = isActiveRoute(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleLinkClick}
                className={`
                  group relative flex items-center gap-3
                  rounded-xl px-3 py-3
                  transition-all duration-200
                  ${
                    isActive
                      ? "bg-[#A78BFA] text-white shadow-sm shadow-[#A78BFA]/25"
                      : "text-[#3B2E52]/80 hover:bg-[#E9D8FD]/50 hover:text-[#3B2E52]"
                  }
                `}
              >
                <span
                  className={`flex-shrink-0 ${
                    isActive ? "text-white" : "text-[#6D4FC2]"
                  }`}
                >
                  {item.icon}
                </span>

                <span
                  className={`
                    overflow-hidden whitespace-nowrap
                    text-sm font-medium
                    transition-all duration-300
                    ${
                      !isMobile && isDesktopCollapsed
                        ? "w-0 opacity-0"
                        : "w-auto opacity-100"
                    }
                  `}
                >
                  {item.label}
                </span>

                {/* Tooltip desktop collapsed */}
                {!isMobile && isDesktopCollapsed && (
                  <span className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-lg bg-[#3B2E52] px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    {item.label}
                  </span>
                )}

                {/* Active dot */}
                {isActive && !isDesktopCollapsed && (
                  <span className="absolute right-3 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-white/90" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* =========================
            USER & LOGOUT
        ========================== */}
        <div className="flex-shrink-0 border-t border-[#D8C8F0]/30 p-4">
          <div
            className={`
              mb-3 overflow-hidden
              transition-all duration-300
              ${
                !isMobile && isDesktopCollapsed
                  ? "h-0 opacity-0"
                  : "h-auto opacity-100"
              }
            `}
          >
            <div className="flex items-center gap-3 rounded-xl bg-[#F5F1FA]/80 p-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#A78BFA] text-sm font-bold text-white">
                {userEmail?.charAt(0).toUpperCase() || "A"}
              </div>

              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-[#3B2E52]">
                  {userEmail || "Admin"}
                </p>

                <p className="mt-0.5 text-[10px] text-[#6D4FC2]/45">
                  Administrator
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className={`
              group relative flex w-full items-center gap-3
              rounded-xl px-3 py-3
              text-red-400
              transition
              hover:bg-red-50 hover:text-red-600
              ${!isMobile && isDesktopCollapsed ? "justify-center" : ""}
            `}
            aria-label="Logout"
          >
            <svg
              className="h-5 w-5 flex-shrink-0"
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

            <span
              className={`
                overflow-hidden whitespace-nowrap
                text-sm font-medium
                transition-all duration-300
                ${
                  !isMobile && isDesktopCollapsed
                    ? "w-0 opacity-0"
                    : "w-auto opacity-100"
                }
              `}
            >
              Logout
            </span>

            {!isMobile && isDesktopCollapsed && (
              <span className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-lg bg-red-500 px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                Logout
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* =========================
          MOBILE OVERLAY
      ========================== */}
      {isMobile && isMobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 cursor-default bg-[#21182F]/40 backdrop-blur-[2px] lg:hidden"
          onClick={() => setIsMobileOpen(false)}
          aria-label="Tutup sidebar"
        />
      )}
    </>
  );
}
