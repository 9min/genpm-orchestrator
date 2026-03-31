import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// generateContent is shared across tests via module-level reference
const generateContent = vi.fn();

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return { generateContent };
    }
  },
}));

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/scenes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// Import route once (mock is set up above)
const { POST } = await import('@/app/api/scenes/route');

describe('/api/scenes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_AI_API_KEY = 'test-key';
  });

  it('empty script → 400', async () => {
    const res = await POST(makeRequest({ script: '   ' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/required/i);
  });

  it('invalid JSON body → 400', async () => {
    const req = new NextRequest('http://localhost/api/scenes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('no API key → 503 with NO_API_KEY', async () => {
    const saved = process.env.GOOGLE_AI_API_KEY;
    delete process.env.GOOGLE_AI_API_KEY;
    const res = await POST(makeRequest({ script: 'test script' }));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.code).toBe('NO_API_KEY');
    process.env.GOOGLE_AI_API_KEY = saved;
  });

  it('valid script + Gemini returns scenes → 200', async () => {
    const scenes = [
      { description: 'Scene 1', imagePrompt: 'img1', voiceScript: 'voice1' },
      { description: 'Scene 2', imagePrompt: 'img2', voiceScript: 'voice2' },
      { description: 'Scene 3', imagePrompt: 'img3', voiceScript: 'voice3' },
    ];
    generateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify(scenes) },
    });

    const res = await POST(makeRequest({ script: 'A test script with content' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.scenes)).toBe(true);
    expect(body.scenes).toHaveLength(3);
  });

  it('Gemini returns non-JSON → 502', async () => {
    generateContent.mockResolvedValueOnce({
      response: { text: () => 'Not JSON at all' },
    });
    const res = await POST(makeRequest({ script: 'test script' }));
    expect(res.status).toBe(502);
  });

  it('Gemini throws → 500', async () => {
    generateContent.mockRejectedValueOnce(new Error('API error'));
    const res = await POST(makeRequest({ script: 'test script' }));
    expect(res.status).toBe(500);
  });
});
