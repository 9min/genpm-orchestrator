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

// Speak text and return a Blob of the audio.
// Web Speech API doesn't provide audio output directly, so we record it
// via MediaRecorder. If recording isn't available, we fall back to
// just speaking (no blob — voice plays but can't be replayed).
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

    // Try to record via MediaRecorder
    if (
      typeof MediaRecorder !== 'undefined' &&
      typeof AudioContext !== 'undefined'
    ) {
      try {
        const audioCtx = new AudioContext();
        const dest = audioCtx.createMediaStreamDestination();
        const recorder = new MediaRecorder(dest.stream);
        const chunks: BlobPart[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          audioCtx.close();
          resolve({ blob, latencyMs: Date.now() - start });
        };

        utterance.onend = () => recorder.stop();
        utterance.onerror = () => {
          recorder.stop();
        };

        recorder.start();
        window.speechSynthesis.speak(utterance);
        return;
      } catch {
        // Fall through to simple speak
      }
    }

    // Simple speak — no recording
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
