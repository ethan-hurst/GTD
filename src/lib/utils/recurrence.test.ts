import { describe, it, expect } from 'vitest';
import { expandRecurrence, expandAllRecurrences } from './recurrence';
import type { CalendarEvent } from '$lib/db/schema';

/**
 * Helper to create test CalendarEvent objects with sensible defaults.
 * Override any field via the overrides parameter.
 */
function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
	return {
		id: 'test-event-1',
		title: 'Test Event',
		startTime: new Date('2026-02-01T10:00:00Z'),
		endTime: new Date('2026-02-01T11:00:00Z'),
		created: new Date(),
		modified: new Date(),
		...overrides
	};
}

// ---------------------------------------------------------------------------
// expandRecurrence - non-recurring events
// ---------------------------------------------------------------------------
describe('expandRecurrence - non-recurring events', () => {
	const rangeStart = new Date('2026-02-01T00:00:00Z');
	const rangeEnd = new Date('2026-02-28T23:59:59Z');

	it('returns event in single-element array when in range and has no rrule', () => {
		const event = makeEvent();
		const result = expandRecurrence(event, rangeStart, rangeEnd);

		expect(result).toHaveLength(1);
		expect(result[0]).toBe(event);
	});

	it('returns empty array when event is outside range and has no rrule', () => {
		const event = makeEvent({
			startTime: new Date('2026-03-15T10:00:00Z'),
			endTime: new Date('2026-03-15T11:00:00Z')
		});
		const result = expandRecurrence(event, rangeStart, rangeEnd);

		expect(result).toHaveLength(0);
	});

	it('returns event when startTime equals rangeStart (boundary, inclusive)', () => {
		const event = makeEvent({
			startTime: new Date('2026-02-01T00:00:00Z'),
			endTime: new Date('2026-02-01T01:00:00Z')
		});
		const result = expandRecurrence(event, rangeStart, rangeEnd);

		expect(result).toHaveLength(1);
		expect(result[0]).toBe(event);
	});

	it('returns event when startTime equals rangeEnd (boundary, inclusive)', () => {
		const event = makeEvent({
			startTime: new Date('2026-02-28T23:59:59Z'),
			endTime: new Date('2026-03-01T00:59:59Z')
		});
		const result = expandRecurrence(event, rangeStart, rangeEnd);

		expect(result).toHaveLength(1);
		expect(result[0]).toBe(event);
	});
});

