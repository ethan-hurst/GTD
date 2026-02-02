// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Context } from '@netlify/functions';

// Mock @netlify/blobs
vi.mock('@netlify/blobs', () => ({
  getStore: vi.fn(() => ({
    get: vi.fn().mockResolvedValue(null),
    setJSON: vi.fn().mockResolvedValue(undefined),
  }))
}));

import { getStore } from '@netlify/blobs';
import handler from '../../netlify/functions/feedback-update.mts';

// Helper to create mock context
function mockContext(): Context {
  return { requestId: 'test-request-id' } as Context;
}

// Auth helper
function authHeader(password: string): string {
  return 'Basic ' + btoa('admin:' + password);
}

// Helper to create Request object
function makeRequest(method: string, body?: any, headers?: Record<string, string>): Request {
  const url = 'https://example.com/.netlify/functions/feedback-update';
  const options: RequestInit = { method, headers: { ...headers } };
  if (body !== undefined) {
    options.headers = { 'Content-Type': 'application/json', ...headers };
    options.body = JSON.stringify(body);
  }
  return new Request(url, options);
}

describe('feedback-update function', () => {
  let mockStore: any;

  const existingItem = {
    id: 'test-id',
    type: 'bug',
    status: 'new',
    description: 'Test bug description here',
    submittedAt: '2026-02-01T10:00:00Z',
    hasScreenshot: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANALYTICS_PASSWORD = 'test-pw';
    mockStore = {
      get: vi.fn().mockResolvedValue(null),
      setJSON: vi.fn().mockResolvedValue(undefined),
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
      expect(res.headers.get('Access-Control-Allow-Methods')).toBe('PATCH, OPTIONS');
      expect(res.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Authorization');
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

    it('returns 405 for POST request', async () => {
      const req = makeRequest('POST', {
        id: 'test-id',
        status: 'reviewed'
      }, { Authorization: authHeader('test-pw') });
      const res = await handler(req, mockContext());

      expect(res.status).toBe(405);
      const data = await res.json();
      expect(data).toEqual({ error: 'Method not allowed' });
    });
  });

  describe('auth', () => {
    it('returns 503 when ANALYTICS_PASSWORD not configured', async () => {
      delete process.env.ANALYTICS_PASSWORD;

      const req = makeRequest('PATCH', {
        id: 'test-id',
        status: 'reviewed'
      }, { Authorization: authHeader('test-pw') });
      const res = await handler(req, mockContext());

      expect(res.status).toBe(503);
      const data = await res.json();
      expect(data.error).toContain('not configured');
    });

    it('returns 401 when no Authorization header', async () => {
      const req = makeRequest('PATCH', {
        id: 'test-id',
        status: 'reviewed'
      });
      const res = await handler(req, mockContext());

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain('Authentication');
    });

    it('returns 401 when wrong password', async () => {
      const req = makeRequest('PATCH', {
        id: 'test-id',
        status: 'reviewed'
      }, { Authorization: authHeader('wrong-pw') });
      const res = await handler(req, mockContext());

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain('Invalid');
    });
  });

  describe('validation', () => {
    it('returns 400 when status is missing', async () => {
      const req = makeRequest('PATCH', {
        id: 'test-id'
      }, { Authorization: authHeader('test-pw') });
      const res = await handler(req, mockContext());

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('status');
    });

    it('returns 400 when status is invalid (not in allowed values)', async () => {
      const req = makeRequest('PATCH', {
        id: 'test-id',
        status: 'deleted'
      }, { Authorization: authHeader('test-pw') });
      const res = await handler(req, mockContext());

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('status');
    });
  });

  describe('updating', () => {
    it('returns 404 when item id not found', async () => {
      mockStore.get.mockResolvedValue(null);

      const req = makeRequest('PATCH', {
        id: 'nonexistent',
        status: 'reviewed'
      }, { Authorization: authHeader('test-pw') });
      const res = await handler(req, mockContext());

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toContain('not found');
    });

    it('returns 200 with updated item for valid status change', async () => {
      mockStore.get.mockResolvedValue({ ...existingItem });

      const req = makeRequest('PATCH', {
        id: 'test-id',
        status: 'reviewed'
      }, { Authorization: authHeader('test-pw') });
      const res = await handler(req, mockContext());

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.item).toBeDefined();
      expect(data.item.status).toBe('reviewed');
    });

    it('updates status field on stored item', async () => {
      mockStore.get.mockResolvedValue({ ...existingItem });

      const req = makeRequest('PATCH', {
        id: 'test-id',
        status: 'resolved'
      }, { Authorization: authHeader('test-pw') });
      await handler(req, mockContext());

      const savedItem = mockStore.setJSON.mock.calls[0][1];
      expect(savedItem.status).toBe('resolved');
    });

    it('adds reviewedAt timestamp', async () => {
      mockStore.get.mockResolvedValue({ ...existingItem });

      const req = makeRequest('PATCH', {
        id: 'test-id',
        status: 'reviewed'
      }, { Authorization: authHeader('test-pw') });
      await handler(req, mockContext());

      const savedItem = mockStore.setJSON.mock.calls[0][1];
      expect(savedItem.reviewedAt).toBeDefined();
      // Verify it's a valid ISO timestamp
      expect(new Date(savedItem.reviewedAt).toISOString()).toBe(savedItem.reviewedAt);
    });

    it('preserves notes when not provided in update', async () => {
      const itemWithNotes = { ...existingItem, notes: 'Previous admin notes' };
      mockStore.get.mockResolvedValue(itemWithNotes);

      const req = makeRequest('PATCH', {
        id: 'test-id',
        status: 'reviewed'
      }, { Authorization: authHeader('test-pw') });
      await handler(req, mockContext());

      const savedItem = mockStore.setJSON.mock.calls[0][1];
      expect(savedItem.notes).toBe('Previous admin notes');
    });

    it('updates notes when provided in update', async () => {
      const itemWithNotes = { ...existingItem, notes: 'Old notes' };
      mockStore.get.mockResolvedValue(itemWithNotes);

      const req = makeRequest('PATCH', {
        id: 'test-id',
        status: 'reviewed',
        notes: 'New admin notes'
      }, { Authorization: authHeader('test-pw') });
      await handler(req, mockContext());

      const savedItem = mockStore.setJSON.mock.calls[0][1];
      expect(savedItem.notes).toBe('New admin notes');
    });

    it('calls store.setJSON with updated metadata', async () => {
      mockStore.get.mockResolvedValue({ ...existingItem });

      const req = makeRequest('PATCH', {
        id: 'test-id',
        status: 'resolved'
      }, { Authorization: authHeader('test-pw') });
      await handler(req, mockContext());

      expect(getStore).toHaveBeenCalledWith('feedback');
      expect(mockStore.setJSON).toHaveBeenCalledWith(
        'items/test-id',
        expect.objectContaining({ status: 'resolved' }),
        expect.objectContaining({
          metadata: expect.objectContaining({
            type: 'bug',
            status: 'resolved',
            hasScreenshot: 'false',
            submittedAt: '2026-02-01T10:00:00Z'
          })
        })
      );
    });
  });
});
