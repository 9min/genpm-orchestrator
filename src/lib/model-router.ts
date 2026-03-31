import type { ProviderConfig } from './types';
import { geminiFlashProvider } from './providers/gemini-flash';
import { hfSdxlProvider } from './providers/hf-sdxl';
import { fallbackImageProvider } from './providers/fallback-image';
import { webSpeechProvider } from './providers/web-speech';

class ModelRouter {
  private registry = new Map<string, ProviderConfig>();

  register(provider: ProviderConfig): void {
    this.registry.set(provider.name, provider);
  }

  resolve(name: string): ProviderConfig {
    const p = this.registry.get(name);
    if (!p) throw new Error(`Provider not found: ${name}`);
    return p;
  }

  list(): ProviderConfig[] {
    return Array.from(this.registry.values());
  }

  listByType(type: ProviderConfig['type']): ProviderConfig[] {
    return this.list().filter((p) => p.type === type);
  }
}

// Singleton router — register all known providers
export const modelRouter = new ModelRouter();
modelRouter.register(geminiFlashProvider);
modelRouter.register(hfSdxlProvider);
modelRouter.register(fallbackImageProvider);
modelRouter.register(webSpeechProvider);
