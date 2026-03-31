import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock global fetch for HF API calls
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeImageResponse(ok: boolean, status: number, body: unknown) {
  return {
    ok,
    status,
    arrayBuffer: async () => {
      if (ok && body instanceof Uint8Array) return body.buffer;
      return new ArrayBuffer(0);
    },
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
    json: async () => body,
  };
}

describe('/api/image', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.HF_TOKEN = 'test-hf-token';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('empty prompt → 400', async () => {
    const { POST } = await import('@/app/api/image/route');
    const res = await POST(makeRequest({ prompt: '' }));
    expect(res.status).toBe(400);
  });

  it('no HF_TOKEN → 503 with NO_API_KEY', async () => {
    delete process.env.HF_TOKEN;
    const { POST } = await import('@/app/api/image/route');
    const res = await POST(makeRequest({ prompt: 'test' }));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.code).toBe('NO_API_KEY');
  });

  it('valid prompt + HF success → 200 with base64 image', async () => {
    const fakeImageBytes = new Uint8Array([137, 80, 78, 71]); // PNG header bytes
    mockFetch.mockResolvedValueOnce(makeImageResponse(true, 200, fakeImageBytes));

    const { POST } = await import('@/app/api/image/route');
    const res = await POST(makeRequest({ prompt: 'cinematic shot' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.image).toBe('string');
    expect(body.mimeType).toBe('image/png');
    expect(typeof body.latencyMs).toBe('number');
  });

  it('HF rate limit 429 → 429 response', async () => {
    mockFetch.mockResolvedValueOnce(makeImageResponse(false, 429, 'rate limited'));

    const { POST } = await import('@/app/api/image/route');
    const res = await POST(makeRequest({ prompt: 'test' }));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.code).toBe('RATE_LIMIT');
  });

  it('HF model loading 503 → 503 with MODEL_LOADING', async () => {
    mockFetch.mockResolvedValueOnce(makeImageResponse(false, 503, 'loading'));

    const { POST } = await import('@/app/api/image/route');
    const res = await POST(makeRequest({ prompt: 'test' }));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.code).toBe('MODEL_LOADING');
  });

  it('HF other error → 502', async () => {
    mockFetch.mockResolvedValueOnce(makeImageResponse(false, 500, 'server error'));

    const { POST } = await import('@/app/api/image/route');
    const res = await POST(makeRequest({ prompt: 'test' }));
    expect(res.status).toBe(502);
  });

  it('fetch throws (network error) → 500', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network failure'));

    const { POST } = await import('@/app/api/image/route');
    const res = await POST(makeRequest({ prompt: 'test' }));
    expect(res.status).toBe(500);
  });

  it('invalid JSON body → 400', async () => {
    const { POST } = await import('@/app/api/image/route');
    const req = new NextRequest('http://localhost/api/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
