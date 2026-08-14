import type { HTMLAttributes } from "react";

interface ArchiveContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: "default" | "wide";
}

export default function ArchiveContainer({
  size = "default",
  className = "",
  ...props
}: ArchiveContainerProps) {
  return (
    <div
      className={`mx-auto w-full px-5 sm:px-8 lg:px-10 ${
        size === "wide" ? "max-w-[1500px]" : "max-w-[1320px]"
      } ${className}`}
      {...props}
    />
  );
}
