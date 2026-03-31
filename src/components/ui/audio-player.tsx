'use client';

import { useEffect, useRef, useState } from 'react';
import { getAssetBlobUrl } from '@/lib/storage';

interface AudioPlayerProps {
  blobId: string | null;
  voiceScript?: string; // fallback: speak via Web Speech API
  compact?: boolean;
}

export function AudioPlayer({ blobId, voiceScript, compact = false }: AudioPlayerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!blobId) return;
    let url: string;
    getAssetBlobUrl(blobId).then((u) => {
      if (u) {
        url = u;
        setBlobUrl(u);
      }
    });
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [blobId]);

  function handlePlay() {
    if (blobUrl && audioRef.current) {
      if (playing) {
        audioRef.current.pause();
        setPlaying(false);
      } else {
        audioRef.current.play();
        setPlaying(true);
      }
    } else if (voiceScript) {
      // Fallback to Web Speech API
      import('@/lib/providers/web-speech').then(({ speak }) => speak(voiceScript));
    }
  }

  if (compact) {
    return (
      <button
        onClick={handlePlay}
        className="text-indigo-400 hover:text-indigo-300 text-sm"
        title={playing ? 'Pause' : 'Play voice'}
      >
        {playing ? '⏸' : '▶'}
        {blobUrl && (
          <audio
            ref={audioRef}
            src={blobUrl}
            onEnded={() => setPlaying(false)}
            className="hidden"
          />
        )}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-gray-700 rounded px-2 py-1">
      <button
        onClick={handlePlay}
        className="text-indigo-400 hover:text-indigo-300 w-5 h-5 flex items-center justify-center"
      >
        {playing ? '⏸' : '▶'}
      </button>
      <span className="text-xs text-gray-400 truncate flex-1">
        {voiceScript ? voiceScript.slice(0, 40) + '...' : 'Audio'}
      </span>
      {blobUrl && (
        <audio ref={audioRef} src={blobUrl} onEnded={() => setPlaying(false)} className="hidden" />
      )}
    </div>
  );
}
