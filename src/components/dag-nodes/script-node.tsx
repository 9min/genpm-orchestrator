'use client';

import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { ScriptNodeType } from '@/lib/types';
import { StatusBadge } from '@/components/ui/status-indicator';

export function ScriptNode({ data }: NodeProps<ScriptNodeType>) {
  return (
    <div className="dag-node dag-node--script">
      <div className="dag-node__header">
        <span className="dag-node__icon">📝</span>
        <span className="dag-node__label">{data.label}</span>
      </div>
      <StatusBadge status={data.status} />
      {data.script && (
        <p className="dag-node__meta truncate max-w-[140px] text-xs text-gray-400 mt-1">
          {data.script.slice(0, 40)}...
        </p>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
