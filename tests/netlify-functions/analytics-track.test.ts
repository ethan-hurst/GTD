// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context } from '@netlify/functions';

// Mock @netlify/blobs (used by handler directly)
vi.mock('@netlify/blobs', () => ({
  getStore: vi.fn(() => ({
    set: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
  })),
}));

// Mock analytics-utils (handler imports generateVisitorId, getDailyAggregate, updateDailyAggregate)
vi.mock('../../netlify/functions/analytics-utils', () => ({
  generateVisitorId: vi.fn().mockResolvedValue('mock-visitor-hash-abc123'),
  getDailyAggregate: vi.fn().mockResolvedValue({
    date: '2026-02-02',
    pageviews: {},
    events: {},
    visitors: [],
    uniqueVisitors: 0,
    referrers: {},
  }),
  updateDailyAggregate: vi.fn().mockResolvedValue(undefined),
}));

import { getStore } from '@netlify/blobs';
import { generateVisitorId, getDailyAggregate, updateDailyAggregate } from '../../netlify/functions/analytics-utils';
import handler from '../../netlify/functions/analytics-track.mts';

// Helper to create mock context
function mockContext(): Context {
  return {
    requestId: 'test-request-id',
  } as Context;
}

// Helper to create Request object
function makeRequest(
  method: string,
  url?: string,
  body?: any,
  headers?: Record<string, string>
): Request {
  const reqUrl = url || 'https://example.com/.netlify/functions/analytics-track';
  const options: RequestInit = { method, headers: { ...headers } };
  if (body !== undefined) {
    options.headers = { 'Content-Type': 'application/json', ...headers };
    options.body = JSON.stringify(body);
  }
  return new Request(reqUrl, options);
}

