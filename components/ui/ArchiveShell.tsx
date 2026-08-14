import type { ReactNode } from "react";
import Navbar from "@/components/navigation/Navbar";
import StarField from "./StarField";
import MoonDecoration from "./MoonDecoration";
import LanternDecoration from "./LanternDecoration";

interface ArchiveShellProps {
  children: ReactNode;
  showNavbar?: boolean;
  className?: string;
}

export default function ArchiveShell({
  children,
  showNavbar = true,
  className = "",
}: ArchiveShellProps) {
  return (
    <div
      className={`archive-page relative min-h-[100svh] overflow-hidden bg-[var(--archive-night)] text-[var(--archive-text)] ${className}`}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_18%,rgba(84,60,130,0.28),transparent_28%),radial-gradient(circle_at_20%_72%,rgba(191,92,142,0.13),transparent_34%),linear-gradient(180deg,#070c24_0%,#0b102c_48%,#090d21_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-[42%] bg-[linear-gradient(180deg,transparent,rgba(38,22,50,0.24))]" />
      </div>

      <StarField />
      <MoonDecoration className="left-[5%] top-[18%] opacity-70" />
      <LanternDecoration className="-bottom-2 left-[4%] hidden opacity-70 lg:block" />

      {showNavbar && <Navbar />}

      <div className="relative z-10">{children}</div>
    </div>
  );
}
