"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { signOut } from "firebase/auth";
import {
  Archive,
  Camera,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Grid2X2,
  Image as ImageIcon,
  LogOut,
  MessageCircle,
  Menu,
  X,
} from "lucide-react";

import { auth } from "@/lib/firebase";

/* ============================================================
   TYPES
============================================================ */

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  href: string;
}

interface SidebarProps {
  userEmail?: string | null;
  menuItems?: MenuItem[];
}

/* ============================================================
   DEFAULT MENU
============================================================ */

const DEFAULT_MENU_ITEMS: MenuItem[] = [
  {
    label: "Dashboard",
    icon: <Grid2X2 size={19} strokeWidth={1.8} />,
    href: "/admin",
  },

  {
    label: "Memory Gallery",
    icon: <ImageIcon size={19} strokeWidth={1.8} />,
    href: "/admin/manage-gallery",
  },

  {
    label: "Photobooth",
    icon: <Camera size={19} strokeWidth={1.8} />,
    href: "/admin/monitoring-photo",
  },

  {
    label: "Photo Archive",
    icon: <Archive size={19} strokeWidth={1.8} />,
    href: "/admin/photo-archive",
  },

  {
    label: "Wall Messages",
    icon: <MessageCircle size={19} strokeWidth={1.8} />,
    href: "/admin/wall",
  },

  {
    label: "Time Capsule",
    icon: <Clock3 size={19} strokeWidth={1.8} />,
    href: "/admin/monitoring-capsule",
  },
];

/* ============================================================
   SIDEBAR
============================================================ */

