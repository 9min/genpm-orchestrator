import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MIN_SCENES, MAX_SCENES, SCENE_DECOMPOSE_PROMPT_TEMPLATE } from '@/lib/constants';

export async function POST(req: NextRequest) {
  let body: { script?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { script } = body;
  if (!script || script.trim().length === 0) {
    return NextResponse.json({ error: 'script is required' }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GOOGLE_AI_API_KEY not configured', code: 'NO_API_KEY' },
      { status: 503 }
    );
  }

  const prompt = SCENE_DECOMPOSE_PROMPT_TEMPLATE
    .replace('{script}', script.trim())
    .replace('{minScenes}', String(MIN_SCENES))
    .replace('{maxScenes}', String(MAX_SCENES));

  try {
    const genai = new GoogleGenerativeAI(apiKey);
    const model = genai.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const start = Date.now();
    const result = await model.generateContent(prompt);
    const latencyMs = Date.now() - start;

    const text = result.response.text().trim();

    // Strip markdown code fences if present
    const jsonText = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

    let scenes: { description: string; imagePrompt: string; voiceScript: string }[];
    try {
      scenes = JSON.parse(jsonText);
    } catch {
      return NextResponse.json(
        { error: 'Gemini returned non-JSON response', raw: text.slice(0, 200) },
        { status: 502 }
      );
    }

    if (!Array.isArray(scenes) || scenes.length === 0) {
      return NextResponse.json({ error: 'Gemini returned empty scenes array' }, { status: 502 });
    }

    return NextResponse.json({ scenes, latencyMs });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Surface quota/auth errors distinctly so client can fallback gracefully
    if (msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
      return NextResponse.json(
        { error: 'Gemini quota exceeded', code: 'QUOTA_EXCEEDED' },
        { status: 429 }
      );
    }
    if (msg.includes('API_KEY_INVALID') || msg.includes('401')) {
      return NextResponse.json(
        { error: 'Invalid Gemini API key', code: 'INVALID_KEY' },
        { status: 401 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
