import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mapOutlookEvent, syncCalendarEvents, fetchCalendars } from './calendar';
import type { OutlookEvent, OutlookCalendar, SyncResult } from './calendar';
import * as client from './client';

// Mock the graph client module
vi.mock('./client', () => ({
	graphFetch: vi.fn(),
	graphFetchAll: vi.fn(),
}));

// Mock UUID generation
vi.mock('$lib/utils/uuid', () => ({
	generateUUID: vi.fn(() => 'mock-uuid-' + Math.random().toString(36).substring(2, 9)),
}));

// Mock Dexie database with factory function to avoid hoisting issues
vi.mock('$lib/db/schema', () => ({
	db: {
		events: {
			where: vi.fn(() => ({
				anyOf: vi.fn(() => ({
					toArray: vi.fn().mockResolvedValue([]),
				})),
			})),
			bulkPut: vi.fn().mockResolvedValue(undefined),
			update: vi.fn().mockResolvedValue(1),
		},
		syncMeta: {
			get: vi.fn(),
			put: vi.fn(),
		},
	},
}));

// Import the mocked db for test assertions
import { db } from '$lib/db/schema';

beforeEach(() => {
	vi.clearAllMocks();
});

describe('mapOutlookEvent', () => {
	it('maps basic Outlook event to CalendarEvent', () => {
		const outlookEvent: OutlookEvent = {
			id: 'evt-123',
			subject: 'Team Standup',
			start: {
				dateTime: '2026-02-03T09:00:00',
				timeZone: 'America/New_York',
			},
			end: {
				dateTime: '2026-02-03T09:30:00',
				timeZone: 'America/New_York',
			},
			isAllDay: false,
			location: {
				displayName: 'Conference Room A',
			},
			bodyPreview: 'Daily standup meeting to sync on progress',
			'@odata.etag': 'W/"abc123"',
		};

		const result = mapOutlookEvent(outlookEvent, 'cal-456');

		expect(result).toBeDefined();
		expect(result?.title).toBe('Team Standup');
		expect(result?.startTime).toBeInstanceOf(Date);
		expect(result?.endTime).toBeInstanceOf(Date);
		expect(result?.allDay).toBe(false);
		expect(result?.location).toBe('Conference Room A');
		expect(result?.notes).toBe('Daily standup meeting to sync on progress');
		expect(result?.outlookId).toBe('evt-123');
		expect(result?.outlookETag).toBe('W/"abc123"');
		expect(result?.outlookCalendarId).toBe('cal-456');
		expect(result?.syncSource).toBe('outlook');
		expect(result?.lastSyncedAt).toBeInstanceOf(Date);
	});

	it('handles all-day events without timezone conversion', () => {
		const outlookEvent: OutlookEvent = {
			id: 'evt-allday',
			subject: 'Company Holiday',
			start: {
				dateTime: '2026-02-10',
				timeZone: 'UTC',
			},
			end: {
				dateTime: '2026-02-11',
				timeZone: 'UTC',
			},
			isAllDay: true,
			'@odata.etag': 'W/"xyz789"',
		};

		const result = mapOutlookEvent(outlookEvent, 'cal-456');

		expect(result).toBeDefined();
		expect(result?.allDay).toBe(true);
		expect(result?.startTime).toBeInstanceOf(Date);
		expect(result?.endTime).toBeInstanceOf(Date);

		// All-day events should use local midnight
		const startDate = result?.startTime;
		const endDate = result?.endTime;
		expect(startDate?.getHours()).toBe(0);
		expect(startDate?.getMinutes()).toBe(0);
		expect(endDate?.getHours()).toBe(0);
		expect(endDate?.getMinutes()).toBe(0);
	});

	it('handles missing location', () => {
		const outlookEvent: OutlookEvent = {
			id: 'evt-no-location',
			subject: 'Virtual Meeting',
			start: {
				dateTime: '2026-02-03T14:00:00',
				timeZone: 'UTC',
			},
			end: {
				dateTime: '2026-02-03T15:00:00',
				timeZone: 'UTC',
			},
			isAllDay: false,
			'@odata.etag': 'W/"def456"',
		};

		const result = mapOutlookEvent(outlookEvent, 'cal-456');

		expect(result).toBeDefined();
		expect(result?.location).toBeUndefined();
	});

	it('handles missing body', () => {
		const outlookEvent: OutlookEvent = {
			id: 'evt-no-body',
			subject: 'Quick Chat',
			start: {
				dateTime: '2026-02-03T10:00:00',
				timeZone: 'UTC',
			},
			end: {
				dateTime: '2026-02-03T10:15:00',
				timeZone: 'UTC',
			},
			isAllDay: false,
			'@odata.etag': 'W/"ghi789"',
		};

		const result = mapOutlookEvent(outlookEvent, 'cal-456');

		expect(result).toBeDefined();
		expect(result?.notes).toBeUndefined();
	});

	it('truncates long body preview to 500 chars', () => {
		const longBody = 'A'.repeat(600);
		const outlookEvent: OutlookEvent = {
			id: 'evt-long-body',
			subject: 'Meeting with long description',
			start: {
				dateTime: '2026-02-03T10:00:00',
				timeZone: 'UTC',
			},
			end: {
				dateTime: '2026-02-03T11:00:00',
				timeZone: 'UTC',
			},
			isAllDay: false,
			bodyPreview: longBody,
			'@odata.etag': 'W/"jkl012"',
		};

		const result = mapOutlookEvent(outlookEvent, 'cal-456');

		expect(result).toBeDefined();
		expect(result?.notes?.length).toBe(500);
	});

	it('returns null for deleted events (@removed annotation)', () => {
		const outlookEvent: OutlookEvent = {
			id: 'evt-deleted',
			'@removed': {
				reason: 'deleted',
			},
			subject: 'Deleted Event',
			start: {
				dateTime: '2026-02-03T10:00:00',
				timeZone: 'UTC',
			},
			end: {
				dateTime: '2026-02-03T11:00:00',
				timeZone: 'UTC',
			},
			isAllDay: false,
			'@odata.etag': 'W/"removed"',
		};

		const result = mapOutlookEvent(outlookEvent, 'cal-456');

		expect(result).toBeNull();
	});
});

