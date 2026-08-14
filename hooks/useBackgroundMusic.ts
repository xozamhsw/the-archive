"use client";

import { createContext, useContext } from "react";

export interface BackgroundMusicTrack {
  title: string;
  artist: string;
  src: string;
}

export interface BackgroundMusicContextValue {
  activated: boolean;
  playing: boolean;
  muted: boolean;
  volume: number;
  error: string | null;

  currentTrack: BackgroundMusicTrack;
  currentTrackIndex: number;

  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  toggleMute: () => void;
  setVolume: (value: number) => void;
  nextTrack: () => void;
}

export const BackgroundMusicContext =
  createContext<BackgroundMusicContextValue | null>(null);

export function useBackgroundMusic() {
  const context = useContext(BackgroundMusicContext);

  if (!context) {
    throw new Error(
      "useBackgroundMusic harus digunakan di dalam BackgroundMusicProvider.",
    );
  }

  return context;
}
