'use client';

import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { SceneNodeType } from '@/lib/types';
import { StatusBadge } from '@/components/ui/status-indicator';

export function SceneNode({ data }: NodeProps<SceneNodeType>) {
  const isSceneSplit = data.sceneIndex === -1;

  return (
    <div className={`dag-node ${isSceneSplit ? 'dag-node--split' : 'dag-node--scene'}`}>
      <Handle type="target" position={Position.Top} />

      <div className="dag-node__header">
        <span className="dag-node__icon">{isSceneSplit ? '⚡' : '🎬'}</span>
        <span className="dag-node__label">{data.label}</span>
      </div>
      <StatusBadge status={data.status} />
      {data.description && (
        <p className="dag-node__meta text-xs text-gray-400 mt-1 max-w-[140px] leading-tight line-clamp-2">
          {data.description}
        </p>
      )}

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
