import type { ProviderConfig } from '@/lib/types';
import { COMMERCIAL_PRICING } from '@/lib/constants';

export const webSpeechProvider: ProviderConfig = {
  name: 'web-speech',
  type: 'voice',
  label: 'Web Speech API',
  estimateCost: (prompt: string) => {
    const chars = prompt.length;
    const thousands = chars / 1000;
    return {
      credits: Math.ceil(thousands * COMMERCIAL_PRICING.voice.perThousandChars.credits),
      usd: thousands * COMMERCIAL_PRICING.voice.perThousandChars.usd,
    };
  },
};

export function isWebSpeechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

// Speak text aloud. Web Speech API audio bypasses AudioContext and cannot
// be captured by MediaRecorder, so we only speak and wait for completion.
export async function speakAndRecord(
  text: string,
  lang = 'en-US'
): Promise<{ blob: Blob | null; latencyMs: number }> {
  const start = Date.now();

  return new Promise((resolve) => {
    if (!isWebSpeechAvailable()) {
      resolve({ blob: null, latencyMs: 0 });
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    utterance.onend = () => resolve({ blob: null, latencyMs: Date.now() - start });
    utterance.onerror = () => resolve({ blob: null, latencyMs: Date.now() - start });
    window.speechSynthesis.speak(utterance);
  });
}

// Just speak without recording (for playback)
export function speak(text: string, lang = 'en-US'): void {
  if (!isWebSpeechAvailable()) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}
