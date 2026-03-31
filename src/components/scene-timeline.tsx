'use client';

import type { Scene } from '@/lib/types';
import { StatusDot } from '@/components/ui/status-indicator';
import { Card } from '@/components/ui/card';

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
      {scenes.map((scene) => {
        const imgAsset = scene.assets.find((a) => a.type === 'image');
        const voiceAsset = scene.assets.find((a) => a.type === 'voice');
        const imgStatus = imgAsset?.status ?? 'pending';
        const voiceStatus = voiceAsset?.status ?? 'pending';

        return (
          <Card
            key={scene.sceneId}
            className="flex-shrink-0 w-52 cursor-default"
            variant="elevated"
          >
            {/* Thumbnail */}
            <div className="h-28 bg-gray-700 rounded-t-lg overflow-hidden flex items-center justify-center relative">
              {imgStatus === 'complete' && imgAsset?.result ? (
                <img
                  src={imgAsset.result}
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

              {/* Voice mini-player placeholder */}
              {voiceStatus === 'complete' && voiceAsset?.result && (
                <div className="bg-gray-700 rounded px-2 py-1 text-xs text-gray-300 flex items-center gap-2">
                  <button
                    className="text-indigo-400 hover:text-indigo-300"
                    onClick={() => {
                      window.dispatchEvent(
                        new CustomEvent('timeline:play-voice', {
                          detail: { assetId: voiceAsset.assetId, sceneIndex: scene.index },
                        })
                      );
                    }}
                  >
                    ▶
                  </button>
                  <span className="truncate">{scene.voiceScript.slice(0, 30)}...</span>
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
      })}
    </div>
  );
}
