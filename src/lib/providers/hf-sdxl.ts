import type { ProviderConfig } from '@/lib/types';
import { COMMERCIAL_PRICING } from '@/lib/constants';

export const hfSdxlProvider: ProviderConfig = {
  name: 'hf-sdxl',
  type: 'image',
  label: 'HuggingFace SDXL',
  estimateCost: (_prompt: string) => COMMERCIAL_PRICING.image.perImage,
};

export async function generateImage(
  prompt: string
): Promise<{ base64: string; mimeType: string; latencyMs: number }> {
  const res = await fetch('/api/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw Object.assign(new Error(err.error ?? `Image generation failed (${res.status})`), {
      code: err.code,
    });
  }

  const data = await res.json();
  return { base64: data.image, mimeType: data.mimeType ?? 'image/png', latencyMs: data.latencyMs };
}