// ---------------------------------------------------------------------------
// expandRecurrence - daily recurrence
// ---------------------------------------------------------------------------
describe('expandRecurrence - daily recurrence', () => {
	// Note: rrule strings include DTSTART so the expansion starts from the
	// event's start time rather than "now" (RRule.fromString defaults to
	// current time when DTSTART is absent).
	it('expands FREQ=DAILY;COUNT=5 to 5 instances within range', () => {
		const event = makeEvent({
			startTime: new Date('2026-02-01T10:00:00Z'),
			endTime: new Date('2026-02-01T11:00:00Z'),
			rrule: 'DTSTART:20260201T100000Z\nRRULE:FREQ=DAILY;COUNT=5'
		});
		const rangeStart = new Date('2026-01-31T00:00:00Z');
		const rangeEnd = new Date('2026-02-28T23:59:59Z');

		const result = expandRecurrence(event, rangeStart, rangeEnd);

		expect(result).toHaveLength(5);
	});

	it('each instance has correct startTime incrementing by 1 day', () => {
		const event = makeEvent({
			startTime: new Date('2026-02-01T10:00:00Z'),
			endTime: new Date('2026-02-01T11:00:00Z'),
			rrule: 'DTSTART:20260201T100000Z\nRRULE:FREQ=DAILY;COUNT=5'
		});
		const rangeStart = new Date('2026-01-31T00:00:00Z');
		const rangeEnd = new Date('2026-02-28T23:59:59Z');

		const result = expandRecurrence(event, rangeStart, rangeEnd);

		expect(result[0].startTime.toISOString()).toBe('2026-02-01T10:00:00.000Z');
		expect(result[1].startTime.toISOString()).toBe('2026-02-02T10:00:00.000Z');
		expect(result[2].startTime.toISOString()).toBe('2026-02-03T10:00:00.000Z');
		expect(result[3].startTime.toISOString()).toBe('2026-02-04T10:00:00.000Z');
		expect(result[4].startTime.toISOString()).toBe('2026-02-05T10:00:00.000Z');
	});

	it('each instance preserves event duration (1 hour)', () => {
		const event = makeEvent({
			startTime: new Date('2026-02-01T10:00:00Z'),
			endTime: new Date('2026-02-01T11:00:00Z'),
			rrule: 'DTSTART:20260201T100000Z\nRRULE:FREQ=DAILY;COUNT=3'
		});
		const rangeStart = new Date('2026-01-31T00:00:00Z');
		const rangeEnd = new Date('2026-02-28T23:59:59Z');

		const result = expandRecurrence(event, rangeStart, rangeEnd);

		for (const instance of result) {
			const duration = instance.endTime.getTime() - instance.startTime.getTime();
			expect(duration).toBe(60 * 60 * 1000); // 1 hour in ms
		}
	});

	it('only returns instances within the specified range', () => {
		const event = makeEvent({
			startTime: new Date('2026-02-01T10:00:00Z'),
			endTime: new Date('2026-02-01T11:00:00Z'),
			rrule: 'DTSTART:20260201T100000Z\nRRULE:FREQ=DAILY;COUNT=10'
		});
		// Narrow range: only Feb 3-5
		const rangeStart = new Date('2026-02-03T00:00:00Z');
		const rangeEnd = new Date('2026-02-05T23:59:59Z');

		const result = expandRecurrence(event, rangeStart, rangeEnd);

		// Should only include instances whose startTime falls within [Feb 3, Feb 5]
		for (const instance of result) {
			expect(instance.startTime.getTime()).toBeGreaterThanOrEqual(rangeStart.getTime());
			expect(instance.startTime.getTime()).toBeLessThanOrEqual(rangeEnd.getTime());
		}
		expect(result).toHaveLength(3); // Feb 3, 4, 5
	});

	it('handles RRULE: prefix (strips it before parsing)', () => {
		const event = makeEvent({
			startTime: new Date('2026-02-01T10:00:00Z'),
			endTime: new Date('2026-02-01T11:00:00Z'),
			rrule: 'RRULE:DTSTART:20260201T100000Z\nRRULE:FREQ=DAILY;COUNT=3'
		});
		const rangeStart = new Date('2026-01-31T00:00:00Z');
		const rangeEnd = new Date('2026-02-28T23:59:59Z');

		const result = expandRecurrence(event, rangeStart, rangeEnd);

		expect(result).toHaveLength(3);
		expect(result[0].startTime.toISOString()).toBe('2026-02-01T10:00:00.000Z');
	});
});

// ---------------------------------------------------------------------------
// expandRecurrence - weekly recurrence
// ---------------------------------------------------------------------------
describe('expandRecurrence - weekly recurrence', () => {
	it('expands FREQ=WEEKLY;COUNT=4 to 4 weekly instances', () => {
		// Feb 1 2026 is a Sunday
		const event = makeEvent({
			startTime: new Date('2026-02-01T10:00:00Z'),
			endTime: new Date('2026-02-01T11:00:00Z'),
			rrule: 'DTSTART:20260201T100000Z\nRRULE:FREQ=WEEKLY;COUNT=4'
		});
		const rangeStart = new Date('2026-01-31T00:00:00Z');
		const rangeEnd = new Date('2026-03-31T23:59:59Z');

		const result = expandRecurrence(event, rangeStart, rangeEnd);

		expect(result).toHaveLength(4);

		// Verify weekly spacing (7 days apart)
		for (let i = 1; i < result.length; i++) {
			const diff = result[i].startTime.getTime() - result[i - 1].startTime.getTime();
			expect(diff).toBe(7 * 24 * 60 * 60 * 1000); // 7 days
		}
	});

	it('expands FREQ=WEEKLY;BYDAY=MO,WE,FR within range', () => {
		// Start on Monday 2026-02-02
		const event = makeEvent({
			startTime: new Date('2026-02-02T10:00:00Z'), // Monday
			endTime: new Date('2026-02-02T11:00:00Z'),
			rrule: 'DTSTART:20260202T100000Z\nRRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=6'
		});
		const rangeStart = new Date('2026-01-31T00:00:00Z');
		const rangeEnd = new Date('2026-02-28T23:59:59Z');

		const result = expandRecurrence(event, rangeStart, rangeEnd);

		expect(result.length).toBeGreaterThanOrEqual(3);

		// Each instance should be on Mon(1), Wed(3), or Fri(5)
		for (const instance of result) {
			const day = instance.startTime.getUTCDay();
			expect([1, 3, 5]).toContain(day);
		}
	});
});

