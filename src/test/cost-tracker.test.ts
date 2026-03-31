import { describe, it, expect, beforeEach } from 'vitest';
import type { CostRecord, Cost, AssetType } from '@/lib/types';

// Test CostTracker class in isolation
class CostTracker {
  private records: CostRecord[] = [];

  record(params: {
    projectId: string;
    sceneId?: string;
    assetId?: string;
    provider: string;
    assetType: AssetType | 'decompose';
    actualCost: Cost;
    simulatedCost?: Cost;
    prompt: string;
    latencyMs: number;
  }): CostRecord {
    const simulatedCost = params.simulatedCost ?? { credits: 0, usd: 0 };
    const rec: CostRecord = {
      recordId: `cost_${Date.now()}`,
      projectId: params.projectId,
      sceneId: params.sceneId,
      assetId: params.assetId,
      provider: params.provider,
      assetType: params.assetType,
      actualCost: params.actualCost,
      simulatedCost,
      timestamp: Date.now(),
      latencyMs: params.latencyMs,
    };
    this.records.push(rec);
    return rec;
  }

  getProjectRecords(projectId: string) {
    return this.records.filter((r) => r.projectId === projectId);
  }

  getProjectTotals(projectId: string) {
    const records = this.getProjectRecords(projectId);
    return {
      actual: records.reduce((a, r) => ({ credits: a.credits + r.actualCost.credits, usd: a.usd + r.actualCost.usd }), { credits: 0, usd: 0 }),
      simulated: records.reduce((a, r) => ({ credits: a.credits + r.simulatedCost.credits, usd: a.usd + r.simulatedCost.usd }), { credits: 0, usd: 0 }),
    };
  }

  getProviderBreakdown(projectId: string): Record<string, Cost> {
    const breakdown: Record<string, Cost> = {};
    for (const r of this.getProjectRecords(projectId)) {
      if (!breakdown[r.provider]) breakdown[r.provider] = { credits: 0, usd: 0 };
      breakdown[r.provider].credits += r.simulatedCost.credits;
      breakdown[r.provider].usd += r.simulatedCost.usd;
    }
    return breakdown;
  }

  clear(projectId: string) {
    this.records = this.records.filter((r) => r.projectId !== projectId);
  }
}

describe('CostTracker', () => {
  let tracker: CostTracker;

  beforeEach(() => {
    tracker = new CostTracker();
  });

  it('records a cost entry', () => {
    const rec = tracker.record({
      projectId: 'p1',
      provider: 'hf-sdxl',
      assetType: 'image',
      actualCost: { credits: 0, usd: 0 },
      simulatedCost: { credits: 40, usd: 0.04 },
      prompt: 'test',
      latencyMs: 1000,
    });
    expect(rec.provider).toBe('hf-sdxl');
    expect(rec.simulatedCost.credits).toBe(40);
  });

  it('getProjectTotals sums simulated costs', () => {
    tracker.record({ projectId: 'p1', provider: 'a', assetType: 'image', actualCost: { credits: 0, usd: 0 }, simulatedCost: { credits: 10, usd: 0.01 }, prompt: '', latencyMs: 0 });
    tracker.record({ projectId: 'p1', provider: 'b', assetType: 'voice', actualCost: { credits: 0, usd: 0 }, simulatedCost: { credits: 20, usd: 0.02 }, prompt: '', latencyMs: 0 });
    const totals = tracker.getProjectTotals('p1');
    expect(totals.simulated.credits).toBe(30);
    expect(totals.simulated.usd).toBeCloseTo(0.03);
  });

  it('getProjectRecords filters by projectId', () => {
    tracker.record({ projectId: 'p1', provider: 'a', assetType: 'image', actualCost: { credits: 0, usd: 0 }, prompt: '', latencyMs: 0 });
    tracker.record({ projectId: 'p2', provider: 'b', assetType: 'image', actualCost: { credits: 0, usd: 0 }, prompt: '', latencyMs: 0 });
    expect(tracker.getProjectRecords('p1')).toHaveLength(1);
    expect(tracker.getProjectRecords('p2')).toHaveLength(1);
  });

  it('getProviderBreakdown groups by provider', () => {
    tracker.record({ projectId: 'p1', provider: 'hf-sdxl', assetType: 'image', actualCost: { credits: 0, usd: 0 }, simulatedCost: { credits: 40, usd: 0.04 }, prompt: '', latencyMs: 0 });
    tracker.record({ projectId: 'p1', provider: 'hf-sdxl', assetType: 'image', actualCost: { credits: 0, usd: 0 }, simulatedCost: { credits: 40, usd: 0.04 }, prompt: '', latencyMs: 0 });
    tracker.record({ projectId: 'p1', provider: 'web-speech', assetType: 'voice', actualCost: { credits: 0, usd: 0 }, simulatedCost: { credits: 5, usd: 0.005 }, prompt: '', latencyMs: 0 });
    const bd = tracker.getProviderBreakdown('p1');
    expect(bd['hf-sdxl'].credits).toBe(80);
    expect(bd['web-speech'].credits).toBe(5);
  });

  it('clear removes only the specified project', () => {
    tracker.record({ projectId: 'p1', provider: 'a', assetType: 'image', actualCost: { credits: 0, usd: 0 }, prompt: '', latencyMs: 0 });
    tracker.record({ projectId: 'p2', provider: 'b', assetType: 'image', actualCost: { credits: 0, usd: 0 }, prompt: '', latencyMs: 0 });
    tracker.clear('p1');
    expect(tracker.getProjectRecords('p1')).toHaveLength(0);
    expect(tracker.getProjectRecords('p2')).toHaveLength(1);
  });

  it('empty project returns zero totals', () => {
    const totals = tracker.getProjectTotals('none');
    expect(totals.simulated).toEqual({ credits: 0, usd: 0 });
  });
});
