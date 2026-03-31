import { NextRequest, NextResponse } from 'next/server';

const HF_MODEL = 'stabilityai/stable-diffusion-xl-base-1.0';
const HF_API_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`;
const TIMEOUT_MS = 45_000;

export async function POST(req: NextRequest) {
  let body: { prompt?: string; negativePrompt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { prompt, negativePrompt } = body;
  if (!prompt || prompt.trim().length === 0) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
  }

  const hfToken = process.env.HF_TOKEN;
  if (!hfToken) {
    return NextResponse.json(
      { error: 'HF_TOKEN not configured', code: 'NO_API_KEY' },
      { status: 503 }
    );
  }

  try {
    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const hfResponse = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt.trim(),
        parameters: {
          negative_prompt: negativePrompt ?? 'blurry, low quality, distorted, watermark',
          num_inference_steps: 20,
          guidance_scale: 7.5,
          width: 768,
          height: 432,
        },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const latencyMs = Date.now() - start;

    if (!hfResponse.ok) {
      const errText = await hfResponse.text();
      if (hfResponse.status === 503 || errText.includes('loading')) {
        return NextResponse.json(
          { error: 'Model loading, retry in 20s', code: 'MODEL_LOADING' },
          { status: 503 }
        );
      }
      if (hfResponse.status === 429) {
        return NextResponse.json(
          { error: 'HuggingFace rate limit exceeded', code: 'RATE_LIMIT' },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: `HuggingFace error: ${hfResponse.status}`, detail: errText.slice(0, 200) },
        { status: 502 }
      );
    }

    const imageBuffer = await hfResponse.arrayBuffer();
    const base64 = Buffer.from(imageBuffer).toString('base64');

    return NextResponse.json({ image: base64, mimeType: 'image/png', latencyMs });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json(
        { error: `HuggingFace timeout after ${TIMEOUT_MS / 1000}s`, code: 'TIMEOUT' },
        { status: 504 }
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
