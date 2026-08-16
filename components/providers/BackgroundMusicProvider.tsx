"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import {
  BackgroundMusicContext,
  type BackgroundMusicContextValue,
} from "@/hooks/useBackgroundMusic";

interface MusicTrack {
  title: string;
  artist: string;
  src: string;
}

const MUSIC_TRACKS: MusicTrack[] = [
  {
    title: "About You",
    artist: "The 1975",
    src: "/audio/The 1975 - About You.mp3",
  },
  {
    title: "Sweet Disposition",
    artist: "The Temper Trap",
    src: "/audio/The Temper Trap - Sweet Disposition.mp3",
  },
];

const MUSIC_ACTIVATED_KEY = "the-archive-music-activated";
const MUSIC_PLAYING_KEY = "the-archive-music-playing";
const MUSIC_VOLUME_KEY = "the-archive-music-volume";
const MUSIC_POSITION_KEY = "the-archive-music-position";
const MUSIC_TRACK_KEY = "the-archive-music-track";

const DEFAULT_VOLUME = 0.14;
const MAX_VOLUME = 0.35;

function clampVolume(value: number) {
  return Math.min(MAX_VOLUME, Math.max(0, value));
}

function readStoredVolume() {
  const stored = window.localStorage.getItem(MUSIC_VOLUME_KEY);

  if (!stored) {
    return DEFAULT_VOLUME;
  }

  const parsed = Number(stored);

  return Number.isFinite(parsed) ? clampVolume(parsed) : DEFAULT_VOLUME;
}

function readStoredTrackIndex() {
  const stored = window.localStorage.getItem(MUSIC_TRACK_KEY);

  if (!stored) {
    return 0;
  }

  const parsed = Number(stored);

  if (
    !Number.isInteger(parsed) ||
    parsed < 0 ||
    parsed >= MUSIC_TRACKS.length
  ) {
    return 0;
  }

  return parsed;
}

