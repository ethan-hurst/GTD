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

	eventCount = $derived(this.events.length);

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
}

export const calendarState = new CalendarState();
onSyncDataImported(() => calendarState.loadEvents());
