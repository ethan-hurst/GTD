// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context } from '@netlify/functions';

// Mock @netlify/blobs
vi.mock('@netlify/blobs', () => ({
  getStore: vi.fn(() => ({
    get: vi.fn().mockResolvedValue(null),
  })),
}));

import { getStore } from '@netlify/blobs';
import handler from './sync-pull.mts';

// Helper to create mock context
function mockContext(): Context {
  return {
    requestId: 'test-request-id',
  } as Context;
}

// Helper to create Request object
function makeRequest(method: string, deviceId?: string): Request {
  const url = new URL('https://example.com/.netlify/functions/sync-pull');

  if (deviceId !== undefined) {
    url.searchParams.set('deviceId', deviceId);
  }

  return new Request(url.toString(), { method });
}

describe('sync-pull function', () => {
  let mockStore: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore = {
      get: vi.fn().mockResolvedValue(null),
    };
    vi.mocked(getStore).mockReturnValue(mockStore);
  });

  it('returns 405 for POST request', async () => {
    const req = makeRequest('POST', 'a'.repeat(64));
    const res = await handler(req, mockContext());

    expect(res.status).toBe(405);
    const data = await res.json();
    expect(data).toEqual({ error: 'Method not allowed' });
  });

  it('returns 400 when deviceId is missing', async () => {
    const req = makeRequest('GET');
    const res = await handler(req, mockContext());

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ error: 'Missing or invalid deviceId parameter' });
  });

  it('returns 400 when deviceId is empty string', async () => {
    const req = makeRequest('GET', '');
    const res = await handler(req, mockContext());

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ error: 'Missing or invalid deviceId parameter' });
  });

  it('returns 400 when deviceId has invalid format (too short)', async () => {
    const req = makeRequest('GET', 'a'.repeat(63));
    const res = await handler(req, mockContext());

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ error: 'Invalid deviceId format' });
  });

  it('returns 400 when deviceId has invalid format (non-hex)', async () => {
    const req = makeRequest('GET', 'z'.repeat(64));
    const res = await handler(req, mockContext());

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ error: 'Invalid deviceId format' });
  });

  it('returns 200 found:false when blob not found', async () => {
    mockStore.get.mockResolvedValueOnce(null);

    const req = makeRequest('GET', 'a'.repeat(64));
    const res = await handler(req, mockContext());

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.found).toBe(false);
    expect(data.message).toBe('No sync data found for this device');
  });

  it('returns 200 found:true with encryptedBlob when found', async () => {
    const deviceId = 'a'.repeat(64);
    const encryptedBlob = 'encrypted-data-here';
    mockStore.get.mockResolvedValueOnce(encryptedBlob);

    const req = makeRequest('GET', deviceId);
    const res = await handler(req, mockContext());

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.found).toBe(true);
    expect(data.encryptedBlob).toBe(encryptedBlob);
    expect(data.timestamp).toBeDefined();
    expect(typeof data.timestamp).toBe('string');
  });

  it('calls store.get with correct deviceId', async () => {
    const deviceId = 'a'.repeat(64);

    const req = makeRequest('GET', deviceId);
    await handler(req, mockContext());

    expect(getStore).toHaveBeenCalledWith('sync-data');
    expect(mockStore.get).toHaveBeenCalledWith(deviceId, { type: 'text' });
  });

  it('returns 500 when store.get throws error', async () => {
    mockStore.get.mockRejectedValueOnce(new Error('Database error'));

    const req = makeRequest('GET', 'a'.repeat(64));
    const res = await handler(req, mockContext());

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data).toEqual({ error: 'Internal server error' });
  });
});
