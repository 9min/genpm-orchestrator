import type { ProviderConfig } from '@/lib/types';
import { COMMERCIAL_PRICING } from '@/lib/constants';

export const geminiFlashProvider: ProviderConfig = {
  name: 'gemini-flash',
  type: 'decompose',
  label: 'Gemini Flash (Google AI Studio)',
  estimateCost: (prompt: string) => {
    // Rough estimate: ~100 tokens input + 300 tokens output per scene decompose
    const estimatedTokens = Math.ceil((prompt.length / 4) + 300);
    const thousands = estimatedTokens / 1000;
    return {
      credits: Math.ceil(thousands * COMMERCIAL_PRICING.decompose.perThousandTokens.credits),
      usd: thousands * COMMERCIAL_PRICING.decompose.perThousandTokens.usd,
    };
  },
};

export async function decomposeScript(
  script: string
): Promise<{ scenes: Array<{ description: string; imagePrompt: string; voiceScript: string }>; latencyMs: number }> {
  const res = await fetch('/api/scenes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ script }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    const code = err.code as string | undefined;
    throw Object.assign(new Error(err.error ?? `Scene decompose failed (${res.status})`), { code });
  }

  return res.json();
}
