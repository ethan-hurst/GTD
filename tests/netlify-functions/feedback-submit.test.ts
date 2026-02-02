// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context } from '@netlify/functions';

// Mock @netlify/blobs
vi.mock('@netlify/blobs', () => ({
  getStore: vi.fn(() => ({
    setJSON: vi.fn().mockResolvedValue(undefined),
    set: vi.fn().mockResolvedValue(undefined),
  }))
}));

import { getStore } from '@netlify/blobs';
import handler from '../../netlify/functions/feedback-submit.mts';

// Helper to create mock context
function mockContext(): Context {
  return { requestId: 'test-request-id' } as Context;
}

// Helper to create Request object
function makeRequest(method: string, body?: any, headers?: Record<string, string>): Request {
  const url = 'https://example.com/.netlify/functions/feedback-submit';
  const options: RequestInit = { method, headers: { ...headers } };
  if (body !== undefined) {
    options.headers = { 'Content-Type': 'application/json', ...headers };
    options.body = JSON.stringify(body);
  }
  return new Request(url, options);
}

describe('feedback-submit function', () => {
  let mockStore: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore = {
      setJSON: vi.fn().mockResolvedValue(undefined),
      set: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(getStore).mockReturnValue(mockStore);
  });

  describe('CORS', () => {
    it('returns 204 with correct CORS headers for OPTIONS request', async () => {
      const req = makeRequest('OPTIONS');
      const res = await handler(req, mockContext());

      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(res.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
      expect(res.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
    });
  });

  describe('method validation', () => {
    it('returns 405 for GET request', async () => {
      const req = makeRequest('GET');
      const res = await handler(req, mockContext());

      expect(res.status).toBe(405);
      const data = await res.json();
      expect(data).toEqual({ error: 'Method not allowed' });
    });

    it('returns 405 for PUT request', async () => {
      const req = makeRequest('PUT', { type: 'bug', description: 'A valid description' });
      const res = await handler(req, mockContext());

      expect(res.status).toBe(405);
      const data = await res.json();
      expect(data).toEqual({ error: 'Method not allowed' });
    });
  });

  describe('input validation', () => {
    it('returns 400 when type is missing', async () => {
      const req = makeRequest('POST', { description: 'A valid description here' });
      const res = await handler(req, mockContext());

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('type');
    });

    it('returns 400 when type is invalid (not bug or feature)', async () => {
      const req = makeRequest('POST', { type: 'suggestion', description: 'A valid description here' });
      const res = await handler(req, mockContext());

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('type');
    });

    it('returns 400 when description is missing', async () => {
      const req = makeRequest('POST', { type: 'bug' });
      const res = await handler(req, mockContext());

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Description');
    });

    it('returns 400 when description is too short (< 10 chars)', async () => {
      const req = makeRequest('POST', { type: 'bug', description: 'Short' });
      const res = await handler(req, mockContext());

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('10 characters');
    });

    it('returns 400 when description is not a string', async () => {
      const req = makeRequest('POST', { type: 'bug', description: 12345678901 });
      const res = await handler(req, mockContext());

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Description');
    });
  });

  describe('honeypot', () => {
    it('returns 200 success when botField is filled (honeypot triggered)', async () => {
      const req = makeRequest('POST', {
        type: 'bug',
        description: 'A valid description here',
        botField: 'I am a bot'
      });
      const res = await handler(req, mockContext());

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    it('does NOT call store.setJSON when botField is filled (silently discards)', async () => {
      const req = makeRequest('POST', {
        type: 'bug',
        description: 'A valid description here',
        botField: 'I am a bot'
      });
      await handler(req, mockContext());

      expect(mockStore.setJSON).not.toHaveBeenCalled();
    });
  });

  describe('valid submission', () => {
    it('returns 200 with success:true and id for valid bug report', async () => {
      const req = makeRequest('POST', {
        type: 'bug',
        description: 'The button does not work correctly'
      });
      const res = await handler(req, mockContext());

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.id).toBeDefined();
      expect(typeof data.id).toBe('string');
    });

    it('returns 200 with success:true and id for valid feature request', async () => {
      const req = makeRequest('POST', {
        type: 'feature',
        description: 'Please add dark mode support'
      });
      const res = await handler(req, mockContext());

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.id).toBeDefined();
    });

    it('calls store.setJSON with correct key pattern (items/{id})', async () => {
      const req = makeRequest('POST', {
        type: 'bug',
        description: 'The button does not work correctly'
      });
      const res = await handler(req, mockContext());
      const data = await res.json();

      expect(getStore).toHaveBeenCalledWith('feedback');
      expect(mockStore.setJSON).toHaveBeenCalledWith(
        `items/${data.id}`,
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('stores correct metadata (type, status: new, submittedAt)', async () => {
      const req = makeRequest('POST', {
        type: 'bug',
        description: 'The button does not work correctly'
      });
      await handler(req, mockContext());

      const callArgs = mockStore.setJSON.mock.calls[0];
      const storedItem = callArgs[1];
      const options = callArgs[2];

      expect(storedItem.type).toBe('bug');
      expect(storedItem.status).toBe('new');
      expect(storedItem.submittedAt).toBeDefined();

      // Check metadata options
      expect(options.metadata.type).toBe('bug');
      expect(options.metadata.status).toBe('new');
      expect(options.metadata.submittedAt).toBeDefined();
    });

    it('includes userAgent from request headers', async () => {
      const req = makeRequest('POST', {
        type: 'bug',
        description: 'The button does not work correctly'
      }, { 'User-Agent': 'Mozilla/5.0 TestBrowser' });
      await handler(req, mockContext());

      const storedItem = mockStore.setJSON.mock.calls[0][1];
      expect(storedItem.userAgent).toBe('Mozilla/5.0 TestBrowser');
    });

    it('stores email when provided', async () => {
      const req = makeRequest('POST', {
        type: 'bug',
        description: 'The button does not work correctly',
        email: 'user@example.com'
      });
      await handler(req, mockContext());

      const storedItem = mockStore.setJSON.mock.calls[0][1];
      expect(storedItem.email).toBe('user@example.com');
    });

    it('omits email when not provided (undefined)', async () => {
      const req = makeRequest('POST', {
        type: 'bug',
        description: 'The button does not work correctly'
      });
      await handler(req, mockContext());

      const storedItem = mockStore.setJSON.mock.calls[0][1];
      expect(storedItem.email).toBeUndefined();
    });
  });

  describe('screenshots', () => {
    it('stores screenshot as separate blob at screenshots/{id} when provided', async () => {
      const screenshotData = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
      const req = makeRequest('POST', {
        type: 'bug',
        description: 'The button does not work correctly',
        screenshot: screenshotData
      });
      const res = await handler(req, mockContext());
      const data = await res.json();

      expect(mockStore.set).toHaveBeenCalledWith(
        `screenshots/${data.id}`,
        screenshotData
      );
    });

    it('does not store screenshot blob when not provided', async () => {
      const req = makeRequest('POST', {
        type: 'bug',
        description: 'The button does not work correctly'
      });
      await handler(req, mockContext());

      expect(mockStore.set).not.toHaveBeenCalled();
    });

    it('sets hasScreenshot metadata to true when screenshot provided', async () => {
      const req = makeRequest('POST', {
        type: 'bug',
        description: 'The button does not work correctly',
        screenshot: 'data:image/jpeg;base64,/9j/4AAQ'
      });
      await handler(req, mockContext());

      const storedItem = mockStore.setJSON.mock.calls[0][1];
      const options = mockStore.setJSON.mock.calls[0][2];
      expect(storedItem.hasScreenshot).toBe(true);
      expect(options.metadata.hasScreenshot).toBe('true');
    });

    it('sets hasScreenshot metadata to false when screenshot not provided', async () => {
      const req = makeRequest('POST', {
        type: 'bug',
        description: 'The button does not work correctly'
      });
      await handler(req, mockContext());

      const storedItem = mockStore.setJSON.mock.calls[0][1];
      const options = mockStore.setJSON.mock.calls[0][2];
      expect(storedItem.hasScreenshot).toBe(false);
      expect(options.metadata.hasScreenshot).toBe('false');
    });
  });

  describe('error handling', () => {
    it('returns 500 when store.setJSON throws error', async () => {
      mockStore.setJSON.mockRejectedValueOnce(new Error('Storage error'));

      const req = makeRequest('POST', {
        type: 'bug',
        description: 'The button does not work correctly'
      });
      const res = await handler(req, mockContext());

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toEqual({ error: 'Internal server error' });
    });

    it('all responses include Access-Control-Allow-Origin: * header', async () => {
      // Test 405 response
      const getRes = await handler(makeRequest('GET'), mockContext());
      expect(getRes.headers.get('Access-Control-Allow-Origin')).toBe('*');

      // Test 400 response
      const badRes = await handler(makeRequest('POST', { type: 'invalid' }), mockContext());
      expect(badRes.headers.get('Access-Control-Allow-Origin')).toBe('*');

      // Test 200 response
      const okRes = await handler(
        makeRequest('POST', { type: 'bug', description: 'A valid description here' }),
        mockContext()
      );
      expect(okRes.headers.get('Access-Control-Allow-Origin')).toBe('*');

      // Test 500 response
      mockStore.setJSON.mockRejectedValueOnce(new Error('fail'));
      const errRes = await handler(
        makeRequest('POST', { type: 'bug', description: 'A valid description here' }),
        mockContext()
      );
      expect(errRes.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });
});
