"use client";

import { useEffect, useRef, useState } from "react";

interface UseCharacterBlinkOptions {
  minInterval?: number;
  maxInterval?: number;
  blinkDuration?: number;
  doubleBlinkChance?: number;
  enabled?: boolean;
}

export function useCharacterBlink({
  minInterval = 3200,
  maxInterval = 6800,
  blinkDuration = 135,
  doubleBlinkChance = 0.18,
  enabled = true,
}: UseCharacterBlinkOptions = {}) {
  const [eyesClosed, setEyesClosed] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    const clearTimer = () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const scheduleNextBlink = () => {
      if (cancelled) {
        return;
      }

      const delay =
        minInterval + Math.random() * Math.max(0, maxInterval - minInterval);

      timeoutRef.current = window.setTimeout(() => {
        if (cancelled) {
          return;
        }

        setEyesClosed(true);

        timeoutRef.current = window.setTimeout(() => {
          if (cancelled) {
            return;
          }

          setEyesClosed(false);

          const shouldDoubleBlink = Math.random() < doubleBlinkChance;

          if (!shouldDoubleBlink) {
            scheduleNextBlink();
            return;
          }

          timeoutRef.current = window.setTimeout(() => {
            if (cancelled) {
              return;
            }

            setEyesClosed(true);

            timeoutRef.current = window.setTimeout(() => {
              if (cancelled) {
                return;
              }

              setEyesClosed(false);
              scheduleNextBlink();
            }, blinkDuration);
          }, 155);
        }, blinkDuration);
      }, delay);
    };

    scheduleNextBlink();

    return () => {
      cancelled = true;
      clearTimer();
    };
  }, [
    blinkDuration,
    doubleBlinkChance,
    enabled,
    maxInterval,
    minInterval,
  ]);

  return eyesClosed;
}
