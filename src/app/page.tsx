'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { StatusDot } from '@/components/ui/status-indicator';
import type { Project, DAGNodeStatus } from '@/lib/types';

export default function HomePage() {
  const router = useRouter();
  const { projects, createProject, deleteProject, setActiveProject } = useProjectStore();
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    const project = createProject(newName.trim());
    router.push(`/project/${project.id}`);
  }

  function handleOpen(id: string) {
    setActiveProject(id);
    router.push(`/project/${id}`);
  }

  function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (confirm('Delete this project?')) {
      deleteProject(id);
    }
  }

  function overallStatus(p: Project): DAGNodeStatus {
    if (p.scenes.length === 0) return 'pending';
    if (p.scenes.every((s) => s.assets.every((a) => a.status === 'complete'))) return 'complete';
    if (p.scenes.some((s) => s.assets.some((a) => a.status === 'failed'))) return 'failed';
    if (p.scenes.some((s) => s.assets.some((a) => a.status === 'generating'))) return 'generating';
    return 'pending';
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-100">SceneForge</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              AI video pipeline orchestrator
            </p>
          </div>
          <span className="text-xs text-gray-600 bg-gray-800 px-2 py-1 rounded-full">
            {projects.length}/3 projects
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">
        <Card className="mb-8">
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-200">New Project</h2>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="Enter project name..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                maxLength={80}
              />
              <Button
                onClick={handleCreate}
                disabled={!newName.trim() || creating || projects.length >= 3}
                loading={creating}
              >
                Create Project
              </Button>
            </div>
            {projects.length >= 3 && (
              <p className="text-xs text-amber-400 mt-2">
                Max 3 projects. Delete one to create a new project.
              </p>
            )}
          </CardContent>
        </Card>

        {projects.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <div className="text-4xl mb-3">🎬</div>
            <p className="text-sm">No projects yet. Create one to start building your pipeline.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Projects
            </h2>
            {projects.map((project) => {
              const status = overallStatus(project);
              const totalCost = project.pipeline.totalCost;
              return (
                <Card
                  key={project.id}
                  className="cursor-pointer hover:border-gray-600 transition-colors"
                  onClick={() => handleOpen(project.id)}
                >
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <StatusDot status={status} />
                      <div>
                        <p className="font-medium text-gray-100 text-sm">{project.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {project.scenes.length > 0
                            ? `${project.scenes.length} scenes`
                            : 'No scenes yet'}{' '}
                          &middot; {new Date(project.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {totalCost.usd > 0 && (
                        <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                          ~${totalCost.usd.toFixed(2)} saved
                        </span>
                      )}
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={(e) => handleDelete(e, project.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
