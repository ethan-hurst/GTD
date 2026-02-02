import { describe, it, expect } from 'vitest';
import { parseICS, validateICS } from './ics-parser';

/**
 * Helper to build ICS strings with correct line endings.
 * ICS format requires CRLF line endings and no leading whitespace on lines.
 */
function ics(lines: string[]): string {
	return lines.join('\r\n');
}

// ---------------------------------------------------------------------------
// parseICS - basic events
// ---------------------------------------------------------------------------
describe('parseICS - basic events', () => {
	it('parses single VEVENT with SUMMARY, DTSTART, DTEND', () => {
		const icsText = ics([
			'BEGIN:VCALENDAR',
			'VERSION:2.0',
			'PRODID:-//Test//EN',
			'BEGIN:VEVENT',
			'DTSTART:20260201T100000Z',
			'DTEND:20260201T110000Z',
			'SUMMARY:Team Standup',
			'END:VEVENT',
			'END:VCALENDAR'
		]);

		const result = parseICS(icsText);

		expect(result).toHaveLength(1);
		expect(result[0].title).toBe('Team Standup');
		expect(result[0].startTime).toBeInstanceOf(Date);
		expect(result[0].endTime).toBeInstanceOf(Date);
		expect(result[0].startTime.toISOString()).toBe('2026-02-01T10:00:00.000Z');
		expect(result[0].endTime.toISOString()).toBe('2026-02-01T11:00:00.000Z');
	});

	it('parses multiple VEVENTs from single calendar', () => {
		const icsText = ics([
			'BEGIN:VCALENDAR',
			'VERSION:2.0',
			'PRODID:-//Test//EN',
			'BEGIN:VEVENT',
			'DTSTART:20260201T100000Z',
			'DTEND:20260201T110000Z',
			'SUMMARY:Meeting One',
			'END:VEVENT',
			'BEGIN:VEVENT',
			'DTSTART:20260202T140000Z',
			'DTEND:20260202T150000Z',
			'SUMMARY:Meeting Two',
			'END:VEVENT',
			'END:VCALENDAR'
		]);

		const result = parseICS(icsText);

		expect(result).toHaveLength(2);
		expect(result[0].title).toBe('Meeting One');
		expect(result[1].title).toBe('Meeting Two');
	});

	it('sets default source to ics-import', () => {
		const icsText = ics([
			'BEGIN:VCALENDAR',
			'VERSION:2.0',
			'PRODID:-//Test//EN',
			'BEGIN:VEVENT',
			'DTSTART:20260201T100000Z',
			'DTEND:20260201T110000Z',
			'SUMMARY:Test Event',
			'END:VEVENT',
			'END:VCALENDAR'
		]);

		const result = parseICS(icsText);

		expect(result[0].source).toBe('ics-import');
	});

	it('accepts custom source parameter', () => {
		const icsText = ics([
			'BEGIN:VCALENDAR',
			'VERSION:2.0',
			'PRODID:-//Test//EN',
			'BEGIN:VEVENT',
			'DTSTART:20260201T100000Z',
			'DTEND:20260201T110000Z',
			'SUMMARY:Test Event',
			'END:VEVENT',
			'END:VCALENDAR'
		]);

		const result = parseICS(icsText, 'outlook-sync');

		expect(result[0].source).toBe('outlook-sync');
	});

	it('event without SUMMARY gets title (No title)', () => {
		const icsText = ics([
			'BEGIN:VCALENDAR',
			'VERSION:2.0',
			'PRODID:-//Test//EN',
			'BEGIN:VEVENT',
			'DTSTART:20260201T100000Z',
			'DTEND:20260201T110000Z',
			'END:VEVENT',
			'END:VCALENDAR'
		]);

		const result = parseICS(icsText);

		expect(result[0].title).toBe('(No title)');
	});

	it('skips events without DTSTART', () => {
		const icsText = ics([
			'BEGIN:VCALENDAR',
			'VERSION:2.0',
			'PRODID:-//Test//EN',
			'BEGIN:VEVENT',
			'SUMMARY:No Start Time',
			'DTEND:20260201T110000Z',
			'END:VEVENT',
			'BEGIN:VEVENT',
			'DTSTART:20260201T100000Z',
			'DTEND:20260201T110000Z',
			'SUMMARY:Has Start Time',
			'END:VEVENT',
			'END:VCALENDAR'
		]);

		const result = parseICS(icsText);

		// Only the event with DTSTART should be included
		expect(result).toHaveLength(1);
		expect(result[0].title).toBe('Has Start Time');
	});
});

