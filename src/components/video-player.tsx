'use client';

import { useEffect, useState } from 'react';
import type { Scene } from '@/lib/types';
import { getAssetBlobUrl } from '@/lib/storage';
import { useVideoPlayer } from '@/hooks/useVideoPlayer';

// Ken Burns keyframe variants — different per scene to avoid monotony
const KB_VARIANTS = [
  'kenburns-zoom-in-left',
  'kenburns-zoom-in-right',
  'kenburns-zoom-out-center',
  'kenburns-pan-right',
];

function getVariant(index: number) {
  return KB_VARIANTS[index % KB_VARIANTS.length];
}

interface SceneFrameProps {
  scene: Scene;
  isActive: boolean;
  variant: string;
}

function SceneFrame({ scene, isActive, variant }: SceneFrameProps) {
  const imgAsset = scene.assets.find((a) => a.type === 'image');
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!imgAsset?.result) return;
    let url: string;
    getAssetBlobUrl(imgAsset.result).then((u) => {
      if (u) {
        url = u;
        setImgUrl(u);
      }
    });
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [imgAsset?.result]);

  const hasImage = imgAsset?.status === 'complete' && imgUrl;

  return (
    <div className="absolute inset-0 overflow-hidden rounded-lg">
      {hasImage ? (
        <img
          key={`${scene.sceneId}-${isActive}`}
          src={imgUrl!}
          alt={scene.description}
          className={`w-full h-full object-cover ${isActive ? variant : ''}`}
          style={{ animationDuration: '10s', animationFillMode: 'both' }}
        />
      ) : (
        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
          <p className="text-gray-400 text-sm text-center px-4">{scene.description}</p>
        </div>
      )}
      {/* Subtitle overlay */}
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-8">
          <p className="text-white text-sm text-center leading-relaxed">
            {scene.voiceScript}
          </p>
        </div>
      )}
    </div>
  );
}

interface VideoPlayerProps {
  scenes: Scene[];
  onClose: () => void;
}

export function VideoPlayer({ scenes, onClose }: VideoPlayerProps) {
  const [playerState, controls] = useVideoPlayer(scenes);
  const { state, currentIndex, totalScenes } = playerState;

  const currentScene = scenes[currentIndex];
  const isPlaying = state === 'playing';
  const isComplete = state === 'complete';
  const isIdle = state === 'idle';

  // Auto-start on mount
  useEffect(() => {
    controls.play();
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { controls.stop(); onClose(); }
      if (e.key === ' ') { e.preventDefault(); isPlaying ? controls.pause() : controls.resume(); }
      if (e.key === 'ArrowRight') controls.next();
      if (e.key === 'ArrowLeft') controls.prev();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [controls, isPlaying, onClose]);

  const handlePlayPause = () => {
    if (isComplete || isIdle) { controls.play(); return; }
    if (isPlaying) controls.pause();
    else controls.resume();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      <div className="w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-sm text-gray-400 font-medium">
            {isComplete ? 'Complete' : `Scene ${currentIndex + 1} / ${totalScenes}`}
          </span>
          <button
            onClick={() => { controls.stop(); onClose(); }}
            className="text-gray-400 hover:text-white transition-colors text-sm px-3 py-1 rounded hover:bg-gray-800"
          >
            ✕ Close
          </button>
        </div>

        {/* Video frame */}
        <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
          {currentScene && !isComplete && (
            <SceneFrame
              scene={currentScene}
              isActive={isPlaying}
              variant={getVariant(currentIndex)}
            />
          )}
          {isComplete && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <div className="text-4xl">🎬</div>
              <p className="text-gray-300 text-sm">Playback complete</p>
              <button
                onClick={() => controls.play()}
                className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-md transition-colors"
              >
                Watch again
              </button>
            </div>
          )}
          {isIdle && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={controls.play}
                className="w-16 h-16 rounded-full bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center text-2xl transition-colors"
              >
                ▶
              </button>
            </div>
          )}
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {scenes.map((_, i) => (
            <button
              key={i}
              onClick={() => controls.goTo(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === currentIndex && !isComplete
                  ? 'w-6 bg-indigo-400'
                  : i < currentIndex || isComplete
                  ? 'w-1.5 bg-gray-500'
                  : 'w-1.5 bg-gray-700'
              }`}
            />
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 mt-3">
          <button
            onClick={controls.prev}
            disabled={currentIndex === 0 || isIdle}
            className="text-gray-400 hover:text-white disabled:opacity-30 transition-colors px-3 py-1.5 text-sm rounded hover:bg-gray-800"
          >
            ◀ Prev
          </button>

          <button
            onClick={handlePlayPause}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-6 py-2 rounded-md transition-colors min-w-[80px]"
          >
            {isPlaying ? '⏸ Pause' : isComplete ? '↺ Replay' : '▶ Play'}
          </button>

          <button
            onClick={controls.next}
            disabled={currentIndex >= totalScenes - 1 || isIdle || isComplete}
            className="text-gray-400 hover:text-white disabled:opacity-30 transition-colors px-3 py-1.5 text-sm rounded hover:bg-gray-800"
          >
            Next ▶
          </button>
        </div>

        <p className="text-center text-xs text-gray-600 mt-2">
          Space = play/pause · ← → = prev/next · Esc = close
        </p>
      </div>
    </div>
  );
}
