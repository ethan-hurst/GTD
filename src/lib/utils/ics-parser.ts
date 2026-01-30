import ICAL from 'ical.js';
import type { CalendarEvent } from '$lib/db/schema';

/**
 * Parse ICS file content into CalendarEvent objects.
 *
 * @param icsText - Raw ICS file content (should start with BEGIN:VCALENDAR)
 * @param source - Optional source identifier (defaults to 'ics-import')
 * @returns Array of CalendarEvent objects (without id, created, modified - added by operations layer)
 * @throws Error if ICS content is malformed or cannot be parsed
 */
export function parseICS(
	icsText: string,
	source: string = 'ics-import'
): Omit<CalendarEvent, 'id' | 'created' | 'modified'>[] {
	try {
		// Parse ICS text into jCal data structure
		const jcalData = ICAL.parse(icsText);
		const comp = new ICAL.Component(jcalData);

		// Get all VEVENT subcomponents
		const vevents = comp.getAllSubcomponents('vevent');

		const events: Omit<CalendarEvent, 'id' | 'created' | 'modified'>[] = [];

		for (const vevent of vevents) {
			// Extract SUMMARY (event title)
			const summaryValue = vevent.getFirstPropertyValue('summary');
			const title = typeof summaryValue === 'string' ? summaryValue : '(No title)';

			// Extract DTSTART (start time)
			const dtstart = vevent.getFirstPropertyValue('dtstart') as ICAL.Time;
			if (!dtstart) {
				console.warn('Event missing DTSTART, skipping:', vevent.toString());
				continue;
			}

			const startTime = dtstart.toJSDate();

			// Determine if all-day event (DATE type vs DATE-TIME type)
			const allDay = dtstart.isDate;

			// Extract DTEND (end time) with fallback
			let endTime: Date;
			const dtend = vevent.getFirstPropertyValue('dtend') as ICAL.Time | null;
			if (dtend) {
				endTime = dtend.toJSDate();
			} else {
				// Fallback: all-day events get +1 day, timed events get +1 hour
				if (allDay) {
					endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000);
				} else {
					endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
				}
			}

			// Extract optional properties
			const locationValue = vevent.getFirstPropertyValue('location');
			const location = typeof locationValue === 'string' ? locationValue : null;
			const descriptionValue = vevent.getFirstPropertyValue('description');
			const description = typeof descriptionValue === 'string' ? descriptionValue : null;

			// Extract RRULE (recurrence rule)
			const rruleProp = vevent.getFirstPropertyValue('rrule') as ICAL.Recur | null;
			const rrule = rruleProp ? rruleProp.toString() : undefined;

			// Extract EXDATE (exception dates)
			const exdates = vevent.getAllProperties('exdate');
			const exceptionDates: string[] = [];
			for (const exdateProp of exdates) {
				const exdateValue = exdateProp.getFirstValue() as ICAL.Time;
				if (exdateValue) {
					exceptionDates.push(exdateValue.toJSDate().toISOString());
				}
			}

			events.push({
				title,
				startTime,
				endTime,
				allDay: allDay || undefined,
				location: location || undefined,
				notes: description || undefined,
				rrule,
				exceptionDates: exceptionDates.length > 0 ? exceptionDates : undefined,
				source
			});
		}

		return events;
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to parse ICS file: ${error.message}`);
		}
		throw new Error('Failed to parse ICS file: Unknown error');
	}
}

/**
 * Validate ICS file content before full parsing.
 *
 * @param icsText - Raw ICS file content
 * @returns true if content appears to be valid ICS format
 */
export function validateICS(icsText: string): boolean {
	return icsText.trim().startsWith('BEGIN:VCALENDAR');
}
