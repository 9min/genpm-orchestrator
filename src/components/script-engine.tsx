'use client';

import { useState } from 'react';
import type { Project, Scene } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { DEMO_PRESET_SCRIPT, MIN_SCENES, MAX_SCENES } from '@/lib/constants';

interface ScriptEngineProps {
  project: Project;
  onScenesGenerated: (scenes: Scene[]) => void;
  onScriptChange: (script: string) => void;
}

type Mode = 'auto' | 'manual';
type GenerateState = 'idle' | 'loading' | 'error-fallback';

const BLANK_SCENE = { description: '', imagePrompt: '', voiceScript: '' };

export function ScriptEngine({ project, onScenesGenerated, onScriptChange }: ScriptEngineProps) {
  const [mode, setMode] = useState<Mode>('auto');
  const [state, setState] = useState<GenerateState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [manualScenes, setManualScenes] = useState([
    { ...BLANK_SCENE },
    { ...BLANK_SCENE },
    { ...BLANK_SCENE },
  ]);

  async function handleGenerateScenes() {
    if (!project.script.trim()) return;
    setState('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: project.script }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        // Fallback to manual if key is missing or quota exceeded
        if (res.status === 503 || res.status === 429 || res.status === 401) {
          setErrorMsg(err.error ?? 'Gemini unavailable');
          setState('error-fallback');
          setMode('manual');
          return;
        }
        throw new Error(err.error ?? `Request failed (${res.status})`);
      }

      const { scenes: rawScenes } = await res.json();
      const scenes: Scene[] = rawScenes.map(
        (
          raw: { description: string; imagePrompt: string; voiceScript: string },
          index: number
        ) => ({
          sceneId: `scene_${project.id}_${index}`,
          index,
          description: raw.description,
          imagePrompt: raw.imagePrompt,
          voiceScript: raw.voiceScript,
          assets: [
            {
              assetId: `asset_img_${project.id}_${index}`,
              type: 'image' as const,
              provider: project.activeProvider.image,
              status: 'pending' as const,
              cost: { credits: 0, usd: 0 },
              latencyMs: 0,
              result: null,
              prompt: raw.imagePrompt,
            },
            {
              assetId: `asset_voice_${project.id}_${index}`,
              type: 'voice' as const,
              provider: project.activeProvider.voice,
              status: 'pending' as const,
              cost: { credits: 0, usd: 0 },
              latencyMs: 0,
              result: null,
              prompt: raw.voiceScript,
            },
          ],
        })
      );

      onScenesGenerated(scenes);
      setState('idle');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setState('error-fallback');
      setMode('manual');
    }
  }

  function handleManualSubmit() {
    const filled = manualScenes.filter(
      (s) => s.description.trim() || s.imagePrompt.trim() || s.voiceScript.trim()
    );
    if (filled.length === 0) return;

    const scenes: Scene[] = filled.map((raw, index) => ({
      sceneId: `scene_${project.id}_${index}`,
      index,
      description: raw.description || `Scene ${index + 1}`,
      imagePrompt: raw.imagePrompt || raw.description || `Scene ${index + 1}`,
      voiceScript: raw.voiceScript || raw.description || `Scene ${index + 1}`,
      assets: [
        {
          assetId: `asset_img_${project.id}_${index}`,
          type: 'image' as const,
          provider: project.activeProvider.image,
          status: 'pending' as const,
          cost: { credits: 0, usd: 0 },
          latencyMs: 0,
          result: null,
          prompt: raw.imagePrompt || raw.description,
        },
        {
          assetId: `asset_voice_${project.id}_${index}`,
          type: 'voice' as const,
          provider: project.activeProvider.voice,
          status: 'pending' as const,
          cost: { credits: 0, usd: 0 },
          latencyMs: 0,
          result: null,
          prompt: raw.voiceScript || raw.description,
        },
      ],
    }));

    onScenesGenerated(scenes);
  }

  function updateManualScene(
    index: number,
    field: keyof typeof BLANK_SCENE,
    value: string
  ) {
    setManualScenes((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function addManualScene() {
    if (manualScenes.length >= MAX_SCENES) return;
    setManualScenes((prev) => [...prev, { ...BLANK_SCENE }]);
  }

  function removeManualScene(index: number) {
    if (manualScenes.length <= MIN_SCENES) return;
    setManualScenes((prev) => prev.filter((_, i) => i !== index));
  }

  const hasScenes = project.scenes.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-200">Script Engine</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMode('auto')}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                mode === 'auto'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Auto (Gemini)
            </button>
            <button
              onClick={() => setMode('manual')}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                mode === 'manual'
                  ? 'bg-gray-600 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Manual
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Script textarea — always visible */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-gray-400">Script / Story</label>
            <button
              onClick={() => onScriptChange(DEMO_PRESET_SCRIPT)}
              className="text-xs text-indigo-400 hover:text-indigo-300"
            >
              Try Demo
            </button>
          </div>
          <textarea
            value={project.script}
            onChange={(e) => onScriptChange(e.target.value)}
            placeholder="Enter your story or script here..."
            className="w-full h-24 bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        {/* Error/fallback banner */}
        {state === 'error-fallback' && (
          <div className="bg-amber-900/30 border border-amber-700/40 rounded-md px-3 py-2 text-xs text-amber-300">
            <span className="font-medium">Gemini unavailable:</span> {errorMsg}
            <span className="ml-2 text-amber-400">Switched to manual mode.</span>
          </div>
        )}

        {mode === 'auto' ? (
          <div className="flex items-center gap-2">
            <Button
              onClick={handleGenerateScenes}
              disabled={!project.script.trim() || state === 'loading'}
              loading={state === 'loading'}
              className="flex-1"
            >
              {hasScenes ? 'Re-generate Scenes' : 'Generate Scenes'}
            </Button>
            {hasScenes && (
              <span className="text-xs text-gray-500">{project.scenes.length} scenes</span>
            )}
          </div>
        ) : (
          /* Manual scene input */
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              Enter scene details manually ({manualScenes.length}/{MAX_SCENES} scenes)
            </p>
            {manualScenes.map((scene, i) => (
              <div key={i} className="border border-gray-700 rounded-md p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-300">Scene {i + 1}</span>
                  {manualScenes.length > MIN_SCENES && (
                    <button
                      onClick={() => removeManualScene(i)}
                      className="text-xs text-gray-500 hover:text-red-400"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={scene.description}
                  onChange={(e) => updateManualScene(i, 'description', e.target.value)}
                  placeholder="Scene description..."
                  className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <input
                  type="text"
                  value={scene.imagePrompt}
                  onChange={(e) => updateManualScene(i, 'imagePrompt', e.target.value)}
                  placeholder="Image prompt (cinematic, detailed)..."
                  className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <input
                  type="text"
                  value={scene.voiceScript}
                  onChange={(e) => updateManualScene(i, 'voiceScript', e.target.value)}
                  placeholder="Narration text..."
                  className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            ))}
            <div className="flex gap-2">
              {manualScenes.length < MAX_SCENES && (
                <Button variant="ghost" size="sm" onClick={addManualScene}>
                  + Add Scene
                </Button>
              )}
              <Button
                onClick={handleManualSubmit}
                disabled={manualScenes.every(
                  (s) => !s.description.trim() && !s.imagePrompt.trim()
                )}
                className="flex-1"
              >
                Use These Scenes
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
