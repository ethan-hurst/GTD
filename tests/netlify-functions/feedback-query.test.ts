// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Context } from '@netlify/functions';

// Mock @netlify/blobs
vi.mock('@netlify/blobs', () => ({
  getStore: vi.fn(() => ({
    get: vi.fn().mockResolvedValue(null),
    list: vi.fn().mockResolvedValue({ blobs: [] }),
  }))
}));

import { getStore } from '@netlify/blobs';
import handler from '../../netlify/functions/feedback-query.mts';

// Helper to create mock context
function mockContext(): Context {
  return { requestId: 'test-request-id' } as Context;
}

// Auth helper
function authHeader(password: string): string {
  return 'Basic ' + btoa('admin:' + password);
}

// Helper to create Request object
function makeRequest(method: string, params?: Record<string, string>, headers?: Record<string, string>): Request {
  const url = new URL('https://example.com/.netlify/functions/feedback-query');
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return new Request(url.toString(), { method, headers: { ...headers } });
}

describe('feedback-query function', () => {
  let mockStore: any;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANALYTICS_PASSWORD = 'test-pw';
    mockStore = {
      get: vi.fn().mockResolvedValue(null),
      list: vi.fn().mockResolvedValue({ blobs: [] }),
    };
    vi.mocked(getStore).mockReturnValue(mockStore);
  });

  afterEach(() => {
    delete process.env.ANALYTICS_PASSWORD;
  });

  describe('CORS', () => {
    it('returns 204 with correct CORS headers for OPTIONS request', async () => {
      const req = makeRequest('OPTIONS');
      const res = await handler(req, mockContext());

      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(res.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS');
      expect(res.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Authorization');
    });
  });

  describe('method validation', () => {
    it('returns 405 for POST request', async () => {
      const req = new Request('https://example.com/.netlify/functions/feedback-query', {
        method: 'POST',
        headers: { Authorization: authHeader('test-pw') },
      });
      const res = await handler(req, mockContext());

      expect(res.status).toBe(405);
      const data = await res.json();
      expect(data).toEqual({ error: 'Method not allowed' });
    });
  });

  describe('auth', () => {
    it('returns 503 when ANALYTICS_PASSWORD not configured', async () => {
      delete process.env.ANALYTICS_PASSWORD;

      const req = makeRequest('GET', undefined, { Authorization: authHeader('test-pw') });
      const res = await handler(req, mockContext());

      expect(res.status).toBe(503);
      const data = await res.json();
      expect(data.error).toContain('not configured');
    });

    it('returns 401 when no Authorization header', async () => {
      const req = makeRequest('GET');
      const res = await handler(req, mockContext());

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain('Authentication');
    });

    it('returns 401 when wrong password', async () => {
      const req = makeRequest('GET', undefined, { Authorization: authHeader('wrong-pw') });
      const res = await handler(req, mockContext());

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain('Invalid');
    });

    it('returns 200 when correct password', async () => {
      const req = makeRequest('GET', undefined, { Authorization: authHeader('test-pw') });
      const res = await handler(req, mockContext());

      expect(res.status).toBe(200);
    });
  });

  describe('single item', () => {
    it('returns item when id query param matches stored item', async () => {
      const item = {
        id: 'test-id',
        type: 'bug',
        status: 'new',
        description: 'Test bug description here',
        submittedAt: '2026-02-01T10:00:00Z',
        hasScreenshot: false
      };
      mockStore.get.mockResolvedValue(item);

      const req = makeRequest('GET', { id: 'test-id' }, { Authorization: authHeader('test-pw') });
      const res = await handler(req, mockContext());

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.item).toEqual(item);
    });

    it('returns 404 when id not found', async () => {
      mockStore.get.mockResolvedValue(null);

      const req = makeRequest('GET', { id: 'nonexistent' }, { Authorization: authHeader('test-pw') });
      const res = await handler(req, mockContext());

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toContain('not found');
    });

    it('includes screenshot when screenshot=true param and item hasScreenshot', async () => {
      const item = {
        id: 'test-id',
        type: 'bug',
        status: 'new',
        description: 'Test bug description here',
        submittedAt: '2026-02-01T10:00:00Z',
        hasScreenshot: true
      };
      const screenshotData = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

      mockStore.get.mockImplementation((key: string, opts?: any) => {
        if (key === 'items/test-id') return Promise.resolve(item);
        if (key === 'screenshots/test-id') return Promise.resolve(screenshotData);
        return Promise.resolve(null);
      });

      const req = makeRequest('GET', { id: 'test-id', screenshot: 'true' }, { Authorization: authHeader('test-pw') });
      const res = await handler(req, mockContext());

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.item).toEqual(item);
      expect(data.screenshot).toBe(screenshotData);
    });
  });

  describe('list mode', () => {
    const testItems: Record<string, any> = {
      'items/id-1': { id: 'id-1', type: 'bug', status: 'new', submittedAt: '2026-02-01T10:00:00Z', description: 'Bug 1' },
      'items/id-2': { id: 'id-2', type: 'feature', status: 'reviewed', submittedAt: '2026-02-02T10:00:00Z', description: 'Feature 1' },
      'items/id-3': { id: 'id-3', type: 'bug', status: 'new', submittedAt: '2026-02-03T10:00:00Z', description: 'Bug 2' },
    };

    function setupListMocks() {
      mockStore.list.mockResolvedValue({
        blobs: [
          { key: 'items/id-1' },
          { key: 'items/id-2' },
          { key: 'items/id-3' }
        ]
      });
      mockStore.get.mockImplementation((key: string) => {
        return Promise.resolve(testItems[key] || null);
      });
    }

    it('returns all items when no filter params', async () => {
      setupListMocks();

      const req = makeRequest('GET', undefined, { Authorization: authHeader('test-pw') });
      const res = await handler(req, mockContext());

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.items).toHaveLength(3);
    });

    it('filters by status param (e.g., status=new)', async () => {
      setupListMocks();

      const req = makeRequest('GET', { status: 'new' }, { Authorization: authHeader('test-pw') });
      const res = await handler(req, mockContext());

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.items).toHaveLength(2);
      data.items.forEach((item: any) => {
        expect(item.status).toBe('new');
      });
    });

    it('filters by type param (e.g., type=bug)', async () => {
      setupListMocks();

      const req = makeRequest('GET', { type: 'bug' }, { Authorization: authHeader('test-pw') });
      const res = await handler(req, mockContext());

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.items).toHaveLength(2);
      data.items.forEach((item: any) => {
        expect(item.type).toBe('bug');
      });
    });

    it('returns items sorted by submittedAt descending (newest first)', async () => {
      setupListMocks();

      const req = makeRequest('GET', undefined, { Authorization: authHeader('test-pw') });
      const res = await handler(req, mockContext());

      const data = await res.json();
      expect(data.items[0].id).toBe('id-3'); // Feb 03
      expect(data.items[1].id).toBe('id-2'); // Feb 02
      expect(data.items[2].id).toBe('id-1'); // Feb 01
    });

    it('returns total count in response', async () => {
      setupListMocks();

      const req = makeRequest('GET', undefined, { Authorization: authHeader('test-pw') });
      const res = await handler(req, mockContext());

      const data = await res.json();
      expect(data.total).toBe(3);
    });
  });
});