describe('analytics-track function', () => {
  let mockStore: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore = {
      set: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(null),
    };
    vi.mocked(getStore).mockReturnValue(mockStore);

    // Reset analytics-utils mocks to defaults
    vi.mocked(generateVisitorId).mockResolvedValue('mock-visitor-hash-abc123');
    vi.mocked(getDailyAggregate).mockResolvedValue({
      date: '2026-02-02',
      pageviews: {},
      events: {},
      visitors: [],
      uniqueVisitors: 0,
      referrers: {},
    });
    vi.mocked(updateDailyAggregate).mockResolvedValue(undefined);
  });

  it('returns 405 for GET request', async () => {
    const req = makeRequest('GET');
    const res = await handler(req, mockContext());

    expect(res.status).toBe(405);
    const data = await res.json();
    expect(data).toEqual({ error: 'Method not allowed' });
  });

  it('returns 405 for PUT request', async () => {
    const req = makeRequest('PUT');
    const res = await handler(req, mockContext());

    expect(res.status).toBe(405);
    const data = await res.json();
    expect(data).toEqual({ error: 'Method not allowed' });
  });

  it('returns 200 with tracked:false when DNT header is 1', async () => {
    const req = makeRequest('POST', undefined, { event: 'pageview', url: '/test' }, { dnt: '1' });
    const res = await handler(req, mockContext());

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ tracked: false });
    // Should not call any storage functions
    expect(generateVisitorId).not.toHaveBeenCalled();
    expect(getDailyAggregate).not.toHaveBeenCalled();
  });

  it('returns 400 when event field is missing', async () => {
    const req = makeRequest('POST', undefined, { url: '/test' });
    const res = await handler(req, mockContext());

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ error: 'Missing or invalid event' });
  });

  it('returns 400 when event field is not a string', async () => {
    const req = makeRequest('POST', undefined, { event: 123, url: '/test' });
    const res = await handler(req, mockContext());

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ error: 'Missing or invalid event' });
  });

  it('returns 400 when url field is missing', async () => {
    const req = makeRequest('POST', undefined, { event: 'pageview' });
    const res = await handler(req, mockContext());

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ error: 'Missing or invalid url' });
  });

  it('returns 400 when url field is not a string', async () => {
    const req = makeRequest('POST', undefined, { event: 'pageview', url: 42 });
    const res = await handler(req, mockContext());

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ error: 'Missing or invalid url' });
  });

  it('returns 200 with tracked:true for valid pageview event', async () => {
    const req = makeRequest('POST', undefined, { event: 'pageview', url: '/dashboard' });
    const res = await handler(req, mockContext());

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ tracked: true });
  });

  it('calls generateVisitorId with request and site domain', async () => {
    const req = makeRequest('POST', undefined, { event: 'pageview', url: '/test' });
    await handler(req, mockContext());

    expect(generateVisitorId).toHaveBeenCalledWith(expect.any(Request), 'gtd-app');
  });

  it('updates pageviews count for pageview events', async () => {
    const req = makeRequest('POST', undefined, { event: 'pageview', url: '/dashboard' });
    await handler(req, mockContext());

    expect(updateDailyAggregate).toHaveBeenCalledTimes(1);
    const updatedAggregate = vi.mocked(updateDailyAggregate).mock.calls[0][2];
    expect(updatedAggregate.pageviews['/dashboard']).toBe(1);
  });

  it('increments existing pageview count', async () => {
    vi.mocked(getDailyAggregate).mockResolvedValue({
      date: '2026-02-02',
      pageviews: { '/dashboard': 5 },
      events: { pageview: 5 },
      visitors: ['existing-visitor'],
      uniqueVisitors: 1,
      referrers: {},
    });

    const req = makeRequest('POST', undefined, { event: 'pageview', url: '/dashboard' });
    await handler(req, mockContext());

    const updatedAggregate = vi.mocked(updateDailyAggregate).mock.calls[0][2];
    expect(updatedAggregate.pageviews['/dashboard']).toBe(6);
  });

  it('tracks events count for all event types', async () => {
    const req = makeRequest('POST', undefined, { event: 'sync-complete', url: '/app' });
    await handler(req, mockContext());

    const updatedAggregate = vi.mocked(updateDailyAggregate).mock.calls[0][2];
    expect(updatedAggregate.events['sync-complete']).toBe(1);
  });

  it('does not add duplicate visitor to visitors array', async () => {
    vi.mocked(getDailyAggregate).mockResolvedValue({
      date: '2026-02-02',
      pageviews: {},
      events: {},
      visitors: ['mock-visitor-hash-abc123'],
      uniqueVisitors: 1,
      referrers: {},
    });

    const req = makeRequest('POST', undefined, { event: 'pageview', url: '/test' });
    await handler(req, mockContext());

    const updatedAggregate = vi.mocked(updateDailyAggregate).mock.calls[0][2];
    expect(updatedAggregate.visitors).toHaveLength(1);
    expect(updatedAggregate.uniqueVisitors).toBe(1);
  });

  it('adds new visitor to visitors array', async () => {
    vi.mocked(getDailyAggregate).mockResolvedValue({
      date: '2026-02-02',
      pageviews: {},
      events: {},
      visitors: ['other-visitor-id'],
      uniqueVisitors: 1,
      referrers: {},
    });

    const req = makeRequest('POST', undefined, { event: 'pageview', url: '/test' });
    await handler(req, mockContext());

    const updatedAggregate = vi.mocked(updateDailyAggregate).mock.calls[0][2];
    expect(updatedAggregate.visitors).toHaveLength(2);
    expect(updatedAggregate.visitors).toContain('mock-visitor-hash-abc123');
    expect(updatedAggregate.uniqueVisitors).toBe(2);
  });

  it('tracks referrer from properties', async () => {
    const req = makeRequest('POST', undefined, {
      event: 'pageview',
      url: '/test',
      properties: { referrer: 'https://google.com' },
    });
    await handler(req, mockContext());

    const updatedAggregate = vi.mocked(updateDailyAggregate).mock.calls[0][2];
    expect(updatedAggregate.referrers['https://google.com']).toBe(1);
  });

  it('ignores empty referrer string', async () => {
    const req = makeRequest('POST', undefined, {
      event: 'pageview',
      url: '/test',
      properties: { referrer: '' },
    });
    await handler(req, mockContext());

    const updatedAggregate = vi.mocked(updateDailyAggregate).mock.calls[0][2];
    expect(Object.keys(updatedAggregate.referrers)).toHaveLength(0);
  });

  it('returns 500 when internal error occurs', async () => {
    vi.mocked(generateVisitorId).mockRejectedValueOnce(new Error('Crypto failure'));

    const req = makeRequest('POST', undefined, { event: 'pageview', url: '/test' });
    const res = await handler(req, mockContext());

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data).toEqual({ error: 'Internal server error' });
  });
});
