'use client';

import { useState, useCallback, useRef } from 'react';
import type { Scene } from '@/lib/types';

export type PlayerState = 'idle' | 'playing' | 'paused' | 'complete';

export interface VideoPlayerState {
  state: PlayerState;
  currentIndex: number;
  totalScenes: number;
}

export interface VideoPlayerControls {
  play: () => void;
  pause: () => void;
  resume: () => void;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  stop: () => void;
}

// Estimate speech duration from text length (~120 words/min, ~5 chars/word)
function estimateDurationMs(text: string): number {
  return Math.max(3000, (text.length / 5 / 120) * 60_000);
}

export function useVideoPlayer(scenes: Scene[]): [VideoPlayerState, VideoPlayerControls] {
  const [state, setState] = useState<PlayerState>('idle');
  const [currentIndex, setCurrentIndex] = useState(0);
  const isPlayingRef = useRef(false);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // True when paused while a fallback timer (no speechSynthesis) was active
  const pausedWithFallbackRef = useRef(false);

  function stopSpeech() {
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }

  const playScene = useCallback(
    (index: number) => {
      if (index >= scenes.length) {
        stopSpeech();
        setState('complete');
        isPlayingRef.current = false;
        return;
      }

      stopSpeech();
      setCurrentIndex(index);
      setState('playing');

      const scene = scenes[index];

      function onEnd() {
        if (!isPlayingRef.current) return;
        playScene(index + 1);
      }

      // Always use Web Speech API — stored blobs are empty because Web Speech
      // audio output bypasses AudioContext (can't be captured by MediaRecorder).
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        // No speech: time-based fallback
        fallbackTimerRef.current = setTimeout(onEnd, estimateDurationMs(scene.voiceScript));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(scene.voiceScript);
      utterance.rate = 0.9;
      utterance.lang = 'en-US';
      utterance.onend = onEnd;
      utterance.onerror = () => {
        // On error: wait proportional to text length before advancing
        fallbackTimerRef.current = setTimeout(onEnd, estimateDurationMs(scene.voiceScript));
      };
      window.speechSynthesis.speak(utterance);
    },
    [scenes]
  );

  const play = useCallback(() => {
    isPlayingRef.current = true;
    playScene(0);
  }, [playScene]);

  const pause = useCallback(() => {
    isPlayingRef.current = false;
    setState('paused');
    if (typeof window !== 'undefined') window.speechSynthesis?.pause();
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
      pausedWithFallbackRef.current = true;
    } else {
      pausedWithFallbackRef.current = false;
    }
  }, []);

  const resume = useCallback(() => {
    isPlayingRef.current = true;
    setState('playing');
    if (pausedWithFallbackRef.current) {
      // Fallback timer was active when paused — restart the scene
      pausedWithFallbackRef.current = false;
      playScene(currentIndex);
    } else {
      if (typeof window !== 'undefined') window.speechSynthesis?.resume();
    }
  }, [playScene, currentIndex]);

  const next = useCallback(() => {
    if (currentIndex < scenes.length - 1) {
      isPlayingRef.current = state !== 'paused';
      playScene(currentIndex + 1);
    }
  }, [currentIndex, scenes.length, state, playScene]);

  const prev = useCallback(() => {
    if (currentIndex > 0) {
      isPlayingRef.current = state !== 'paused';
      playScene(currentIndex - 1);
    }
  }, [currentIndex, state, playScene]);

  const goTo = useCallback(
    (index: number) => {
      if (index >= 0 && index < scenes.length) {
        isPlayingRef.current = state !== 'paused';
        playScene(index);
      }
    },
    [scenes.length, state, playScene]
  );

  const stop = useCallback(() => {
    isPlayingRef.current = false;
    stopSpeech();
    setState('idle');
    setCurrentIndex(0);
  }, []);

  return [
    { state, currentIndex, totalScenes: scenes.length },
    { play, pause, resume, next, prev, goTo, stop },
  ];
}
