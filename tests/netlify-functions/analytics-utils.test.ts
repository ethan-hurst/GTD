// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @netlify/blobs
const mockGet = vi.fn().mockResolvedValue(null);
const mockSet = vi.fn().mockResolvedValue(undefined);
const mockList = vi.fn().mockResolvedValue({ blobs: [] });
const mockDelete = vi.fn().mockResolvedValue(undefined);

vi.mock('@netlify/blobs', () => ({
  getStore: vi.fn(() => ({
    get: mockGet,
    set: mockSet,
    list: mockList,
    delete: mockDelete,
  })),
}));

import { getStore } from '@netlify/blobs';
import {
  aggregateMetrics,
  getDailyAggregate,
  updateDailyAggregate,
  cleanupOldData,
  type DailyAggregate,
} from '../../netlify/functions/analytics-utils';

describe('aggregateMetrics', () => {
  it('returns zero totals for empty daily data array', () => {
    const result = aggregateMetrics([]);

    expect(result.totalPageviews).toBe(0);
    expect(result.totalUniqueVisitors).toBe(0);
    expect(result.dailyMetrics).toEqual([]);
    expect(result.topPages).toEqual([]);
    expect(result.topEvents).toEqual([]);
    expect(result.referrers).toEqual([]);
  });

  it('sums pageviews across multiple days', () => {
    const dailyData: DailyAggregate[] = [
      {
        date: '2026-02-01',
        pageviews: { '/dashboard': 10, '/inbox': 5 },
        events: { pageview: 15 },
        visitors: ['v1', 'v2'],
        uniqueVisitors: 2,
        referrers: {},
      },
      {
        date: '2026-02-02',
        pageviews: { '/dashboard': 8, '/projects': 3 },
        events: { pageview: 11 },
        visitors: ['v3'],
        uniqueVisitors: 1,
        referrers: {},
      },
    ];

    const result = aggregateMetrics(dailyData);

    // Total pageviews: (10+5) + (8+3) = 26
    expect(result.totalPageviews).toBe(26);
  });

  it('sums unique visitors across days (not deduplicated)', () => {
    const dailyData: DailyAggregate[] = [
      {
        date: '2026-02-01',
        pageviews: {},
        events: {},
        visitors: ['v1', 'v2'],
        uniqueVisitors: 2,
        referrers: {},
      },
      {
        date: '2026-02-02',
        pageviews: {},
        events: {},
        visitors: ['v3'],
        uniqueVisitors: 1,
        referrers: {},
      },
    ];

    const result = aggregateMetrics(dailyData);

    // Total: 2 + 1 = 3 (not deduplicated across days, by design)
    expect(result.totalUniqueVisitors).toBe(3);
  });

  it('builds dailyMetrics array sorted by date ascending', () => {
    const dailyData: DailyAggregate[] = [
      {
        date: '2026-02-03',
        pageviews: { '/a': 1 },
        events: { pageview: 1 },
        visitors: [],
        uniqueVisitors: 0,
        referrers: {},
      },
      {
        date: '2026-02-01',
        pageviews: { '/b': 2 },
        events: { click: 3 },
        visitors: ['v1'],
        uniqueVisitors: 1,
        referrers: {},
      },
      {
        date: '2026-02-02',
        pageviews: {},
        events: {},
        visitors: [],
        uniqueVisitors: 0,
        referrers: {},
      },
    ];

    const result = aggregateMetrics(dailyData);

    expect(result.dailyMetrics).toHaveLength(3);
    expect(result.dailyMetrics[0].date).toBe('2026-02-01');
    expect(result.dailyMetrics[1].date).toBe('2026-02-02');
    expect(result.dailyMetrics[2].date).toBe('2026-02-03');
  });

  it('returns top 10 pages sorted by views descending', () => {
    const pageviews: Record<string, number> = {};
    for (let i = 0; i < 15; i++) {
      pageviews[`/page-${i}`] = i + 1; // /page-0: 1, /page-1: 2, ..., /page-14: 15
    }

    const dailyData: DailyAggregate[] = [
      {
        date: '2026-02-01',
        pageviews,
        events: {},
        visitors: [],
        uniqueVisitors: 0,
        referrers: {},
      },
    ];

    const result = aggregateMetrics(dailyData);

    expect(result.topPages).toHaveLength(10);
    expect(result.topPages[0].path).toBe('/page-14');
    expect(result.topPages[0].views).toBe(15);
    expect(result.topPages[9].path).toBe('/page-5');
    expect(result.topPages[9].views).toBe(6);
  });

  it('returns top 10 events sorted by count descending', () => {
    const events: Record<string, number> = {};
    for (let i = 0; i < 12; i++) {
      events[`event-${i}`] = (i + 1) * 10;
    }

    const dailyData: DailyAggregate[] = [
      {
        date: '2026-02-01',
        pageviews: {},
        events,
        visitors: [],
        uniqueVisitors: 0,
        referrers: {},
      },
    ];

    const result = aggregateMetrics(dailyData);

    expect(result.topEvents).toHaveLength(10);
    expect(result.topEvents[0].event).toBe('event-11');
    expect(result.topEvents[0].count).toBe(120);
  });

  it('returns top 10 referrers sorted by count descending', () => {
    const referrers: Record<string, number> = {
      'https://google.com': 50,
      'https://twitter.com': 30,
      'https://reddit.com': 20,
    };

    const dailyData: DailyAggregate[] = [
      {
        date: '2026-02-01',
        pageviews: {},
        events: {},
        visitors: [],
        uniqueVisitors: 0,
        referrers,
      },
    ];

    const result = aggregateMetrics(dailyData);

    expect(result.referrers).toHaveLength(3);
    expect(result.referrers[0].source).toBe('https://google.com');
    expect(result.referrers[0].count).toBe(50);
    expect(result.referrers[1].source).toBe('https://twitter.com');
    expect(result.referrers[2].source).toBe('https://reddit.com');
  });

  it('merges same pages across multiple days', () => {
    const dailyData: DailyAggregate[] = [
      {
        date: '2026-02-01',
        pageviews: { '/dashboard': 10 },
        events: {},
        visitors: [],
        uniqueVisitors: 0,
        referrers: {},
      },
      {
        date: '2026-02-02',
        pageviews: { '/dashboard': 8 },
        events: {},
        visitors: [],
        uniqueVisitors: 0,
        referrers: {},
      },
    ];

    const result = aggregateMetrics(dailyData);

    expect(result.topPages[0].path).toBe('/dashboard');
    expect(result.topPages[0].views).toBe(18);
  });
});

