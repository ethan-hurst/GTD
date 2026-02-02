// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Context } from '@netlify/functions';

// Mock @netlify/blobs (used by handler directly)
vi.mock('@netlify/blobs', () => ({
  getStore: vi.fn(() => ({
    get: vi.fn().mockResolvedValue(null),
    list: vi.fn().mockResolvedValue({ blobs: [] }),
    delete: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock analytics-utils (handler imports getDailyAggregate, aggregateMetrics, cleanupOldData)
vi.mock('../../netlify/functions/analytics-utils.ts', () => ({
  getDailyAggregate: vi.fn().mockResolvedValue({
    date: '2026-02-02',
    pageviews: {},
    events: {},
    visitors: [],
    uniqueVisitors: 0,
    referrers: {},
  }),
  aggregateMetrics: vi.fn().mockReturnValue({
    totalPageviews: 0,
    totalUniqueVisitors: 0,
    dailyMetrics: [],
    topPages: [],
    topEvents: [],
    referrers: [],
  }),
  cleanupOldData: vi.fn().mockResolvedValue(0),
}));

import { getStore } from '@netlify/blobs';
import { getDailyAggregate, aggregateMetrics, cleanupOldData } from '../../netlify/functions/analytics-utils.ts';
import handler from '../../netlify/functions/analytics-query.mts';

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
  headers?: Record<string, string>
): Request {
  const reqUrl = url || 'https://example.com/.netlify/functions/analytics-query';
  return new Request(reqUrl, { method, headers: { ...headers } });
}

// Helper to create Basic Auth header
function authHeader(password: string): string {
  return 'Basic ' + btoa('admin:' + password);
}

describe('analytics-query function', () => {
  let mockStore: any;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANALYTICS_PASSWORD = 'test-password';

    mockStore = {
      get: vi.fn().mockResolvedValue(null),
      list: vi.fn().mockResolvedValue({ blobs: [] }),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(getStore).mockReturnValue(mockStore);

    // Reset analytics-utils mocks
    vi.mocked(getDailyAggregate).mockResolvedValue({
      date: '2026-02-02',
      pageviews: {},
      events: {},
      visitors: [],
      uniqueVisitors: 0,
      referrers: {},
    });
    vi.mocked(aggregateMetrics).mockReturnValue({
      totalPageviews: 0,
      totalUniqueVisitors: 0,
      dailyMetrics: [],
      topPages: [],
      topEvents: [],
      referrers: [],
    });
    vi.mocked(cleanupOldData).mockResolvedValue(0);
  });

  afterEach(() => {
    delete process.env.ANALYTICS_PASSWORD;
  });

  it('returns 405 for POST request', async () => {
    const req = new Request('https://example.com/.netlify/functions/analytics-query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await handler(req, mockContext());

    expect(res.status).toBe(405);
    const data = await res.json();
    expect(data).toEqual({ error: 'Method not allowed' });
  });

  it('returns 503 when ANALYTICS_PASSWORD env var not set', async () => {
    delete process.env.ANALYTICS_PASSWORD;

    const req = makeRequest('GET');
    const res = await handler(req, mockContext());

    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data).toEqual({ error: 'Analytics not configured' });
  });

  it('returns 401 when no Authorization header provided', async () => {
    const req = makeRequest('GET');
    const res = await handler(req, mockContext());

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data).toEqual({ error: 'Authentication required' });
  });

  it('returns 401 when Authorization header is not Basic auth', async () => {
    const req = makeRequest('GET', undefined, { Authorization: 'Bearer some-token' });
    const res = await handler(req, mockContext());

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data).toEqual({ error: 'Authentication required' });
  });

  it('returns 401 when password in Basic Auth is wrong', async () => {
    const req = makeRequest('GET', undefined, { Authorization: authHeader('wrong-password') });
    const res = await handler(req, mockContext());

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data).toEqual({ error: 'Invalid credentials' });
  });

  it('returns 200 with aggregated metrics for valid authenticated request', async () => {
    vi.mocked(aggregateMetrics).mockReturnValue({
      totalPageviews: 150,
      totalUniqueVisitors: 42,
      dailyMetrics: [{ date: '2026-02-02', pageviews: 150, uniqueVisitors: 42, events: 200 }],
      topPages: [{ path: '/dashboard', views: 100 }],
      topEvents: [{ event: 'pageview', count: 150 }],
      referrers: [{ source: 'https://google.com', count: 20 }],
    });

    const req = makeRequest('GET', undefined, { Authorization: authHeader('test-password') });
    const res = await handler(req, mockContext());

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.summary.totalPageviews).toBe(150);
    expect(data.summary.totalUniqueVisitors).toBe(42);
    expect(data.period.days).toBe(30);
    expect(data.generatedAt).toBeDefined();
  });

  it('default date range is 30 days', async () => {
    const req = makeRequest('GET', undefined, { Authorization: authHeader('test-password') });
    await handler(req, mockContext());

    // getDailyAggregate should be called 30 times (one per day)
    expect(getDailyAggregate).toHaveBeenCalledTimes(30);
  });

  it('accepts custom days query parameter', async () => {
    const req = makeRequest(
      'GET',
      'https://example.com/.netlify/functions/analytics-query?days=7',
      { Authorization: authHeader('test-password') }
    );
    const res = await handler(req, mockContext());

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.period.days).toBe(7);
    expect(getDailyAggregate).toHaveBeenCalledTimes(7);
  });

  it('caps days at 395 maximum', async () => {
    const req = makeRequest(
      'GET',
      'https://example.com/.netlify/functions/analytics-query?days=1000',
      { Authorization: authHeader('test-password') }
    );
    const res = await handler(req, mockContext());

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.period.days).toBe(395);
    expect(getDailyAggregate).toHaveBeenCalledTimes(395);
  });

  it('calls aggregateMetrics with fetched daily data', async () => {
    const req = makeRequest(
      'GET',
      'https://example.com/.netlify/functions/analytics-query?days=3',
      { Authorization: authHeader('test-password') }
    );
    await handler(req, mockContext());

    expect(aggregateMetrics).toHaveBeenCalledTimes(1);
    // Should be called with array of 3 daily aggregates
    const args = vi.mocked(aggregateMetrics).mock.calls[0][0];
    expect(args).toHaveLength(3);
  });

  it('runs cleanup opportunistically', async () => {
    const req = makeRequest('GET', undefined, { Authorization: authHeader('test-password') });
    await handler(req, mockContext());

    expect(cleanupOldData).toHaveBeenCalledTimes(1);
  });

  it('returns period with start and end dates', async () => {
    const req = makeRequest(
      'GET',
      'https://example.com/.netlify/functions/analytics-query?days=7',
      { Authorization: authHeader('test-password') }
    );
    const res = await handler(req, mockContext());
    const data = await res.json();

    expect(data.period.start).toBeDefined();
    expect(data.period.end).toBeDefined();
    // Start should be before end (oldest first)
    expect(data.period.start <= data.period.end).toBe(true);
  });

  it('returns CORS header', async () => {
    const req = makeRequest('GET', undefined, { Authorization: authHeader('test-password') });
    const res = await handler(req, mockContext());

    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});
