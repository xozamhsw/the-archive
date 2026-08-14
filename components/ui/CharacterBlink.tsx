"use client";

import Image from "next/image";
import { useCharacterBlink } from "@/hooks/useCharacterBlink";

interface CharacterBlinkProps {
  openImage?: string;
  closedImage?: string;
  alt?: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
}

export default function CharacterBlink({
  openImage = "/characters/aulia/open.webp",
  closedImage = "/characters/aulia/closed.webp",
  alt = "Karakter Aulia",
  className = "",
  imageClassName = "object-contain",
  priority = false,
}: CharacterBlinkProps) {
  const eyesClosed = useCharacterBlink();

  return (
    <div className={`relative ${className}`}>
      {/* Eyes Open */}
      <Image
        src={openImage}
        alt={alt}
        fill
        priority={priority}
        sizes="(max-width: 768px) 90vw, 50vw"
        className={`${imageClassName} ${
          eyesClosed ? "opacity-0" : "opacity-100"
        } transition-opacity duration-150 ease-in-out`}
        style={{
          willChange: "opacity",
        }}
      />

      {/* Eyes Closed */}
      <Image
        src={closedImage}
        alt=""
        aria-hidden="true"
        fill
        priority={priority}
        sizes="(max-width: 768px) 90vw, 50vw"
        className={`${imageClassName} ${
          eyesClosed ? "opacity-100" : "opacity-0"
        } transition-opacity duration-150 ease-in-out`}
        style={{
          willChange: "opacity",
        }}
      />
    </div>
  );
}
