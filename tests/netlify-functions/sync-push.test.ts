// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context } from '@netlify/functions';

// Mock @netlify/blobs
vi.mock('@netlify/blobs', () => ({
  getStore: vi.fn(() => ({
    set: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
  })),
}));

import { getStore } from '@netlify/blobs';
import handler from '../../netlify/functions/sync-push.mts';

// Helper to create mock context
function mockContext(): Context {
  return {
    requestId: 'test-request-id',
  } as Context;
}

// Helper to create Request object
function makeRequest(method: string, body?: any): Request {
  const url = 'https://example.com/.netlify/functions/sync-push';
  const options: RequestInit = { method };

  if (body !== undefined) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(body);
  }

  return new Request(url, options);
}

describe('sync-push function', () => {
  let mockStore: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore = {
      set: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(getStore).mockReturnValue(mockStore);
  });

  it('returns 405 for GET request', async () => {
    const req = makeRequest('GET');
    const res = await handler(req, mockContext());

    expect(res.status).toBe(405);
    const data = await res.json();
    expect(data).toEqual({ error: 'Method not allowed' });
  });

  it('returns 405 for PUT request', async () => {
    const req = makeRequest('PUT', { deviceId: 'test', encryptedBlob: 'data' });
    const res = await handler(req, mockContext());

    expect(res.status).toBe(405);
    const data = await res.json();
    expect(data).toEqual({ error: 'Method not allowed' });
  });

  it('returns 400 when deviceId is missing', async () => {
    const req = makeRequest('POST', { encryptedBlob: 'data' });
    const res = await handler(req, mockContext());

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ error: 'Missing or invalid deviceId' });
  });

  it('returns 400 when deviceId is a number', async () => {
    const req = makeRequest('POST', { deviceId: 123, encryptedBlob: 'data' });
    const res = await handler(req, mockContext());

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ error: 'Missing or invalid deviceId' });
  });

  it('returns 400 when encryptedBlob is missing', async () => {
    const req = makeRequest('POST', { deviceId: 'test-device' });
    const res = await handler(req, mockContext());

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ error: 'Missing or invalid encryptedBlob' });
  });

  it('returns 413 when encryptedBlob exceeds 10MB', async () => {
    const largeBlob = 'x'.repeat(10 * 1024 * 1024 + 1); // 10MB + 1 byte
    const req = makeRequest('POST', {
      deviceId: 'test-device',
      encryptedBlob: largeBlob
    });
    const res = await handler(req, mockContext());

    expect(res.status).toBe(413);
    const data = await res.json();
    expect(data).toEqual({ error: 'Payload too large (max 10MB)' });
  });

  it('returns 200 with success:true for valid POST', async () => {
    const req = makeRequest('POST', {
      deviceId: 'a'.repeat(64),
      encryptedBlob: 'encrypted-data-here'
    });
    const res = await handler(req, mockContext());

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.timestamp).toBeDefined();
    expect(typeof data.timestamp).toBe('string');
  });

  it('calls store.set with correct deviceId and encryptedBlob', async () => {
    const deviceId = 'a'.repeat(64);
    const encryptedBlob = 'encrypted-data-here';

    const req = makeRequest('POST', { deviceId, encryptedBlob });
    await handler(req, mockContext());

    expect(getStore).toHaveBeenCalledWith('sync-data');
    expect(mockStore.set).toHaveBeenCalledWith(deviceId, encryptedBlob);
  });

  it('stores contentHash when provided', async () => {
    const deviceId = 'a'.repeat(64);
    const encryptedBlob = 'encrypted-data-here';
    const contentHash = 'hash123';

    const req = makeRequest('POST', { deviceId, encryptedBlob, contentHash });
    await handler(req, mockContext());

    expect(mockStore.set).toHaveBeenCalledWith(deviceId, encryptedBlob);
    expect(mockStore.set).toHaveBeenCalledWith(deviceId + '-hash', contentHash);
    expect(mockStore.set).toHaveBeenCalledTimes(2);
  });

  it('does not store contentHash when not provided', async () => {
    const deviceId = 'a'.repeat(64);
    const encryptedBlob = 'encrypted-data-here';

    const req = makeRequest('POST', { deviceId, encryptedBlob });
    await handler(req, mockContext());

    expect(mockStore.set).toHaveBeenCalledTimes(1);
    expect(mockStore.set).toHaveBeenCalledWith(deviceId, encryptedBlob);
  });

  it('returns 500 when store.set throws error', async () => {
    mockStore.set.mockRejectedValueOnce(new Error('Database error'));

    const req = makeRequest('POST', {
      deviceId: 'a'.repeat(64),
      encryptedBlob: 'encrypted-data-here'
    });
    const res = await handler(req, mockContext());

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data).toEqual({ error: 'Internal server error' });
  });
});
