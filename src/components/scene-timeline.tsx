'use client';

import { useEffect, useState } from 'react';
import type { Scene } from '@/lib/types';
import { StatusDot } from '@/components/ui/status-indicator';
import { Card } from '@/components/ui/card';
import { getAssetBlobUrl } from '@/lib/storage';
import { speak } from '@/lib/providers/web-speech';

// Resolves IndexedDB blob IDs to object URLs for display
function useAssetUrl(blobId: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blobId) return;
    let objectUrl: string;
    getAssetBlobUrl(blobId).then((u) => {
      if (u) {
        objectUrl = u;
        setUrl(u);
      }
    });
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [blobId]);

  return url;
}

function SceneCard({ scene }: { scene: Scene }) {
  const imgAsset = scene.assets.find((a) => a.type === 'image');
  const voiceAsset = scene.assets.find((a) => a.type === 'voice');
  const imgStatus = imgAsset?.status ?? 'pending';
  const voiceStatus = voiceAsset?.status ?? 'pending';

  const imgUrl = useAssetUrl(imgAsset?.result);

  function handlePlayVoice() {
    if (voiceAsset?.result) {
      // Try blob URL first
      getAssetBlobUrl(voiceAsset.result).then((url) => {
        if (url) {
          const audio = new Audio(url);
          audio.play().catch(() => {
            // Fallback to Web Speech
            speak(scene.voiceScript);
          });
        } else {
          speak(scene.voiceScript);
        }
      });
    } else {
      speak(scene.voiceScript);
    }
  }

  return (
    <Card className="flex-shrink-0 w-52 cursor-default" variant="elevated">
      {/* Thumbnail */}
      <div className="h-28 bg-gray-700 rounded-t-lg overflow-hidden flex items-center justify-center relative">
        {imgStatus === 'complete' && imgUrl ? (
          <img
            src={imgUrl}
            alt={`Scene ${scene.index + 1}`}
            className="w-full h-full object-cover"
          />
        ) : imgStatus === 'generating' ? (
          <div className="text-yellow-400 text-sm animate-pulse">Generating...</div>
        ) : imgStatus === 'failed' ? (
          <div className="text-red-400 text-sm">Failed</div>
        ) : (
          <div className="text-gray-500 text-sm">🖼️ Pending</div>
        )}
        <div className="absolute top-1.5 left-1.5 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
          {scene.index + 1}
        </div>
      </div>

      {/* Content */}
      <div className="p-2.5 space-y-2">
        <p className="text-xs text-gray-200 leading-snug line-clamp-2">
          {scene.description}
        </p>

        {/* Asset status row */}
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <StatusDot status={imgStatus} />
            Image
          </span>
          <span className="flex items-center gap-1">
            <StatusDot status={voiceStatus} />
            Voice
          </span>
        </div>

        {/* Voice mini-player */}
        {(voiceStatus === 'complete' || scene.voiceScript) && (
          <div className="bg-gray-700 rounded px-2 py-1 text-xs text-gray-300 flex items-center gap-2">
            <button
              className="text-indigo-400 hover:text-indigo-300"
              onClick={handlePlayVoice}
            >
              ▶
            </button>
            <span className="truncate">
              {scene.voiceScript ? scene.voiceScript.slice(0, 35) + '...' : 'Play narration'}
            </span>
          </div>
        )}

        {/* Cost pill */}
        {scene.assets.some((a) => a.status === 'complete' && a.cost.usd > 0) && (
          <div className="flex justify-end">
            <span className="text-xs text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">
              ~${scene.assets.reduce((s, a) => s + a.cost.usd, 0).toFixed(2)}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

interface SceneTimelineProps {
  scenes: Scene[];
}

export function SceneTimeline({ scenes }: SceneTimelineProps) {
  if (scenes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        No scenes yet. Generate scenes from your script above.
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 h-full items-start">
      {scenes.map((scene) => (
        <SceneCard key={scene.sceneId} scene={scene} />
      ))}
    </div>
  );
}
