'use client';

import type { Project } from '@/lib/types';
import { modelRouter } from '@/lib/model-router';

interface ModelRouterPanelProps {
  project: Project;
  onProviderChange: (type: keyof Project['activeProvider'], provider: string) => void;
}

export function ModelRouterPanel({ project, onProviderChange }: ModelRouterPanelProps) {
  const imageProviders = modelRouter.listByType('image');
  const voiceProviders = modelRouter.listByType('voice');

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-gray-900 border-b border-gray-800 text-xs">
      <span className="text-gray-500 font-medium shrink-0">Providers</span>

      <div className="flex items-center gap-2">
        <label className="text-gray-500">Image:</label>
        <select
          value={project.activeProvider.image}
          onChange={(e) => onProviderChange('image', e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {imageProviders.map((p) => (
            <option key={p.name} value={p.name}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-gray-500">Voice:</label>
        <select
          value={project.activeProvider.voice}
          onChange={(e) => onProviderChange('voice', e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {voiceProviders.map((p) => (
            <option key={p.name} value={p.name}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-gray-500">Decompose:</label>
        <span className="text-gray-400 bg-gray-800 border border-gray-700 rounded px-2 py-0.5">
          Gemini Flash
        </span>
      </div>
    </div>
  );
}
