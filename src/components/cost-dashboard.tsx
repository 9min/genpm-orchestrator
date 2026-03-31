'use client';

import type { Project } from '@/lib/types';
import { costTracker } from '@/lib/cost-tracker';
import { PROVIDER_LABELS } from '@/lib/constants';

interface CostDashboardProps {
  project: Project;
}

export function CostDashboard({ project }: CostDashboardProps) {
  const totals = costTracker.getProjectTotals(project.id);
  const breakdown = costTracker.getProviderBreakdown(project.id);
  const storeTotal = project.pipeline.totalCost;

  // Use whichever is larger between runtime tracker and persisted store
  const displayUsd = Math.max(totals.simulated.usd, storeTotal.usd);

  if (displayUsd === 0 && project.scenes.length === 0) return null;

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-gray-900 border-t border-gray-800 text-xs">
      <span className="text-gray-500 font-medium">Simulated Cost</span>

      {/* Total */}
      <span className="text-emerald-400 font-semibold">
        ~${displayUsd.toFixed(3)}
      </span>

      {/* Provider breakdown */}
      {Object.keys(breakdown).length > 0 && (
        <>
          <span className="text-gray-700">|</span>
          {Object.entries(breakdown).map(([provider, cost]) => (
            <span key={provider} className="text-gray-500">
              {PROVIDER_LABELS[provider] ?? provider}: ${cost.usd.toFixed(3)}
            </span>
          ))}
        </>
      )}

      <span className="ml-auto text-gray-600">
        vs commercial models · $0 actual (free tier)
      </span>
    </div>
  );
}