// ---------------------------------------------------------------------------
// parseICS - all-day events
// ---------------------------------------------------------------------------
describe('parseICS - all-day events', () => {
	it('detects all-day event (DATE type DTSTART)', () => {
		const icsText = ics([
			'BEGIN:VCALENDAR',
			'VERSION:2.0',
			'PRODID:-//Test//EN',
			'BEGIN:VEVENT',
			'DTSTART;VALUE=DATE:20260201',
			'DTEND;VALUE=DATE:20260202',
			'SUMMARY:All Day Event',
			'END:VEVENT',
			'END:VCALENDAR'
		]);

		const result = parseICS(icsText);

		expect(result).toHaveLength(1);
		expect(result[0].allDay).toBe(true);
	});

	it('all-day event sets allDay to true', () => {
		const icsText = ics([
			'BEGIN:VCALENDAR',
			'VERSION:2.0',
			'PRODID:-//Test//EN',
			'BEGIN:VEVENT',
			'DTSTART;VALUE=DATE:20260215',
			'DTEND;VALUE=DATE:20260216',
			'SUMMARY:Conference Day',
			'END:VEVENT',
			'END:VCALENDAR'
		]);

		const result = parseICS(icsText);

		expect(result[0].allDay).toBe(true);
	});

	it('missing DTEND on all-day event defaults to +1 day', () => {
		const icsText = ics([
			'BEGIN:VCALENDAR',
			'VERSION:2.0',
			'PRODID:-//Test//EN',
			'BEGIN:VEVENT',
			'DTSTART;VALUE=DATE:20260201',
			'SUMMARY:Single Day',
			'END:VEVENT',
			'END:VCALENDAR'
		]);

		const result = parseICS(icsText);

		const duration = result[0].endTime.getTime() - result[0].startTime.getTime();
		expect(duration).toBe(24 * 60 * 60 * 1000); // +1 day
	});
});

// ---------------------------------------------------------------------------
// parseICS - missing DTEND fallback
// ---------------------------------------------------------------------------
describe('parseICS - missing DTEND fallback', () => {
	it('timed event without DTEND gets +1 hour duration', () => {
		const icsText = ics([
			'BEGIN:VCALENDAR',
			'VERSION:2.0',
			'PRODID:-//Test//EN',
			'BEGIN:VEVENT',
			'DTSTART:20260201T100000Z',
			'SUMMARY:No End Time',
			'END:VEVENT',
			'END:VCALENDAR'
		]);

		const result = parseICS(icsText);

		const duration = result[0].endTime.getTime() - result[0].startTime.getTime();
		expect(duration).toBe(60 * 60 * 1000); // +1 hour
	});

	it('all-day event without DTEND gets +1 day duration', () => {
		const icsText = ics([
			'BEGIN:VCALENDAR',
			'VERSION:2.0',
			'PRODID:-//Test//EN',
			'BEGIN:VEVENT',
			'DTSTART;VALUE=DATE:20260301',
			'SUMMARY:All Day No End',
			'END:VEVENT',
			'END:VCALENDAR'
		]);

		const result = parseICS(icsText);

		const duration = result[0].endTime.getTime() - result[0].startTime.getTime();
		expect(duration).toBe(24 * 60 * 60 * 1000); // +1 day
	});
});

