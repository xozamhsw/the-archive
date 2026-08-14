"use client";

import { Music2, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";

interface MusicPlayerProps {
  compact?: boolean;
  mobile?: boolean;
}

export default function MusicPlayer({
  compact = false,
  mobile = false,
}: MusicPlayerProps) {
  const {
    activated,
    playing,
    muted,
    volume,
    error,
    currentTrack,
    togglePlay,
    toggleMute,
    setVolume,
  } = useBackgroundMusic();

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    setVolume(value);
  };

  return (
    <div
      className={
        mobile
          ? "flex w-full max-w-full items-center gap-2 rounded-full border border-[var(--archive-border)] bg-[#15152f]/70 px-2 py-1.5 shadow-[0_0_30px_rgba(221,132,177,0.08)] backdrop-blur-xl"
          : "flex items-center gap-2 rounded-full border border-[var(--archive-border)] bg-[#15152f]/70 px-2 py-1.5 shadow-[0_0_30px_rgba(221,132,177,0.08)] backdrop-blur-xl"
      }
    >
      {/* =====================================================
          PLAY / PAUSE
      ====================================================== */}
      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? "Jeda musik" : "Putar musik"}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--archive-pink),var(--archive-peach))] text-white transition hover:scale-105 active:scale-95"
      >
        {playing ? (
          <Pause size={13} />
        ) : (
          <Play size={13} className="translate-x-px" />
        )}
      </button>

      {/* =====================================================
          SONG INFO
      ====================================================== */}
      {!compact && (
        <div
          className={
            mobile ? "min-w-0 flex-1" : "hidden min-w-[125px] sm:block"
          }
        >
          <div className="flex items-center gap-1.5 text-[9px] text-[var(--archive-muted)]">
            <Music2 size={10} />

            <span className="truncate">
              {playing ? "Now Playing" : "Music Archive"}
            </span>
          </div>

          <p className="mt-0.5 truncate text-[10px] font-semibold text-[var(--archive-text)]">
            {error ? "Audio unavailable" : currentTrack.title}
          </p>

          {!error && (
            <p className="truncate text-[8px] text-[var(--archive-muted)]">
              {currentTrack.artist}
            </p>
          )}
        </div>
      )}

      {/* =====================================================
          MOBILE MUTE
      ====================================================== */}
      {mobile && !compact && (
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? "Nyalakan suara" : "Matikan suara"}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--archive-muted)] transition hover:bg-white/[0.06] hover:text-[var(--archive-text)]"
        >
          {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
        </button>
      )}

      {/* =====================================================
          DESKTOP MUTE
      ====================================================== */}
      {!mobile && !compact && (
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? "Nyalakan suara" : "Matikan suara"}
          className="hidden h-7 w-7 items-center justify-center rounded-full text-[var(--archive-muted)] transition hover:bg-white/[0.06] hover:text-[var(--archive-text)] md:flex"
        >
          {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
        </button>
      )}

      {/* =====================================================
          VOLUME DESKTOP
      ====================================================== */}
      {!compact && !mobile && (
        <input
          aria-label="Volume musik"
          type="range"
          min="0"
          max="0.35"
          step="0.01"
          value={volume}
          onChange={handleVolumeChange}
          className="archive-volume hidden w-16 md:block"
        />
      )}

      {/* =====================================================
          READY STATUS
      ====================================================== */}
      {!activated && !compact && !mobile && (
        <span className="hidden text-[8px] uppercase tracking-[0.16em] text-[var(--archive-muted)] lg:inline">
          ready
        </span>
      )}
    </div>
  );
}