export default function BackgroundMusicProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeFrameRef = useRef<number | null>(null);

  const restoredPositionRef = useRef(false);
  const changingTrackRef = useRef(false);

  const [activated, setActivated] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME);
  const [error, setError] = useState<string | null>(null);

  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

  const currentTrack = MUSIC_TRACKS[currentTrackIndex];

  const isAdminRoute = pathname.startsWith("/admin");

  /*
   * ============================================================
   * CANCEL FADE
   * ============================================================
   */

  const cancelFade = useCallback(() => {
    if (fadeFrameRef.current !== null) {
      window.cancelAnimationFrame(fadeFrameRef.current);

      fadeFrameRef.current = null;
    }
  }, []);

  /*
   * ============================================================
   * FADE VOLUME
   * ============================================================
   */

  const fadeTo = useCallback(
    (targetVolume: number, duration = 1300) => {
      const audio = audioRef.current;

      if (!audio) {
        return;
      }

      cancelFade();

      const startVolume = clampVolume(audio.volume);
      const destination = clampVolume(targetVolume);
      const startTime = performance.now();

      const animate = (timestamp: number) => {
        const progress = Math.min(1, (timestamp - startTime) / duration);

        const eased = 1 - Math.pow(1 - progress, 3);

        const newVolume = clampVolume(
          startVolume + (destination - startVolume) * eased,
        );

        audio.volume = newVolume;

        if (progress < 1) {
          fadeFrameRef.current = window.requestAnimationFrame(animate);
        } else {
          fadeFrameRef.current = null;
          audio.volume = destination;
        }
      };

      fadeFrameRef.current = window.requestAnimationFrame(animate);
    },
    [cancelFade],
  );

  /*
   * ============================================================
   * PLAY CURRENT TRACK
   * ============================================================
   */

  const play = useCallback(() => {
    if (isAdminRoute) {
      return;
    }

    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    setActivated(true);
    setMuted(false);
    setError(null);

    window.localStorage.setItem(MUSIC_ACTIVATED_KEY, "true");

    window.localStorage.setItem(MUSIC_PLAYING_KEY, "true");

    audio.muted = false;
    audio.volume = 0;

    void audio
      .play()
      .then(() => {
        fadeTo(volume);
      })
      .catch((playError) => {
        console.warn("Background music blocked:", playError);

        window.localStorage.setItem(MUSIC_PLAYING_KEY, "false");
      });
  }, [fadeTo, isAdminRoute, volume]);

  /*
   * ============================================================
   * PAUSE
   * ============================================================
   */

  const pause = useCallback(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    cancelFade();

    audio.pause();

    window.localStorage.setItem(MUSIC_PLAYING_KEY, "false");
  }, [cancelFade]);

  /*
   * ============================================================
   * TOGGLE PLAY
   * ============================================================
   */

  const togglePlay = useCallback(() => {
    if (playing) {
      pause();
    } else {
      play();
    }
  }, [pause, play, playing]);

  /*
   * ============================================================
   * TOGGLE MUTE
   * ============================================================
   */

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const nextMuted = !muted;

    audio.muted = nextMuted;

    setMuted(nextMuted);
  }, [muted]);

  /*
   * ============================================================
   * SET VOLUME
   * ============================================================
   */

  const setVolume = useCallback(
    (value: number) => {
      const nextVolume = clampVolume(value);
      const audio = audioRef.current;

      setVolumeState(nextVolume);

      window.localStorage.setItem(MUSIC_VOLUME_KEY, String(nextVolume));

      if (!audio) {
        return;
      }

      cancelFade();

      audio.volume = nextVolume;

      if (nextVolume > 0 && audio.muted) {
        audio.muted = false;
        setMuted(false);
      }
    },
    [cancelFade],
  );

  /*
   * ============================================================
   * NEXT TRACK
   * ============================================================
   */

  const nextTrack = useCallback(() => {
    const audio = audioRef.current;

    if (!audio || changingTrackRef.current) {
      return;
    }

    changingTrackRef.current = true;

    cancelFade();

    const nextIndex = (currentTrackIndex + 1) % MUSIC_TRACKS.length;

    const wasPlaying = !audio.paused;

    /*
     * Simpan posisi lagu lama.
     */
    window.localStorage.setItem(MUSIC_POSITION_KEY, "0");

    /*
     * Simpan track berikutnya.
     */
    window.localStorage.setItem(MUSIC_TRACK_KEY, String(nextIndex));

    /*
     * Reset posisi audio.
     */
    audio.pause();
    audio.currentTime = 0;

    setCurrentTrackIndex(nextIndex);

    restoredPositionRef.current = true;

    /*
     * Audio src akan berubah setelah state update.
     * Kalau sebelumnya sedang playing,
     * lagu berikutnya akan dijalankan oleh effect
     * setelah src berubah.
     */
    if (!wasPlaying) {
      changingTrackRef.current = false;
    }
  }, [cancelFade, currentTrackIndex]);

  /*
   * ============================================================
   * RESTORE LOCAL STORAGE
   * ============================================================
   */

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVolumeState(readStoredVolume());

      setActivated(window.localStorage.getItem(MUSIC_ACTIVATED_KEY) === "true");

      setCurrentTrackIndex(readStoredTrackIndex());
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  /*
   * ============================================================
   * ADMIN ROUTE
   *
   * Tidak ada setPlaying() di dalam effect.
   * onPause pada audio akan mengubah state.
   * ============================================================
   */

  useEffect(() => {
    if (!isAdminRoute) {
      return;
    }

    audioRef.current?.pause();
  }, [isAdminRoute]);

  /*
   * ============================================================
   * CHANGE AUDIO SOURCE WHEN TRACK CHANGES
   * ============================================================
   */

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    /*
     * Jangan menjalankan logic ketika admin.
     */
    if (isAdminRoute) {
      return;
    }

    /*
     * Reset state loading track.
     */
    restoredPositionRef.current = false;

    /*
     * Update source.
     */
    audio.src = currentTrack.src;
    audio.load();

    /*
     * Jika sebelumnya musik sedang aktif,
     * tunggu audio siap kemudian play.
     */
    const shouldPlay =
      window.localStorage.getItem(MUSIC_PLAYING_KEY) === "true";

    if (!shouldPlay) {
      changingTrackRef.current = false;
      return;
    }

    const handleCanPlay = () => {
      changingTrackRef.current = false;

      audio.volume = 0;

      void audio
        .play()
        .then(() => {
          fadeTo(volume);
        })
        .catch((playError) => {
          console.warn("Next track autoplay blocked:", playError);

          window.localStorage.setItem(MUSIC_PLAYING_KEY, "false");
        });
    };

    audio.addEventListener("canplay", handleCanPlay, { once: true });

    return () => {
      audio.removeEventListener("canplay", handleCanPlay);
    };
  }, [currentTrack.src, fadeTo, isAdminRoute, volume]);

  /*
   * ============================================================
   * AUTO RESUME
   * ============================================================
   */

  useEffect(() => {
    if (!activated || isAdminRoute) {
      return;
    }

    const shouldResume =
      window.localStorage.getItem(MUSIC_PLAYING_KEY) === "true";

    if (!shouldResume) {
      return;
    }

    const resume = () => {
      const audio = audioRef.current;

      if (audio?.paused) {
        play();
      }
    };

    window.addEventListener("pointerdown", resume, { once: true });

    window.addEventListener("keydown", resume, { once: true });

    return () => {
      window.removeEventListener("pointerdown", resume);

      window.removeEventListener("keydown", resume);
    };
  }, [activated, isAdminRoute, play]);

  /*
   * ============================================================
   * START MUSIC WHEN ENTERING GALLERY
   * ============================================================
   */

  useEffect(() => {
    function handleArchiveEntry(event: MouseEvent) {
      if (window.location.pathname !== "/") {
        return;
      }

      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      if (target.closest('a[href="/gallery"]')) {
        play();
      }
    }

    document.addEventListener("click", handleArchiveEntry, true);

    return () => {
      document.removeEventListener("click", handleArchiveEntry, true);
    };
  }, [play]);

  /*
   * ============================================================
   * SAVE CURRENT POSITION
   * ============================================================
   */

  useEffect(() => {
    if (!playing) {
      return;
    }

    const interval = window.setInterval(() => {
      const audio = audioRef.current;

      if (!audio) {
        return;
      }

      window.localStorage.setItem(
        MUSIC_POSITION_KEY,
        String(audio.currentTime),
      );
    }, 2500);

    return () => {
      window.clearInterval(interval);
    };
  }, [playing]);

  /*
   * ============================================================
   * CLEANUP
   * ============================================================
   */

  useEffect(() => {
    return () => {
      cancelFade();
    };
  }, [cancelFade]);

  /*
   * ============================================================
   * CONTEXT VALUE
   * ============================================================
   */

  const value = useMemo<BackgroundMusicContextValue>(
    () => ({
      activated,
      playing,
      muted,
      volume,
      error,

      currentTrack,
      currentTrackIndex,

      play,
      pause,
      togglePlay,
      toggleMute,
      setVolume,
      nextTrack,
    }),
    [
      activated,
      currentTrack,
      currentTrackIndex,
      error,
      muted,
      nextTrack,
      pause,
      play,
      playing,
      setVolume,
      toggleMute,
      togglePlay,
      volume,
    ],
  );

  /*
   * ============================================================
   * AUDIO
   * ============================================================
   */

  return (
    <BackgroundMusicContext.Provider value={value}>
      <audio
        ref={audioRef}
        src={currentTrack.src}
        preload="metadata"
        playsInline
        onLoadedMetadata={() => {
          const audio = audioRef.current;

          if (!audio) {
            return;
          }

          audio.volume = clampVolume(volume);

          /*
           * Restore posisi hanya sekali
           * untuk track yang sedang aktif.
           */
          if (!restoredPositionRef.current) {
            const storedPosition = Number(
              window.localStorage.getItem(MUSIC_POSITION_KEY) ?? "0",
            );

            if (
              Number.isFinite(storedPosition) &&
              storedPosition > 0 &&
              Number.isFinite(audio.duration) &&
              audio.duration > 0
            ) {
              audio.currentTime = storedPosition % audio.duration;
            }

            restoredPositionRef.current = true;
          }
        }}
        onPlay={() => {
          setPlaying(true);
        }}
        onPause={() => {
          setPlaying(false);
        }}
        onEnded={() => {
          nextTrack();
        }}
        onError={() => {
          setError("File musik belum ditemukan.");

          setPlaying(false);
        }}
      />

      {children}
    </BackgroundMusicContext.Provider>
  );
}