// ---------------------------------------------------------------------------
// expandRecurrence - exception dates
// ---------------------------------------------------------------------------
describe('expandRecurrence - exception dates', () => {
	it('excludes dates in exceptionDates array from expanded instances', () => {
		// Daily for 5 days starting Feb 1, exclude Feb 3
		const event = makeEvent({
			startTime: new Date('2026-02-01T10:00:00Z'),
			endTime: new Date('2026-02-01T11:00:00Z'),
			rrule: 'DTSTART:20260201T100000Z\nRRULE:FREQ=DAILY;COUNT=5',
			exceptionDates: [new Date('2026-02-03T10:00:00Z').toISOString()]
		});
		const rangeStart = new Date('2026-01-31T00:00:00Z');
		const rangeEnd = new Date('2026-02-28T23:59:59Z');

		const result = expandRecurrence(event, rangeStart, rangeEnd);

		// Should be 4 instances (5 minus 1 excluded)
		expect(result).toHaveLength(4);

		// Verify Feb 3 is not present
		const startDates = result.map((e) => e.startTime.toISOString());
		expect(startDates).not.toContain('2026-02-03T10:00:00.000Z');
	});
});

// ---------------------------------------------------------------------------
// expandRecurrence - duration preservation
// ---------------------------------------------------------------------------
describe('expandRecurrence - duration preservation', () => {
	it('2-hour event expanded instances all have 2-hour duration', () => {
		const event = makeEvent({
			startTime: new Date('2026-02-01T10:00:00Z'),
			endTime: new Date('2026-02-01T12:00:00Z'), // 2 hours
			rrule: 'DTSTART:20260201T100000Z\nRRULE:FREQ=DAILY;COUNT=3'
		});
		const rangeStart = new Date('2026-01-31T00:00:00Z');
		const rangeEnd = new Date('2026-02-28T23:59:59Z');

		const result = expandRecurrence(event, rangeStart, rangeEnd);

		expect(result).toHaveLength(3);
		for (const instance of result) {
			const duration = instance.endTime.getTime() - instance.startTime.getTime();
			expect(duration).toBe(2 * 60 * 60 * 1000); // 2 hours in ms
		}
	});

	it('all-day event preserves allDay flag and full-day duration', () => {
		const event = makeEvent({
			startTime: new Date('2026-02-01T00:00:00Z'),
			endTime: new Date('2026-02-02T00:00:00Z'), // 24 hours
			allDay: true,
			rrule: 'DTSTART:20260201T000000Z\nRRULE:FREQ=DAILY;COUNT=3'
		});
		const rangeStart = new Date('2026-01-31T00:00:00Z');
		const rangeEnd = new Date('2026-02-28T23:59:59Z');

		const result = expandRecurrence(event, rangeStart, rangeEnd);

		expect(result).toHaveLength(3);
		for (const instance of result) {
			expect(instance.allDay).toBe(true);
			const duration = instance.endTime.getTime() - instance.startTime.getTime();
			expect(duration).toBe(24 * 60 * 60 * 1000); // 24 hours in ms
		}
	});
});