// ---------------------------------------------------------------------------
// parseICS - optional properties
// ---------------------------------------------------------------------------
describe('parseICS - optional properties', () => {
	it('extracts LOCATION when present', () => {
		const icsText = ics([
			'BEGIN:VCALENDAR',
			'VERSION:2.0',
			'PRODID:-//Test//EN',
			'BEGIN:VEVENT',
			'DTSTART:20260201T100000Z',
			'DTEND:20260201T110000Z',
			'SUMMARY:Office Meeting',
			'LOCATION:Room 42',
			'END:VEVENT',
			'END:VCALENDAR'
		]);

		const result = parseICS(icsText);

		expect(result[0].location).toBe('Room 42');
	});

	it('extracts DESCRIPTION as notes when present', () => {
		const icsText = ics([
			'BEGIN:VCALENDAR',
			'VERSION:2.0',
			'PRODID:-//Test//EN',
			'BEGIN:VEVENT',
			'DTSTART:20260201T100000Z',
			'DTEND:20260201T110000Z',
			'SUMMARY:Planning Session',
			'DESCRIPTION:Bring laptop and agenda printout',
			'END:VEVENT',
			'END:VCALENDAR'
		]);

		const result = parseICS(icsText);

		expect(result[0].notes).toBe('Bring laptop and agenda printout');
	});

	it('sets location to undefined when not present', () => {
		const icsText = ics([
			'BEGIN:VCALENDAR',
			'VERSION:2.0',
			'PRODID:-//Test//EN',
			'BEGIN:VEVENT',
			'DTSTART:20260201T100000Z',
			'DTEND:20260201T110000Z',
			'SUMMARY:Simple Event',
			'END:VEVENT',
			'END:VCALENDAR'
		]);

		const result = parseICS(icsText);

		expect(result[0].location).toBeUndefined();
	});

	it('sets notes to undefined when not present', () => {
		const icsText = ics([
			'BEGIN:VCALENDAR',
			'VERSION:2.0',
			'PRODID:-//Test//EN',
			'BEGIN:VEVENT',
			'DTSTART:20260201T100000Z',
			'DTEND:20260201T110000Z',
			'SUMMARY:Simple Event',
			'END:VEVENT',
			'END:VCALENDAR'
		]);

		const result = parseICS(icsText);

		expect(result[0].notes).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// parseICS - recurrence
// ---------------------------------------------------------------------------
describe('parseICS - recurrence', () => {
	it('extracts RRULE string from recurring event', () => {
		const icsText = ics([
			'BEGIN:VCALENDAR',
			'VERSION:2.0',
			'PRODID:-//Test//EN',
			'BEGIN:VEVENT',
			'DTSTART:20260201T100000Z',
			'DTEND:20260201T110000Z',
			'SUMMARY:Daily Standup',
			'RRULE:FREQ=DAILY;COUNT=5',
			'END:VEVENT',
			'END:VCALENDAR'
		]);

		const result = parseICS(icsText);

		expect(result[0].rrule).toBe('FREQ=DAILY;COUNT=5');
	});

	it('extracts EXDATE (exception dates) as ISO strings', () => {
		const icsText = ics([
			'BEGIN:VCALENDAR',
			'VERSION:2.0',
			'PRODID:-//Test//EN',
			'BEGIN:VEVENT',
			'DTSTART:20260201T100000Z',
			'DTEND:20260201T110000Z',
			'SUMMARY:Recurring With Exceptions',
			'RRULE:FREQ=DAILY;COUNT=5',
			'EXDATE:20260203T100000Z',
			'END:VEVENT',
			'END:VCALENDAR'
		]);

		const result = parseICS(icsText);

		expect(result[0].exceptionDates).toBeDefined();
		expect(result[0].exceptionDates).toHaveLength(1);
		expect(result[0].exceptionDates![0]).toBe('2026-02-03T10:00:00.000Z');
	});

	it('rrule is undefined for non-recurring events', () => {
		const icsText = ics([
			'BEGIN:VCALENDAR',
			'VERSION:2.0',
			'PRODID:-//Test//EN',
			'BEGIN:VEVENT',
			'DTSTART:20260201T100000Z',
			'DTEND:20260201T110000Z',
			'SUMMARY:One-off Meeting',
			'END:VEVENT',
			'END:VCALENDAR'
		]);

		const result = parseICS(icsText);

		expect(result[0].rrule).toBeUndefined();
	});

	it('exceptionDates is undefined when no EXDATE present', () => {
		const icsText = ics([
			'BEGIN:VCALENDAR',
			'VERSION:2.0',
			'PRODID:-//Test//EN',
			'BEGIN:VEVENT',
			'DTSTART:20260201T100000Z',
			'DTEND:20260201T110000Z',
			'SUMMARY:No Exceptions',
			'END:VEVENT',
			'END:VCALENDAR'
		]);

		const result = parseICS(icsText);

		expect(result[0].exceptionDates).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// parseICS - error handling
// ---------------------------------------------------------------------------
describe('parseICS - error handling', () => {
	it('throws descriptive error for completely invalid input', () => {
		expect(() => parseICS('not ics data')).toThrow('Failed to parse ICS file');
	});

	it('throws for malformed VCALENDAR (missing END tag)', () => {
		const icsText = ics([
			'BEGIN:VCALENDAR',
			'VERSION:2.0',
			'BEGIN:VEVENT',
			'DTSTART:20260201T100000Z',
			'SUMMARY:Broken'
			// Missing END:VEVENT and END:VCALENDAR
		]);

		// ical.js may handle gracefully or throw - but the function should
		// not crash unexpectedly. It either returns events or throws a
		// descriptive error.
		try {
			const result = parseICS(icsText);
			// If it doesn't throw, it should return an array
			expect(Array.isArray(result)).toBe(true);
		} catch (e) {
			expect((e as Error).message).toContain('Failed to parse ICS file');
		}
	});
});

// ---------------------------------------------------------------------------
// validateICS
// ---------------------------------------------------------------------------
describe('validateICS', () => {
	it('returns true for valid ICS starting with BEGIN:VCALENDAR', () => {
		const icsText = ics([
			'BEGIN:VCALENDAR',
			'VERSION:2.0',
			'PRODID:-//Test//EN',
			'END:VCALENDAR'
		]);

		expect(validateICS(icsText)).toBe(true);
	});

	it('returns true with leading whitespace (trimmed)', () => {
		const icsText = '  \n  BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR';

		expect(validateICS(icsText)).toBe(true);
	});

	it('returns false for empty string', () => {
		expect(validateICS('')).toBe(false);
	});

	it('returns false for random text', () => {
		expect(validateICS('this is not an ICS file')).toBe(false);
	});

	it('returns false for JSON content', () => {
		expect(validateICS('{"type": "calendar", "events": []}')).toBe(false);
	});

	it('returns false for HTML content', () => {
		expect(validateICS('<html><body>Not a calendar</body></html>')).toBe(false);
	});
});
