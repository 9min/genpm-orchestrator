'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useProjectStore } from '@/lib/store';
import { PipelineDAG } from '@/components/pipeline-dag';
import { SceneTimeline } from '@/components/scene-timeline';
import { buildMockProject } from '@/lib/dag-builder';
import { Button } from '@/components/ui/button';
import type { Project } from '@/lib/types';

export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { projects, setActiveProject } = useProjectStore();
  const [project, setProject] = useState<Project | null>(null);
  const [useMock, setUseMock] = useState(false);

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

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading...
      </div>
    );
  }

  const totalCost = project.pipeline.totalCost;
  const sceneCount = project.scenes.length;
  const completeCount = project.scenes.filter((s) =>
    s.assets.every((a) => a.status === 'complete')
  ).length;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="flex-shrink-0 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="text-gray-400 hover:text-gray-200 text-sm transition-colors"
          >
            ← Projects
          </button>
          <span className="text-gray-700">/</span>
          <h1 className="text-sm font-semibold text-gray-100">{project.name}</h1>
          {useMock && (
            <span className="text-xs bg-amber-900/40 text-amber-300 px-2 py-0.5 rounded-full border border-amber-700/30">
              Demo Mode
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {sceneCount > 0 && (
              <span>
                {completeCount}/{sceneCount} scenes done
              </span>
            )}
            {totalCost.usd > 0 && (
              <span className="text-emerald-400">
                ~${totalCost.usd.toFixed(2)} saved
              </span>
            )}
          </div>

          <Button variant="secondary" size="sm" onClick={() => router.push('/')}>
            All Projects
          </Button>
        </div>
      </header>

      {/* Main workspace: split into DAG (top) + Timeline (bottom) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Pipeline DAG — 60% height */}
        <div className="flex-1 min-h-0" style={{ flex: '1 1 60%' }}>
          <div className="h-full p-2">
            <PipelineDAG project={project} />
          </div>
        </div>

        {/* Divider */}
        <div className="flex-shrink-0 h-px bg-gray-800 mx-4" />

        {/* Scene Timeline — fixed 200px */}
        <div className="flex-shrink-0 h-52 px-4 py-3 overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Scene Timeline
            </h2>
            {sceneCount > 0 && (
              <span className="text-xs text-gray-500">{sceneCount} scenes</span>
            )}
          </div>
          <div className="h-40 overflow-y-hidden">
            <SceneTimeline scenes={project.scenes} />
          </div>
        </div>
      </div>
    </div>
  );
}
