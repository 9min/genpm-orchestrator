'use client';

import type { DAGNodeStatus } from '@/lib/types';

const STATUS_CONFIG: Record<DAGNodeStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'status-badge--pending' },
  generating: { label: 'Generating...', className: 'status-badge--generating' },
  complete: { label: 'Done', className: 'status-badge--complete' },
  failed: { label: 'Failed', className: 'status-badge--failed' },
  skipped: { label: 'Skipped', className: 'status-badge--skipped' },
};

export function StatusBadge({ status }: { status: DAGNodeStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={`status-badge ${config.className}`}>
      {status === 'generating' && (
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse mr-1" />
      )}
      {config.label}
    </span>
  );
}

export function StatusDot({ status }: { status: DAGNodeStatus }) {
  const colors: Record<DAGNodeStatus, string> = {
    pending: 'bg-gray-500',
    generating: 'bg-yellow-400 animate-pulse',
    complete: 'bg-green-400',
    failed: 'bg-red-500',
    skipped: 'bg-gray-400',
  };
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${colors[status]}`}
      title={status}
    />
  );
}