export default function Sidebar({
  userEmail,
  menuItems = DEFAULT_MENU_ITEMS,
}: SidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  /*
   * Desktop sekarang default collapsed agar sesuai dengan
   * komposisi sidebar pada halaman admin/The Archive.
   */
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(true);

  const [isMobile, setIsMobile] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  /* ==========================================================
     RESPONSIVE
  ========================================================== */

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

  /* ==========================================================
     MOBILE LINK
  ========================================================== */

  const handleLinkClick = useCallback(() => {
    if (isMobile) {
      setIsMobileOpen(false);
    }
  }, [isMobile]);

  /* ==========================================================
     LOGOUT
  ========================================================== */

  async function handleLogout() {
    try {
      await signOut(auth);

      router.push("/admin/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  /* ==========================================================
     ACTIVE ROUTE
  ========================================================== */

  function isActiveRoute(href: string): boolean {
    if (href === "/admin") {
      return pathname === "/admin";
    }

    return pathname.startsWith(href);
  }

  /* ==========================================================
     INITIAL
  ========================================================== */

  const userInitial = userEmail?.trim().charAt(0).toUpperCase() || "A";

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <>
      {/* ======================================================
          MOBILE MENU BUTTON
      ====================================================== */}

      <button
        type="button"
        onClick={() => setIsMobileOpen((previous) => !previous)}
        className="
          fixed
          left-4
          top-4
          z-[60]
          flex
          h-10
          w-10
          items-center
          justify-center
          rounded-xl
          border
          border-white/[0.08]
          bg-[#0D0E28]/90
          text-[#C084FC]
          shadow-[0_10px_30px_rgba(0,0,0,0.25)]
          backdrop-blur-xl
          transition
          hover:border-[#C084FC]/20
          hover:bg-[#141533]
          hover:text-[#F3A9C7]
          lg:hidden
        "
        aria-label={isMobileOpen ? "Tutup sidebar" : "Buka sidebar"}
      >
        {isMobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* ======================================================
          SIDEBAR
      ====================================================== */}

      <aside
        className={`
          fixed
          inset-y-0
          left-0
          z-50
          flex
          h-screen
          flex-col
          border-r
          border-white/[0.06]
          bg-[#08091F]/95
          shadow-[15px_0_50px_rgba(0,0,0,0.15)]
          backdrop-blur-2xl
          transition-all
          duration-300
          ease-out
          lg:sticky
          lg:top-0
          ${
            isMobile
              ? isMobileOpen
                ? "w-[250px] translate-x-0"
                : "w-[250px] -translate-x-full"
              : isDesktopCollapsed
                ? "w-[68px]"
                : "w-[250px]"
          }
        `}
      >
        {/* ====================================================
            SIDEBAR HEADER
        ==================================================== */}

        <div
          className={`
            flex
            h-[72px]
            flex-shrink-0
            items-center
            border-b
            border-white/[0.05]
            ${
              !isMobile && isDesktopCollapsed
                ? "justify-center px-2"
                : "justify-between px-3"
            }
          `}
        >
          {/* BRAND */}

          <div
            className={`
              flex
              min-w-0
              items-center
              gap-3
              overflow-hidden
              transition-all
              duration-300
              ${
                !isMobile && isDesktopCollapsed
                  ? "w-0 opacity-0"
                  : "w-auto opacity-100"
              }
            `}
          >
            <div
              className="
                flex
                h-9
                w-9
                flex-shrink-0
                items-center
                justify-center
                rounded-xl
                border
                border-[#C084FC]/15
                bg-[#C084FC]/[0.07]
                text-[#D8B4FE]
              "
            >
              <Archive size={16} strokeWidth={1.8} />
            </div>

            <div className="min-w-0">
              <p
                className="
                  whitespace-nowrap
                  text-[8px]
                  font-semibold
                  uppercase
                  tracking-[0.2em]
                  text-[#D8B4FE]/45
                "
              >
                Admin Workspace
              </p>

              <p
                className="
                  mt-0.5
                  whitespace-nowrap
                  font-serif
                  text-sm
                  text-white/85
                "
              >
                The Archive
              </p>
            </div>
          </div>

          {/* COLLAPSE BUTTON */}

          <button
            type="button"
            onClick={() => setIsDesktopCollapsed((previous) => !previous)}
            className="
              group
              flex
              h-9
              w-9
              flex-shrink-0
              items-center
              justify-center
              rounded-xl
              border
              border-white/[0.05]
              bg-white/[0.02]
              text-white/30
              transition
              hover:border-[#C084FC]/15
              hover:bg-[#C084FC]/[0.06]
              hover:text-[#D8B4FE]
            "
            aria-label={
              isDesktopCollapsed ? "Perbesar sidebar" : "Perkecil sidebar"
            }
          >
            {isDesktopCollapsed ? (
              <ChevronRight
                size={17}
                strokeWidth={1.8}
                className="transition-transform duration-300 group-hover:translate-x-0.5"
              />
            ) : (
              <ChevronLeft
                size={17}
                strokeWidth={1.8}
                className="transition-transform duration-300 group-hover:-translate-x-0.5"
              />
            )}
          </button>
        </div>

        {/* ====================================================
            NAVIGATION
        ==================================================== */}

        <nav className="flex-1 overflow-y-auto px-2 py-4 scrollbar-none">
          {/* SECTION LABEL */}

          <div
            className={`
              mb-2
              overflow-hidden
              px-3
              transition-all
              duration-300
              ${
                !isMobile && isDesktopCollapsed
                  ? "h-0 opacity-0"
                  : "h-4 opacity-100"
              }
            `}
          >
            <span
              className="
                whitespace-nowrap
                text-[8px]
                font-semibold
                uppercase
                tracking-[0.18em]
                text-white/20
              "
            >
              Navigation
            </span>
          </div>

          {/* MENU ITEMS */}

          <div className="space-y-1">
            {menuItems.map((item) => {
              const isActive = isActiveRoute(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleLinkClick}
                  className={`
                    group
                    relative
                    flex
                    h-11
                    items-center
                    gap-3
                    rounded-xl
                    transition-all
                    duration-200
                    ${
                      !isMobile && isDesktopCollapsed
                        ? "justify-center px-0"
                        : "px-3"
                    }
                    ${
                      isActive
                        ? `
                          border
                          border-[#C084FC]/10
                          bg-[#A78BFA]/[0.12]
                          text-[#D8B4FE]
                          shadow-[0_8px_25px_rgba(139,92,246,0.08)]
                        `
                        : `
                          border
                          border-transparent
                          text-white/35
                          hover:border-white/[0.04]
                          hover:bg-white/[0.025]
                          hover:text-white/75
                        `
                    }
                  `}
                >
                  {/* ACTIVE INDICATOR */}

                  {isActive && (
                    <span
                      className="
                        absolute
                        left-0
                        top-1/2
                        h-5
                        w-[2px]
                        -translate-y-1/2
                        rounded-r-full
                        bg-gradient-to-b
                        from-[#C084FC]
                        to-[#F3A9C7]
                      "
                    />
                  )}

                  {/* ICON */}

                  <span
                    className={`
                      flex
                      flex-shrink-0
                      items-center
                      justify-center
                      transition-colors
                      duration-200
                      ${
                        isActive
                          ? "text-[#C084FC]"
                          : "text-[#8B5CF6]/55 group-hover:text-[#C084FC]"
                      }
                    `}
                  >
                    {item.icon}
                  </span>

                  {/* LABEL */}

                  <span
                    className={`
                      min-w-0
                      overflow-hidden
                      whitespace-nowrap
                      text-[10px]
                      font-semibold
                      tracking-[0.01em]
                      transition-all
                      duration-300
                      ${
                        !isMobile && isDesktopCollapsed
                          ? "w-0 opacity-0"
                          : "w-auto opacity-100"
                      }
                    `}
                  >
                    {item.label}
                  </span>

                  {/* ACTIVE DOT */}

                  {isActive && (!isDesktopCollapsed || isMobile) && (
                    <span
                      className="
                          ml-auto
                          h-1.5
                          w-1.5
                          flex-shrink-0
                          rounded-full
                          bg-[#F3A9C7]
                          shadow-[0_0_10px_rgba(243,169,199,0.45)]
                        "
                    />
                  )}

                  {/* COLLAPSED TOOLTIP */}

                  {!isMobile && isDesktopCollapsed && (
                    <span
                      className="
                        pointer-events-none
                        absolute
                        left-full
                        z-[70]
                        ml-3
                        whitespace-nowrap
                        rounded-lg
                        border
                        border-white/[0.07]
                        bg-[#11122D]
                        px-3
                        py-2
                        text-[9px]
                        font-medium
                        text-white/75
                        opacity-0
                        shadow-[0_10px_30px_rgba(0,0,0,0.35)]
                        transition-all
                        duration-200
                        group-hover:translate-x-0
                        group-hover:opacity-100
                      "
                    >
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* ====================================================
            BOTTOM AREA
        ==================================================== */}

        <div
          className="
            flex-shrink-0
            border-t
            border-white/[0.05]
            p-2
          "
        >
          {/* USER */}

          <div
            className={`
              mb-2
              overflow-hidden
              rounded-xl
              border
              border-white/[0.04]
              bg-white/[0.018]
              transition-all
              duration-300
              ${
                !isMobile && isDesktopCollapsed
                  ? "h-0 border-transparent opacity-0"
                  : "h-[58px] opacity-100"
              }
            `}
          >
            <div className="flex h-full items-center gap-3 px-3">
              {/* AVATAR */}

              <div
                className="
                  flex
                  h-8
                  w-8
                  flex-shrink-0
                  items-center
                  justify-center
                  rounded-full
                  border
                  border-[#C084FC]/15
                  bg-[#A78BFA]/[0.12]
                  text-[10px]
                  font-semibold
                  text-[#D8B4FE]
                "
              >
                {userInitial}
              </div>

              {/* USER INFO */}

              <div className="min-w-0">
                <p
                  className="
                    truncate
                    text-[9px]
                    font-semibold
                    text-white/65
                  "
                >
                  {userEmail || "Admin"}
                </p>

                <p
                  className="
                    mt-0.5
                    text-[8px]
                    uppercase
                    tracking-[0.1em]
                    text-white/20
                  "
                >
                  Administrator
                </p>
              </div>
            </div>
          </div>

          {/* LOGOUT */}

          <button
            type="button"
            onClick={() => void handleLogout()}
            className={`
              group
              relative
              flex
              h-11
              w-full
              items-center
              gap-3
              rounded-xl
              border
              border-transparent
              text-red-300/45
              transition-all
              duration-200
              hover:border-red-400/10
              hover:bg-red-400/[0.04]
              hover:text-red-300/80
              ${
                !isMobile && isDesktopCollapsed ? "justify-center px-0" : "px-3"
              }
            `}
            aria-label="Logout"
          >
            <LogOut
              size={18}
              strokeWidth={1.8}
              className="
                flex-shrink-0
                transition-transform
                duration-200
                group-hover:translate-x-0.5
              "
            />

            <span
              className={`
                overflow-hidden
                whitespace-nowrap
                text-[10px]
                font-semibold
                transition-all
                duration-300
                ${
                  !isMobile && isDesktopCollapsed
                    ? "w-0 opacity-0"
                    : "w-auto opacity-100"
                }
              `}
            >
              Logout
            </span>

            {/* COLLAPSED TOOLTIP */}

            {!isMobile && isDesktopCollapsed && (
              <span
                className="
                  pointer-events-none
                  absolute
                  left-full
                  z-[70]
                  ml-3
                  whitespace-nowrap
                  rounded-lg
                  border
                  border-red-400/10
                  bg-[#171329]
                  px-3
                  py-2
                  text-[9px]
                  font-medium
                  text-red-300/75
                  opacity-0
                  shadow-[0_10px_30px_rgba(0,0,0,0.35)]
                  transition-all
                  duration-200
                  group-hover:opacity-100
                "
              >
                Logout
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* ======================================================
          MOBILE OVERLAY
      ====================================================== */}

      {isMobile && isMobileOpen && (
        <button
          type="button"
          className="
            fixed
            inset-0
            z-40
            cursor-default
            bg-[#050616]/65
            backdrop-blur-[3px]
            lg:hidden
          "
          onClick={() => setIsMobileOpen(false)}
          aria-label="Tutup sidebar"
        />
      )}
    </>
  );
}