describe('getDailyAggregate', () => {
  let store: ReturnType<typeof getStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    store = getStore('analytics');
  });

  it('returns existing aggregate when found in store', async () => {
    const existingData: DailyAggregate = {
      date: '2026-02-02',
      pageviews: { '/test': 5 },
      events: { pageview: 5 },
      visitors: ['v1'],
      uniqueVisitors: 1,
      referrers: { 'https://google.com': 2 },
    };

    mockGet.mockResolvedValueOnce(JSON.stringify(existingData));

    const result = await getDailyAggregate(store, '2026-02-02');

    expect(result).toEqual(existingData);
    expect(mockGet).toHaveBeenCalledWith('daily/2026-02-02', { type: 'text' });
  });

  it('returns default empty aggregate when not found in store', async () => {
    mockGet.mockResolvedValueOnce(null);

    const result = await getDailyAggregate(store, '2026-02-02');

    expect(result).toEqual({
      date: '2026-02-02',
      pageviews: {},
      events: {},
      visitors: [],
      uniqueVisitors: 0,
      referrers: {},
    });
  });
});

describe('updateDailyAggregate', () => {
  let store: ReturnType<typeof getStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    store = getStore('analytics');
  });

  it('stores aggregate as JSON with metadata', async () => {
    const aggregate: DailyAggregate = {
      date: '2026-02-02',
      pageviews: { '/test': 3 },
      events: { pageview: 3 },
      visitors: ['v1'],
      uniqueVisitors: 1,
      referrers: {},
    };

    await updateDailyAggregate(store, '2026-02-02', aggregate);

    expect(mockSet).toHaveBeenCalledWith(
      'daily/2026-02-02',
      JSON.stringify(aggregate),
      { metadata: { lastUpdated: expect.any(Number) } }
    );
  });
});

describe('cleanupOldData', () => {
  let store: ReturnType<typeof getStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    store = getStore('analytics');
  });

  it('deletes daily entries older than 13 months', async () => {
    // Create a date that's definitely older than 13 months
    const oldDate = new Date();
    oldDate.setMonth(oldDate.getMonth() - 14);
    const oldDateStr = oldDate.toISOString().split('T')[0];

    mockList
      .mockResolvedValueOnce({
        blobs: [{ key: `daily/${oldDateStr}` }],
      })
      .mockResolvedValueOnce({
        blobs: [],
      });

    const count = await cleanupOldData(store);

    expect(mockDelete).toHaveBeenCalledWith(`daily/${oldDateStr}`);
    expect(count).toBe(1);
  });

  it('deletes salt entries older than 13 months', async () => {
    const oldDate = new Date();
    oldDate.setMonth(oldDate.getMonth() - 14);
    const oldDateStr = oldDate.toISOString().split('T')[0];

    mockList
      .mockResolvedValueOnce({
        blobs: [],
      })
      .mockResolvedValueOnce({
        blobs: [{ key: `salt/${oldDateStr}` }],
      });

    const count = await cleanupOldData(store);

    expect(mockDelete).toHaveBeenCalledWith(`salt/${oldDateStr}`);
    expect(count).toBe(1);
  });

  it('keeps recent entries (within 13 months)', async () => {
    const recentDate = new Date().toISOString().split('T')[0]; // today

    mockList
      .mockResolvedValueOnce({
        blobs: [{ key: `daily/${recentDate}` }],
      })
      .mockResolvedValueOnce({
        blobs: [{ key: `salt/${recentDate}` }],
      });

    const count = await cleanupOldData(store);

    expect(mockDelete).not.toHaveBeenCalled();
    expect(count).toBe(0);
  });

  it('returns total count of deleted entries', async () => {
    const oldDate = new Date();
    oldDate.setMonth(oldDate.getMonth() - 14);
    const oldDateStr = oldDate.toISOString().split('T')[0];

    const oldDate2 = new Date();
    oldDate2.setMonth(oldDate2.getMonth() - 15);
    const oldDateStr2 = oldDate2.toISOString().split('T')[0];

    mockList
      .mockResolvedValueOnce({
        blobs: [
          { key: `daily/${oldDateStr}` },
          { key: `daily/${oldDateStr2}` },
        ],
      })
      .mockResolvedValueOnce({
        blobs: [{ key: `salt/${oldDateStr}` }],
      });

    const count = await cleanupOldData(store);

    expect(count).toBe(3);
    expect(mockDelete).toHaveBeenCalledTimes(3);
  });
});