describe('fetchCalendars', () => {
	it('fetches user calendars from Graph API', async () => {
		const mockCalendars: OutlookCalendar[] = [
			{
				id: 'cal-1',
				name: 'Calendar',
				color: 'blue',
				isDefaultCalendar: true,
			},
			{
				id: 'cal-2',
				name: 'Work Calendar',
				color: 'red',
				isDefaultCalendar: false,
			},
		];

		vi.mocked(client.graphFetch).mockResolvedValue({
			ok: true,
			status: 200,
			data: { value: mockCalendars },
		});

		const result = await fetchCalendars();

		expect(client.graphFetch).toHaveBeenCalledWith('/me/calendars');
		expect(result).toEqual(mockCalendars);
	});

	it('returns empty array on API error', async () => {
		vi.mocked(client.graphFetch).mockResolvedValue({
			ok: false,
			status: 500,
			error: 'Internal server error',
		});

		const result = await fetchCalendars();

		expect(result).toEqual([]);
	});
});

describe('syncCalendarEvents', () => {
	it('performs initial sync without deltaLink', async () => {
		const mockEvents: OutlookEvent[] = [
			{
				id: 'evt-1',
				subject: 'Event 1',
				start: { dateTime: '2026-02-03T10:00:00', timeZone: 'UTC' },
				end: { dateTime: '2026-02-03T11:00:00', timeZone: 'UTC' },
				isAllDay: false,
				'@odata.etag': 'W/"tag1"',
			},
			{
				id: 'evt-2',
				subject: 'Event 2',
				start: { dateTime: '2026-02-04T14:00:00', timeZone: 'UTC' },
				end: { dateTime: '2026-02-04T15:00:00', timeZone: 'UTC' },
				isAllDay: false,
				'@odata.etag': 'W/"tag2"',
			},
		];

		vi.mocked(client.graphFetchAll).mockResolvedValue({
			ok: true,
			data: mockEvents,
			deltaLink: 'https://graph.microsoft.com/v1.0/delta-link-123',
		});

		const result = await syncCalendarEvents('cal-456');

		expect(result.success).toBe(true);
		expect(result.eventsAdded).toBe(2);
		expect(result.eventsUpdated).toBe(0);
		expect(result.eventsDeleted).toBe(0);
		expect(result.deltaLink).toBe('https://graph.microsoft.com/v1.0/delta-link-123');

		// Verify bulk put was called
		expect(db.events.bulkPut).toHaveBeenCalled();
	});

	it('performs delta sync with existing deltaLink', async () => {
		const mockEvents: OutlookEvent[] = [
			{
				id: 'evt-1',
				subject: 'Updated Event',
				start: { dateTime: '2026-02-03T10:00:00', timeZone: 'UTC' },
				end: { dateTime: '2026-02-03T11:30:00', timeZone: 'UTC' },
				isAllDay: false,
				'@odata.etag': 'W/"tag1-updated"',
			},
		];

		// Mock existing event in database
		const mockToArray = vi.fn().mockResolvedValue([
			{
				id: 'local-uuid-1',
				outlookId: 'evt-1',
				outlookETag: 'W/"tag1"',
				title: 'Event 1',
				startTime: new Date('2026-02-03T10:00:00Z'),
				endTime: new Date('2026-02-03T11:00:00Z'),
			},
		]);
		const mockAnyOf = vi.fn(() => ({ toArray: mockToArray }));
		const mockWhere = db.events.where as any;
		mockWhere.mockReturnValue({ anyOf: mockAnyOf });

		vi.mocked(client.graphFetchAll).mockResolvedValue({
			ok: true,
			data: mockEvents,
			deltaLink: 'https://graph.microsoft.com/v1.0/delta-link-456',
		});

		const result = await syncCalendarEvents(
			'cal-456',
			'https://graph.microsoft.com/v1.0/delta-link-123'
		);

		expect(result.success).toBe(true);
		expect(result.eventsAdded).toBe(0);
		expect(result.eventsUpdated).toBe(1);
		expect(result.eventsDeleted).toBe(0);

		// Should use the existing deltaLink
		expect(client.graphFetchAll).toHaveBeenCalledWith(
			'https://graph.microsoft.com/v1.0/delta-link-123'
		);
	});

	it('handles deleted events with @removed annotation', async () => {
		const mockEvents: OutlookEvent[] = [
			{
				id: 'evt-deleted',
				'@removed': { reason: 'deleted' },
				subject: 'Deleted Event',
				start: { dateTime: '2026-02-03T10:00:00', timeZone: 'UTC' },
				end: { dateTime: '2026-02-03T11:00:00', timeZone: 'UTC' },
				isAllDay: false,
				'@odata.etag': 'W/"removed"',
			},
		];

		// Mock existing event to delete
		const mockToArray = vi.fn().mockResolvedValue([
			{
				id: 'local-uuid-deleted',
				outlookId: 'evt-deleted',
				title: 'Deleted Event',
			},
		]);
		const mockAnyOf = vi.fn(() => ({ toArray: mockToArray }));
		const mockWhere = db.events.where as any;
		mockWhere.mockReturnValue({ anyOf: mockAnyOf });

		vi.mocked(client.graphFetchAll).mockResolvedValue({
			ok: true,
			data: mockEvents,
			deltaLink: 'https://graph.microsoft.com/v1.0/delta-link-789',
		});

		const result = await syncCalendarEvents('cal-456');

		expect(result.success).toBe(true);
		expect(result.eventsAdded).toBe(0);
		expect(result.eventsUpdated).toBe(0);
		expect(result.eventsDeleted).toBe(1);

		// Verify update was called to soft-delete
		expect(db.events.update).toHaveBeenCalledWith('local-uuid-deleted', {
			deleted: true,
			deletedAt: expect.any(Date),
		});
	});

	it('handles syncStateNotFound error with fallback to full sync', async () => {
		// First call fails with syncStateNotFound
		vi.mocked(client.graphFetchAll)
			.mockResolvedValueOnce({
				ok: false,
				data: [],
				error: 'syncStateNotFound',
			})
			// Second call (full sync) succeeds
			.mockResolvedValueOnce({
				ok: true,
				data: [
					{
						id: 'evt-1',
						subject: 'Event 1',
						start: { dateTime: '2026-02-03T10:00:00', timeZone: 'UTC' },
						end: { dateTime: '2026-02-03T11:00:00', timeZone: 'UTC' },
						isAllDay: false,
						'@odata.etag': 'W/"tag1"',
					},
				],
				deltaLink: 'https://graph.microsoft.com/v1.0/delta-link-new',
			});

		const result = await syncCalendarEvents(
			'cal-456',
			'https://graph.microsoft.com/v1.0/delta-link-expired'
		);

		expect(result.success).toBe(true);
		expect(result.eventsAdded).toBe(1);

		// Verify it called graphFetchAll twice (first with deltaLink, then with full sync URL)
		expect(client.graphFetchAll).toHaveBeenCalledTimes(2);
	});

	it('returns error on API failure', async () => {
		vi.mocked(client.graphFetchAll).mockResolvedValue({
			ok: false,
			data: [],
			error: 'Network error',
		});

		const result = await syncCalendarEvents('cal-456');

		expect(result.success).toBe(false);
		expect(result.error).toBe('Network error');
		expect(result.eventsAdded).toBe(0);
		expect(result.eventsUpdated).toBe(0);
		expect(result.eventsDeleted).toBe(0);
	});
});
