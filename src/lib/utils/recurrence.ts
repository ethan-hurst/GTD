import { RRule, RRuleSet } from 'rrule';
import type { CalendarEvent } from '$lib/db/schema';

/**
 * Expand a single recurring event into instances within a date range.
 *
 * If the event has no RRULE, returns the event as-is in a single-element array.
 * If the event has RRULE, expands to all occurrences within the range, excluding exception dates.
 *
 * @param event - Base calendar event (may have rrule and exceptionDates)
 * @param rangeStart - Start of visible date range
 * @param rangeEnd - End of visible date range
 * @returns Array of CalendarEvent instances within the range
 */
export function expandRecurrence(
	event: CalendarEvent,
	rangeStart: Date,
	rangeEnd: Date
): CalendarEvent[] {
	// Non-recurring event: return as-is if in range
	if (!event.rrule) {
		// Check if event falls within range
		if (event.startTime >= rangeStart && event.startTime <= rangeEnd) {
			return [event];
		}
		return [];
	}

	try {
		// Parse RRULE string (strip "RRULE:" prefix if present)
		const rruleString = event.rrule.startsWith('RRULE:')
			? event.rrule.substring(6)
			: event.rrule;

		// Create RRuleSet to handle the rule and exception dates
		const rruleSet = new RRuleSet();

		// Set the dtstart on the RRuleSet
		rruleSet.dtstart = event.startTime;

		// Parse and add the recurrence rule
		const rule = RRule.fromString(rruleString);
		rruleSet.rrule(rule);

		// Add exception dates (dates to exclude from recurrence)
		if (event.exceptionDates && event.exceptionDates.length > 0) {
			for (const exDateStr of event.exceptionDates) {
				const exDate = new Date(exDateStr);
				rruleSet.exdate(exDate);
			}
		}

		// Get all occurrence dates within the range
		const occurrences = rruleSet.between(rangeStart, rangeEnd, true);

		// Calculate event duration
		const duration = event.endTime.getTime() - event.startTime.getTime();

		// Create CalendarEvent instance for each occurrence
		const instances: CalendarEvent[] = occurrences.map((occurrenceDate) => ({
			...event,
			// Keep same id for base event - UI layer distinguishes by startTime
			startTime: occurrenceDate,
			endTime: new Date(occurrenceDate.getTime() + duration),
			recurrenceId: event.id // Mark as expanded instance
		}));

		return instances;
	} catch (error) {
		console.error('Failed to expand recurrence for event:', event.id, error);
		// On error, return the base event if it falls in range
		if (event.startTime >= rangeStart && event.startTime <= rangeEnd) {
			return [event];
		}
		return [];
	}
}

/**
 * Expand all events (recurring and non-recurring) within a date range.
 *
 * Separates recurring from non-recurring events, expands recurring events,
 * and returns the combined array sorted by start time.
 *
 * @param events - Array of calendar events (mixed recurring and non-recurring)
 * @param rangeStart - Start of visible date range
 * @param rangeEnd - End of visible date range
 * @returns Array of CalendarEvent instances sorted by startTime
 */
export function expandAllRecurrences(
	events: CalendarEvent[],
	rangeStart: Date,
	rangeEnd: Date
): CalendarEvent[] {
	const expanded: CalendarEvent[] = [];

	for (const event of events) {
		const instances = expandRecurrence(event, rangeStart, rangeEnd);
		expanded.push(...instances);
	}

	// Sort by start time
	expanded.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

	return expanded;
}
