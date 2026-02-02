import { getEventsInRange, getRecurringEvents, getAllEvents, addEvent, updateEvent, deleteEvent, bulkAddEvents } from '$lib/db/operations';
import type { CalendarEvent } from '$lib/db/schema';
import { onSyncDataImported } from '$lib/sync/sync';

/**
 * Reactive state for Calendar events with view management.
 * Follows Svelte 5 $state runes pattern for reactive state management.
 */
class CalendarState {
	events = $state<CalendarEvent[]>([]);
	recurringEvents = $state<CalendarEvent[]>([]);
	currentView = $state<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'>('timeGridDay');
	currentDate = $state<Date>(new Date());
	isLoading = $state(false);
	outlookCalendarsEnabled = $state<Set<string>>(new Set());

	eventCount = $derived(this.events.length);

	// Filter events by enabled Outlook calendars
	filteredEvents = $derived(() => {
		if (this.outlookCalendarsEnabled.size === 0) {
			// No filter configured - show all events
			return this.events;
		}
		return this.events.filter(event => {
			// Show non-Outlook events
			if (event.syncSource !== 'outlook') return true;
			// Show Outlook events only if their calendar is enabled
			return event.outlookCalendarId && this.outlookCalendarsEnabled.has(event.outlookCalendarId);
		});
	});

	async loadEvents() {
		this.isLoading = true;
		try {
			this.events = await getAllEvents();
			this.recurringEvents = await getRecurringEvents();
		} finally {
			this.isLoading = false;
		}
	}

	async loadEventsInRange(start: Date, end: Date) {
		this.isLoading = true;
		try {
			this.events = await getEventsInRange(start, end);
			this.recurringEvents = await getRecurringEvents();
		} finally {
			this.isLoading = false;
		}
	}

	async addEvent(event: Omit<CalendarEvent, 'id' | 'created' | 'modified'>) {
		await addEvent(event);
		await this.loadEvents();
	}

	async updateEvent(id: string, changes: Partial<CalendarEvent>) {
		await updateEvent(id, changes);
		await this.loadEvents();
	}

	async deleteEvent(id: string) {
		await deleteEvent(id);
		await this.loadEvents();
	}

	async bulkImport(events: Omit<CalendarEvent, 'id' | 'created' | 'modified'>[]) {
		await bulkAddEvents(events);
		await this.loadEvents();
	}

	setView(view: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay') {
		this.currentView = view;
	}

	setDate(date: Date) {
		this.currentDate = date;
	}

	toggleOutlookCalendar(calendarId: string, enabled: boolean) {
		if (enabled) {
			this.outlookCalendarsEnabled.add(calendarId);
		} else {
			this.outlookCalendarsEnabled.delete(calendarId);
		}
		// Trigger reactivity by reassigning the Set
		this.outlookCalendarsEnabled = new Set(this.outlookCalendarsEnabled);
	}
}

export const calendarState = new CalendarState();
onSyncDataImported(() => calendarState.loadEvents());
