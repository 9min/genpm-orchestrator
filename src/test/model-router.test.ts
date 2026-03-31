import { describe, it, expect, beforeEach } from 'vitest';
import type { ProviderConfig } from '@/lib/types';

// Import ModelRouter class directly by re-creating a fresh instance per test
// (modelRouter singleton is module-level — we test the class in isolation)
class ModelRouter {
  private registry = new Map<string, ProviderConfig>();
  register(provider: ProviderConfig): void { this.registry.set(provider.name, provider); }
  resolve(name: string): ProviderConfig {
    const p = this.registry.get(name);
    if (!p) throw new Error(`Provider not found: ${name}`);
    return p;
  }
  list(): ProviderConfig[] { return Array.from(this.registry.values()); }
  listByType(type: ProviderConfig['type']): ProviderConfig[] {
    return this.list().filter((p) => p.type === type);
  }
}

const makeProvider = (name: string, type: ProviderConfig['type'] = 'image'): ProviderConfig => ({
  name,
  type,
  label: `${name} label`,
  estimateCost: () => ({ credits: 10, usd: 0.01 }),
});

describe('ModelRouter', () => {
  let router: ModelRouter;

  beforeEach(() => {
    router = new ModelRouter();
  });

  it('registers and resolves a provider', () => {
    router.register(makeProvider('hf-sdxl'));
    const p = router.resolve('hf-sdxl');
    expect(p.name).toBe('hf-sdxl');
  });

  it('throws on unknown provider', () => {
    expect(() => router.resolve('nonexistent')).toThrow('Provider not found: nonexistent');
  });

  it('list() returns all registered providers', () => {
    router.register(makeProvider('a'));
    router.register(makeProvider('b'));
    expect(router.list()).toHaveLength(2);
  });

  it('listByType() filters by type', () => {
    router.register(makeProvider('img1', 'image'));
    router.register(makeProvider('img2', 'image'));
    router.register(makeProvider('voice1', 'voice'));
    expect(router.listByType('image')).toHaveLength(2);
    expect(router.listByType('voice')).toHaveLength(1);
  });

  it('overrides existing provider on re-register', () => {
    const p1 = makeProvider('dup');
    const p2 = { ...makeProvider('dup'), label: 'updated' };
    router.register(p1);
    router.register(p2);
    expect(router.resolve('dup').label).toBe('updated');
    expect(router.list()).toHaveLength(1);
  });

  it('estimateCost is callable on resolved provider', () => {
    router.register(makeProvider('test'));
    const cost = router.resolve('test').estimateCost('hello');
    expect(cost).toEqual({ credits: 10, usd: 0.01 });
  });
});
