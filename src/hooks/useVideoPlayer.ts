'use client';

import { useState, useCallback, useRef } from 'react';
import type { Scene } from '@/lib/types';
import { getAssetBlobUrl } from '@/lib/storage';
import { speak } from '@/lib/providers/web-speech';

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

export function useVideoPlayer(scenes: Scene[]): [VideoPlayerState, VideoPlayerControls] {
  const [state, setState] = useState<PlayerState>('idle');
  const [currentIndex, setCurrentIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const isPlayingRef = useRef(false);

  function cleanupAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    if (typeof window !== 'undefined') {
      window.speechSynthesis?.cancel();
    }
  }

  const playScene = useCallback(
    async (index: number) => {
      if (index >= scenes.length) {
        setState('complete');
        isPlayingRef.current = false;
        return;
      }

      cleanupAudio();
      setCurrentIndex(index);
      setState('playing');

      const scene = scenes[index];
      const voiceAsset = scene.assets.find((a) => a.type === 'voice');

      function onAudioEnd() {
        if (!isPlayingRef.current) return;
        playScene(index + 1);
      }

      if (voiceAsset?.result) {
        const url = await getAssetBlobUrl(voiceAsset.result);
        if (url && isPlayingRef.current) {
          blobUrlRef.current = url;
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onended = onAudioEnd;
          audio.onerror = () => {
            // Fallback to Web Speech on audio error
            speakWithFallback(scene.voiceScript, onAudioEnd);
          };
          audio.play().catch(() => {
            speakWithFallback(scene.voiceScript, onAudioEnd);
          });
          return;
        }
      }

      // Fallback: Web Speech API
      speakWithFallback(scene.voiceScript, onAudioEnd);
    },
    [scenes]
  );

  function speakWithFallback(text: string, onEnd: () => void) {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      // No speech available — advance after 5s per scene
      const t = setTimeout(onEnd, 5000);
      audioRef.current = { pause: () => clearTimeout(t), onended: null } as unknown as HTMLAudioElement;
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
    window.speechSynthesis.speak(utterance);
  }

  const play = useCallback(() => {
    isPlayingRef.current = true;
    playScene(0);
  }, [playScene]);

  const pause = useCallback(() => {
    isPlayingRef.current = false;
    setState('paused');
    if (audioRef.current) audioRef.current.pause();
    if (typeof window !== 'undefined') window.speechSynthesis?.pause();
  }, []);

  const resume = useCallback(() => {
    isPlayingRef.current = true;
    setState('playing');
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    } else if (typeof window !== 'undefined') {
      window.speechSynthesis?.resume();
    }
  }, []);

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
    cleanupAudio();
    setState('idle');
    setCurrentIndex(0);
  }, []);

  return [
    { state, currentIndex, totalScenes: scenes.length },
    { play, pause, resume, next, prev, goTo, stop },
  ];
}
