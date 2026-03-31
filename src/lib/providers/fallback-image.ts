import type { ProviderConfig } from '@/lib/types';
import { FALLBACK_IMAGES } from '@/lib/constants';

export const fallbackImageProvider: ProviderConfig = {
  name: 'fallback-image',
  type: 'image',
  label: 'Preset (Fallback)',
  estimateCost: (_prompt: string) => ({ credits: 0, usd: 0 }),
};

// Returns a data URL by fetching the preset fallback image and converting to base64.
// Falls back to a generated SVG placeholder if the image file isn't found.
export async function getFallbackImage(
  sceneIndex: number
): Promise<{ base64: string; mimeType: string; latencyMs: number }> {
  const start = Date.now();
  const path = FALLBACK_IMAGES[sceneIndex % FALLBACK_IMAGES.length];

  try {
    const res = await fetch(path);
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      const mimeType = res.headers.get('content-type') ?? 'image/jpeg';
      return { base64, mimeType, latencyMs: Date.now() - start };
    }
  } catch {
    // fall through to SVG placeholder
  }

  // SVG placeholder — always works, no network needed
  const colors = ['#1e3a5f', '#2d4a3e', '#3d2a4e', '#4a2a2a', '#2a3a4a'];
  const color = colors[sceneIndex % colors.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="768" height="432" viewBox="0 0 768 432">
  <rect width="768" height="432" fill="${color}"/>
  <text x="384" y="200" text-anchor="middle" fill="#ffffff88" font-size="48" font-family="sans-serif">🎬</text>
  <text x="384" y="260" text-anchor="middle" fill="#ffffff66" font-size="18" font-family="sans-serif">Scene ${sceneIndex + 1}</text>
  <text x="384" y="290" text-anchor="middle" fill="#ffffff44" font-size="12" font-family="sans-serif">Fallback Image</text>
</svg>`;
  const base64 = btoa(svg);
  return { base64, mimeType: 'image/svg+xml', latencyMs: Date.now() - start };
}
