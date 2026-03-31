import { NextResponse } from 'next/server';

export async function GET() {
  const hasGemini = Boolean(process.env.GOOGLE_AI_API_KEY);
  const hasHF = Boolean(process.env.HF_TOKEN);

  return NextResponse.json({
    gemini: hasGemini ? 'configured' : 'missing',
    huggingface: hasHF ? 'configured' : 'missing',
    tts: 'browser', // Web Speech API — no server key needed
    ready: hasGemini || hasHF, // app works in manual mode even without keys
  });
}
