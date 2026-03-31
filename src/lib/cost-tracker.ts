import type { CostRecord, Cost, AssetType } from './types';
import { modelRouter } from './model-router';

class CostTracker {
  private records: CostRecord[] = [];

  record(params: {
    projectId: string;
    sceneId?: string;
    assetId?: string;
    provider: string;
    assetType: AssetType | 'decompose';
    actualCost: Cost;
    simulatedCost?: Cost; // optional override; computed from provider if omitted
    prompt: string;
    latencyMs: number;
  }): CostRecord {
    const { projectId, sceneId, assetId, provider, assetType, actualCost, prompt, latencyMs } = params;

    // Simulate what this would cost with commercial models
    let simulatedCost: Cost;
    if (params.simulatedCost) {
      simulatedCost = params.simulatedCost;
    } else {
      try {
        const p = modelRouter.resolve(provider);
        simulatedCost = p.estimateCost(prompt);
      } catch {
        simulatedCost = { credits: 0, usd: 0 };
      }
    }

    const record: CostRecord = {
      recordId: `cost_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      projectId,
      sceneId,
      assetId,
      provider,
      assetType,
      actualCost,
      simulatedCost,
      timestamp: Date.now(),
      latencyMs,
    };

    this.records.push(record);
    return record;
  }

  getProjectRecords(projectId: string): CostRecord[] {
    return this.records.filter((r) => r.projectId === projectId);
  }

  getProjectTotals(projectId: string): { actual: Cost; simulated: Cost } {
    const records = this.getProjectRecords(projectId);
    return {
      actual: records.reduce(
        (acc, r) => ({ credits: acc.credits + r.actualCost.credits, usd: acc.usd + r.actualCost.usd }),
        { credits: 0, usd: 0 }
      ),
      simulated: records.reduce(
        (acc, r) => ({
          credits: acc.credits + r.simulatedCost.credits,
          usd: acc.usd + r.simulatedCost.usd,
        }),
        { credits: 0, usd: 0 }
      ),
    };
  }

  getProviderBreakdown(projectId: string): Record<string, Cost> {
    const records = this.getProjectRecords(projectId);
    const breakdown: Record<string, Cost> = {};
    for (const r of records) {
      if (!breakdown[r.provider]) breakdown[r.provider] = { credits: 0, usd: 0 };
      breakdown[r.provider].credits += r.simulatedCost.credits;
      breakdown[r.provider].usd += r.simulatedCost.usd;
    }
    return breakdown;
  }

  clear(projectId: string): void {
    this.records = this.records.filter((r) => r.projectId !== projectId);
  }
}

// Session-scoped singleton — resets on page reload (acceptable for demo)
export const costTracker = new CostTracker();