// ---------------------------------------------------------------------------
// expandRecurrence - error handling
// ---------------------------------------------------------------------------
describe('expandRecurrence - error handling', () => {
	it('invalid rrule string returns base event if in range (fallback)', () => {
		const event = makeEvent({
			startTime: new Date('2026-02-01T10:00:00Z'),
			endTime: new Date('2026-02-01T11:00:00Z'),
			rrule: 'COMPLETELY_INVALID_RRULE'
		});
		const rangeStart = new Date('2026-02-01T00:00:00Z');
		const rangeEnd = new Date('2026-02-28T23:59:59Z');

		const result = expandRecurrence(event, rangeStart, rangeEnd);

		expect(result).toHaveLength(1);
		expect(result[0]).toBe(event);
	});

	it('invalid rrule string returns empty array if base event is out of range', () => {
		const event = makeEvent({
			startTime: new Date('2026-03-15T10:00:00Z'),
			endTime: new Date('2026-03-15T11:00:00Z'),
			rrule: 'COMPLETELY_INVALID_RRULE'
		});
		const rangeStart = new Date('2026-02-01T00:00:00Z');
		const rangeEnd = new Date('2026-02-28T23:59:59Z');

		const result = expandRecurrence(event, rangeStart, rangeEnd);

		expect(result).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// expandAllRecurrences
// ---------------------------------------------------------------------------
describe('expandAllRecurrences', () => {
	const rangeStart = new Date('2026-02-01T00:00:00Z');
	const rangeEnd = new Date('2026-02-28T23:59:59Z');

	it('returns empty array for empty input', () => {
		const result = expandAllRecurrences([], rangeStart, rangeEnd);

		expect(result).toEqual([]);
	});

	it('returns non-recurring events sorted by startTime', () => {
		const event1 = makeEvent({
			id: 'ev-1',
			startTime: new Date('2026-02-10T10:00:00Z'),
			endTime: new Date('2026-02-10T11:00:00Z')
		});
		const event2 = makeEvent({
			id: 'ev-2',
			startTime: new Date('2026-02-05T10:00:00Z'),
			endTime: new Date('2026-02-05T11:00:00Z')
		});

		const result = expandAllRecurrences([event1, event2], rangeStart, rangeEnd);

		expect(result).toHaveLength(2);
		expect(result[0].id).toBe('ev-2'); // Feb 5 comes first
		expect(result[1].id).toBe('ev-1'); // Feb 10 comes second
	});

	it('expands recurring events and merges with non-recurring', () => {
		const nonRecurring = makeEvent({
			id: 'non-rec',
			startTime: new Date('2026-02-03T08:00:00Z'),
			endTime: new Date('2026-02-03T09:00:00Z')
		});
		const recurring = makeEvent({
			id: 'rec',
			startTime: new Date('2026-02-01T10:00:00Z'),
			endTime: new Date('2026-02-01T11:00:00Z'),
			rrule: 'DTSTART:20260201T100000Z\nRRULE:FREQ=DAILY;COUNT=3'
		});

		const result = expandAllRecurrences([nonRecurring, recurring], rangeStart, rangeEnd);

		// 1 non-recurring + 3 recurring = 4 total
		expect(result).toHaveLength(4);
	});

	it('result is sorted by startTime (mixing recurring and non-recurring)', () => {
		const nonRecurring = makeEvent({
			id: 'non-rec',
			startTime: new Date('2026-02-02T15:00:00Z'),
			endTime: new Date('2026-02-02T16:00:00Z')
		});
		const recurring = makeEvent({
			id: 'rec',
			startTime: new Date('2026-02-01T10:00:00Z'),
			endTime: new Date('2026-02-01T11:00:00Z'),
			rrule: 'DTSTART:20260201T100000Z\nRRULE:FREQ=DAILY;COUNT=3'
		});

		const result = expandAllRecurrences([nonRecurring, recurring], rangeStart, rangeEnd);

		// Verify sorted order
		for (let i = 1; i < result.length; i++) {
			expect(result[i].startTime.getTime()).toBeGreaterThanOrEqual(
				result[i - 1].startTime.getTime()
			);
		}
	});

	it('handles array with only recurring events', () => {
		const rec1 = makeEvent({
			id: 'rec-1',
			startTime: new Date('2026-02-01T10:00:00Z'),
			endTime: new Date('2026-02-01T11:00:00Z'),
			rrule: 'DTSTART:20260201T100000Z\nRRULE:FREQ=DAILY;COUNT=2'
		});
		const rec2 = makeEvent({
			id: 'rec-2',
			startTime: new Date('2026-02-05T14:00:00Z'),
			endTime: new Date('2026-02-05T15:00:00Z'),
			rrule: 'DTSTART:20260205T140000Z\nRRULE:FREQ=DAILY;COUNT=2'
		});

		const result = expandAllRecurrences([rec1, rec2], rangeStart, rangeEnd);

		expect(result).toHaveLength(4); // 2 + 2
	});

	it('handles array with only non-recurring events', () => {
		const ev1 = makeEvent({
			id: 'ev-1',
			startTime: new Date('2026-02-10T10:00:00Z'),
			endTime: new Date('2026-02-10T11:00:00Z')
		});
		const ev2 = makeEvent({
			id: 'ev-2',
			startTime: new Date('2026-02-15T10:00:00Z'),
			endTime: new Date('2026-02-15T11:00:00Z')
		});

		const result = expandAllRecurrences([ev1, ev2], rangeStart, rangeEnd);

		expect(result).toHaveLength(2);
		expect(result[0].id).toBe('ev-1');
		expect(result[1].id).toBe('ev-2');
	});
});
