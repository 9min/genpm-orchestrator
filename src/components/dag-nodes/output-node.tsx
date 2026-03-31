'use client';

import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { OutputNodeType } from '@/lib/types';
import { StatusBadge } from '@/components/ui/status-indicator';

export function OutputNode({ data }: NodeProps<OutputNodeType>) {
  return (
    <div className={`dag-node dag-node--output dag-node--${data.status}`}>
      <Handle type="target" position={Position.Top} />

      <div className="dag-node__header">
        <span className="dag-node__icon">
          {data.status === 'complete' ? '✅' : data.status === 'failed' ? '❌' : '⏳'}
        </span>
        <span className="dag-node__label">{data.label}</span>
      </div>

      <StatusBadge status={data.status} />
    </div>
  );
}
