'use client';

import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { AssetNodeType } from '@/lib/types';
import { StatusBadge } from '@/components/ui/status-indicator';
import { PROVIDER_LABELS } from '@/lib/constants';

export function AssetNode({ data }: NodeProps<AssetNodeType>) {
  const icon = data.assetType === 'image' ? '🖼️' : '🔊';
  const providerLabel = data.provider ? (PROVIDER_LABELS[data.provider] ?? data.provider) : null;

  return (
    <div className={`dag-node dag-node--asset dag-node--${data.status}`}>
      <Handle type="target" position={Position.Top} />

      <div className="dag-node__header">
        <span className="dag-node__icon">{icon}</span>
        <span className="dag-node__label">{data.label}</span>
      </div>

      <StatusBadge status={data.status} />

      {providerLabel && (
        <p className="dag-node__provider text-xs text-gray-500 mt-0.5">{providerLabel}</p>
      )}

      {data.cost && data.status === 'complete' && (
        <div className="dag-node__cost">
          <span className="cost-pill">${(data.cost as { usd: number }).usd.toFixed(2)}</span>
          {data.latencyMs && (
            <span className="latency-pill">{((data.latencyMs as number) / 1000).toFixed(1)}s</span>
          )}
        </div>
      )}

      {data.status === 'failed' && data.error && (
        <p className="text-xs text-red-400 mt-1 max-w-[140px] truncate" title={data.error as string}>
          {data.error as string}
        </p>
      )}

      {data.status === 'failed' && (
        <button
          className="retry-btn mt-1 text-xs text-orange-400 hover:text-orange-300 underline"
          onClick={() => {
            window.dispatchEvent(
              new CustomEvent('dag:retry', {
                detail: { assetId: data.assetId, sceneIndex: data.sceneIndex, assetType: data.assetType },
              })
            );
          }}
        >
          ↺ retry
        </button>
      )}

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
