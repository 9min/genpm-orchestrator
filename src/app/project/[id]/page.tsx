'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useProjectStore } from '@/lib/store';
import { PipelineDAG } from '@/components/pipeline-dag';
import { SceneTimeline } from '@/components/scene-timeline';
import { ScriptEngine } from '@/components/script-engine';
import { CostDashboard } from '@/components/cost-dashboard';
import { ModelRouterPanel } from '@/components/model-router-panel';
import { buildMockProject } from '@/lib/dag-builder';
import { Button } from '@/components/ui/button';
import { generateSceneAssets } from '@/lib/pipeline-runner';
import { ErrorBoundary } from '@/components/error-boundary';
import { VideoPlayer } from '@/components/video-player';
import type { Project, Scene } from '@/lib/types';

export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const store = useProjectStore();
  const { projects, setActiveProject, setScript, setScenes, setProvider } = store;
  const [project, setProject] = useState<Project | null>(null);
  const [useMock, setUseMock] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [apiStatus, setApiStatus] = useState<{
    gemini: string;
    huggingface: string;
  } | null>(null);
  const hasCheckedHealth = useRef(false);

  // Keep local project state in sync with store
  useEffect(() => {
    const id = params.id;
    if (id === 'mock') {
      setProject(buildMockProject());
      setUseMock(true);
      return;
    }
    const found = projects.find((p) => p.id === id);
    if (found) {
      setProject(found);
      setActiveProject(id);
    } else {
      router.replace('/');
    }
  }, [params.id, projects, setActiveProject, router]);

  // Check API health once on mount
  useEffect(() => {
    if (hasCheckedHealth.current || useMock) return;
    hasCheckedHealth.current = true;
    fetch('/api/health')
      .then((r) => r.json())
      .then((data) => setApiStatus({ gemini: data.gemini, huggingface: data.huggingface }))
      .catch(() => {});
  }, [useMock]);

  const handleScriptChange = useCallback(
    (script: string) => {
      if (!project || useMock) return;
      setScript(project.id, script);
    },
    [project, useMock, setScript]
  );

  const handleScenesGenerated = useCallback(
    (scenes: Scene[]) => {
      if (!project || useMock) return;
      setScenes(project.id, scenes);
    },
    [project, useMock, setScenes]
  );

  const handleProviderChange = useCallback(
    (type: keyof Project['activeProvider'], provider: string) => {
      if (!project || useMock) return;
      setProvider(project.id, type, provider);
    },
    [project, useMock, setProvider]
  );

  const handleGenerateAll = useCallback(async () => {
    if (!project || useMock || generating) return;
    const currentProject = projects.find((p) => p.id === project.id);
    if (!currentProject || currentProject.scenes.length === 0) return;

    setGenerating(true);
    // Generate all scenes in parallel
    await Promise.allSettled(
      currentProject.scenes.map((scene) => generateSceneAssets(currentProject, scene, store))
    );
    setGenerating(false);
  }, [project, useMock, generating, projects, store]);

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading...
      </div>
    );
  }

  const liveProject = useMock ? project : (projects.find((p) => p.id === project.id) ?? project);
  const sceneCount = liveProject.scenes.length;
  const completeCount = liveProject.scenes.filter((s) =>
    s.assets.every((a) => a.status === 'complete')
  ).length;
  const totalCost = liveProject.pipeline.totalCost;
  const pendingScenes = liveProject.scenes.filter((s) =>
    s.assets.some((a) => a.status === 'pending' || a.status === 'failed')
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="flex-shrink-0 border-b border-gray-800 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="text-gray-400 hover:text-gray-200 text-sm transition-colors"
          >
            ← Projects
          </button>
          <span className="text-gray-700">/</span>
          <h1 className="text-sm font-semibold text-gray-100">{liveProject.name}</h1>
          {useMock && (
            <span className="text-xs bg-amber-900/40 text-amber-300 px-2 py-0.5 rounded-full border border-amber-700/30">
              Demo Mode
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* API key status indicators */}
          {apiStatus && !useMock && (
            <div className="flex items-center gap-2 text-xs">
              <span
                className={
                  apiStatus.gemini === 'configured' ? 'text-green-400' : 'text-gray-600'
                }
                title={`Gemini: ${apiStatus.gemini}`}
              >
                ◉ Gemini
              </span>
              <span
                className={
                  apiStatus.huggingface === 'configured' ? 'text-green-400' : 'text-gray-600'
                }
                title={`HuggingFace: ${apiStatus.huggingface}`}
              >
                ◉ HF
              </span>
            </div>
          )}

          {sceneCount > 0 && (
            <span className="text-xs text-gray-500">
              {completeCount}/{sceneCount} done
            </span>
          )}
          {totalCost.usd > 0 && (
            <span className="text-xs text-emerald-400">~${totalCost.usd.toFixed(3)} saved</span>
          )}

          {/* Generate All button */}
          {pendingScenes.length > 0 && !useMock && (
            <Button
              size="sm"
              onClick={handleGenerateAll}
              loading={generating}
              disabled={generating}
            >
              {generating ? 'Generating...' : `Generate All (${pendingScenes.length})`}
            </Button>
          )}

          {/* Watch button — enabled when at least 1 scene has complete image */}
          {sceneCount > 0 && liveProject.scenes.some((s) => s.assets.find((a) => a.type === 'image')?.status === 'complete') && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowPlayer(true)}
              className="border border-indigo-700/50 text-indigo-400 hover:text-indigo-300"
            >
              ▶ Watch
            </Button>
          )}
        </div>
      </header>

      {/* Video player modal */}
      {showPlayer && (
        <VideoPlayer
          scenes={liveProject.scenes}
          onClose={() => setShowPlayer(false)}
        />
      )}

      {/* Provider selector bar */}
      {!useMock && (
        <ModelRouterPanel project={liveProject} onProviderChange={handleProviderChange} />
      )}

      {/* Main workspace */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left panel: Script Engine (collapsible) */}
        {!useMock && (
          <div className="w-72 flex-shrink-0 border-r border-gray-800 overflow-y-auto p-3 space-y-3">
            <ScriptEngine
              project={liveProject}
              onScenesGenerated={handleScenesGenerated}
              onScriptChange={handleScriptChange}
            />
          </div>
        )}

        {/* Right: DAG + Timeline */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Pipeline DAG */}
          <div className="flex-1 min-h-0 p-2">
            <ErrorBoundary label="Pipeline DAG">
              <PipelineDAG project={liveProject} />
            </ErrorBoundary>
          </div>

          <div className="flex-shrink-0 h-px bg-gray-800 mx-4" />

          {/* Scene Timeline */}
          <div className="flex-shrink-0 h-48 px-4 py-2 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Scene Timeline
              </h2>
              {sceneCount > 0 && (
                <span className="text-xs text-gray-500">{sceneCount} scenes</span>
              )}
            </div>
            <div className="h-36 overflow-y-hidden">
              <ErrorBoundary label="Scene Timeline">
                <SceneTimeline scenes={liveProject.scenes} />
              </ErrorBoundary>
            </div>
          </div>

          {/* Cost bar */}
          <CostDashboard project={liveProject} />
        </div>
      </div>
    </div>
  );
}
