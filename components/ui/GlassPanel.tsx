import type { HTMLAttributes } from "react";

interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
}

export default function GlassPanel({
  glow = false,
  className = "",
  ...props
}: GlassPanelProps) {
  return (
    <div
      className={`archive-glass rounded-[1.75rem] ${
        glow ? "archive-glow" : ""
      } ${className}`}
      {...props}
    />
  );
}
