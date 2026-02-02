import { graphFetch, graphFetchAll } from './client';
import { db } from '$lib/db/schema';
import type { CalendarEvent } from '$lib/db/schema';
import { generateUUID } from '$lib/utils/uuid';

// Microsoft Graph API types
export interface OutlookEvent {
	id: string;
	subject?: string;
	start: {
		dateTime: string;
		timeZone: string;
	};
	end: {
		dateTime: string;
		timeZone: string;
	};
	isAllDay: boolean;
	location?: {
		displayName?: string;
	};
	bodyPreview?: string;
	'@odata.etag'?: string;
	'@removed'?: {
		reason: string;
	};
}

export interface OutlookCalendar {
	id: string;
	name: string;
	color?: string;
	isDefaultCalendar?: boolean;
}

export interface SyncResult {
	success: boolean;
	deltaLink?: string;
	eventsAdded: number;
	eventsUpdated: number;
	eventsDeleted: number;
	error?: string;
}

/**
 * Map Outlook event to CalendarEvent format.
 * Returns null for deleted events (@removed annotation).
 */
export function mapOutlookEvent(
	outlookEvent: OutlookEvent,
	calendarId: string
): Partial<CalendarEvent> | null {
	// Deleted events return null
	if (outlookEvent['@removed']) {
		return null;
	}

	// Parse dates based on all-day vs timed events
	let startTime: Date;
	let endTime: Date;

	if (outlookEvent.isAllDay) {
		// All-day events: Use date string directly, create local midnight
		// Don't apply timezone conversion
		const startDateStr = outlookEvent.start.dateTime;
		const endDateStr = outlookEvent.end.dateTime;
		startTime = new Date(startDateStr + 'T00:00:00');
		endTime = new Date(endDateStr + 'T00:00:00');
	} else {
		// Non-all-day events: Parse with timezone awareness
		// Graph API returns dateTime in the specified timezone
		// We convert to UTC for storage
		startTime = parseDateTime(outlookEvent.start.dateTime, outlookEvent.start.timeZone);
		endTime = parseDateTime(outlookEvent.end.dateTime, outlookEvent.end.timeZone);
	}

	// Truncate body preview to 500 chars
	const notes = outlookEvent.bodyPreview
		? outlookEvent.bodyPreview.substring(0, 500)
		: undefined;

	return {
		title: outlookEvent.subject || '(No title)',
		startTime,
		endTime,
		allDay: outlookEvent.isAllDay,
		location: outlookEvent.location?.displayName,
		notes,
		outlookId: outlookEvent.id,
		outlookETag: outlookEvent['@odata.etag'],
		outlookCalendarId: calendarId,
		syncSource: 'outlook',
		lastSyncedAt: new Date(),
	};
}

/**
 * Parse dateTime string with timezone to UTC Date object.
 * Simple implementation - assumes ISO 8601 format from Graph API.
 */
function parseDateTime(dateTime: string, timeZone: string): Date {
	// For simplicity, we'll parse as-is and assume Graph API provides ISO format
	// In production, you'd use a proper timezone library like date-fns-tz
	// Graph API returns dateTime without Z suffix, so we append timezone info
	if (timeZone === 'UTC') {
		return new Date(dateTime + 'Z');
	}
	// For non-UTC timezones, parse as local time
	// This is a simplification - proper implementation would use IANA timezone database
	return new Date(dateTime);
}

/**
 * Build initial sync URL for calendar delta query.
 * Date range: 6 months back, 12 months forward.
 */
function buildInitialSyncUrl(calendarId: string): string {
	const startDate = new Date();
	startDate.setMonth(startDate.getMonth() - 6);
	const endDate = new Date();
	endDate.setMonth(endDate.getMonth() + 12);

	const startDateTime = startDate.toISOString();
	const endDateTime = endDate.toISOString();

	return `/me/calendars/${calendarId}/calendarView/delta?startDateTime=${startDateTime}&endDateTime=${endDateTime}`;
}

/**
 * Fetch user's Outlook calendars.
 */
export async function fetchCalendars(): Promise<OutlookCalendar[]> {
	const response = await graphFetch<{ value: OutlookCalendar[] }>('/me/calendars');

	if (!response.ok || !response.data) {
		console.error('Failed to fetch calendars:', response.error);
		return [];
	}

	return response.data.value || [];
}

/**
 * Sync calendar events from Outlook using delta query.
 * Handles initial sync, incremental sync, and syncStateNotFound fallback.
 */
export async function syncCalendarEvents(
	calendarId: string,
	existingDeltaLink?: string
): Promise<SyncResult> {
	// Build URL for delta query
	const url = existingDeltaLink || buildInitialSyncUrl(calendarId);

	// Fetch all pages
	let response = await graphFetchAll<OutlookEvent>(url);

	// Handle syncStateNotFound error - fall back to full sync
	if (!response.ok && response.error === 'syncStateNotFound') {
		console.warn('Delta link expired, falling back to full sync');
		response = await graphFetchAll<OutlookEvent>(buildInitialSyncUrl(calendarId));
	}

	// Check for failure
	if (!response.ok) {
		return {
			success: false,
			eventsAdded: 0,
			eventsUpdated: 0,
			eventsDeleted: 0,
			error: response.error,
		};
	}

	const events = response.data;

	// Separate events into upserts and deletions
	const toUpsert: OutlookEvent[] = [];
	const toDelete: string[] = []; // Outlook IDs to delete

	for (const event of events) {
		if (event['@removed']) {
			toDelete.push(event.id);
		} else {
			toUpsert.push(event);
		}
	}

	// Load existing events from database
	const outlookIds = [...toUpsert.map((e) => e.id), ...toDelete];
	const existingEvents = await db.events
		.where('outlookId')
		.anyOf(outlookIds)
		.toArray();

	// Build lookup map for efficient matching
	const existingMap = new Map(
		existingEvents.map((e) => [e.outlookId!, e])
	);

	// Track counts
	let eventsAdded = 0;
	let eventsUpdated = 0;
	let eventsDeleted = 0;

	// Process upserts
	const eventsToWrite: CalendarEvent[] = [];

	for (const outlookEvent of toUpsert) {
		const mapped = mapOutlookEvent(outlookEvent, calendarId);
		if (!mapped) continue; // Skip if mapping returned null

		const existing = existingMap.get(outlookEvent.id);

		if (existing) {
			// Update existing event (check ETag to see if it changed)
			if (existing.outlookETag !== mapped.outlookETag) {
				eventsToWrite.push({
					...existing,
					...mapped,
					modified: new Date(),
				} as CalendarEvent);
				eventsUpdated++;
			}
			// Else: ETag matches, no changes needed
		} else {
			// Insert new event
			eventsToWrite.push({
				id: generateUUID(),
				...mapped,
				created: new Date(),
				modified: new Date(),
			} as CalendarEvent);
			eventsAdded++;
		}
	}

	// Bulk write upserts
	if (eventsToWrite.length > 0) {
		await db.events.bulkPut(eventsToWrite);
	}

	// Process deletions (soft-delete)
	for (const outlookId of toDelete) {
		const existing = existingMap.get(outlookId);
		if (existing) {
			await db.events.update(existing.id, {
				deleted: true,
				deletedAt: new Date(),
			});
			eventsDeleted++;
		}
	}

	// Return result with new delta link
	return {
		success: true,
		deltaLink: response.deltaLink,
		eventsAdded,
		eventsUpdated,
		eventsDeleted,
	};
}
