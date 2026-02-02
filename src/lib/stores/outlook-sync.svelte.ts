/**
 * Outlook sync orchestration store (Svelte 5 runes)
 * Manages multi-calendar delta sync with progress tracking
 */

import { syncCalendarEvents, fetchCalendars } from '$lib/services/graph/calendar';
import { getAllSyncMeta, upsertSyncMeta, clearAllSyncMeta } from '$lib/db/operations';
import { calendarState } from '$lib/stores/calendar.svelte';
import type { SyncMeta } from '$lib/db/schema';
import { generateUUID } from '$lib/utils/uuid';

type OutlookSyncStatus = 'idle' | 'syncing' | 'error';

class OutlookSyncStore {
	status = $state<OutlookSyncStatus>('idle');
	lastSyncTime = $state<Date | null>(null);
	error = $state<string | null>(null);
	calendars = $state<SyncMeta[]>([]);
	syncProgress = $state<{ current: number; total: number }>({ current: 0, total: 0 });

	isSyncing = $derived(this.status === 'syncing');
	hasError = $derived(this.status === 'error');

	/**
	 * Load sync metadata from database.
	 */
	async loadSyncMeta(): Promise<void> {
		this.calendars = await getAllSyncMeta();
	}

	/**
	 * Discover calendars from Outlook and create syncMeta entries.
	 * Enables default calendar, disables others.
	 */
	async discoverCalendars(): Promise<void> {
		try {
			// Fetch calendars from Outlook
			const outlookCalendars = await fetchCalendars();

			// Load existing syncMeta
			const existingSyncMeta = await getAllSyncMeta();
			const existingMap = new Map(existingSyncMeta.map(meta => [meta.calendarId, meta]));

			// Create syncMeta for new calendars
			for (const calendar of outlookCalendars) {
				if (!existingMap.has(calendar.id)) {
					const newMeta: SyncMeta = {
						id: generateUUID(),
						calendarId: calendar.id,
						calendarName: calendar.name,
						enabled: calendar.isDefaultCalendar || false,
						color: calendar.color,
					};
					await upsertSyncMeta(newMeta);
				}
			}

			// Reload calendars state
			await this.loadSyncMeta();
		} catch (err) {
			console.error('Failed to discover calendars:', err);
			this.error = err instanceof Error ? err.message : 'Failed to discover calendars';
			this.status = 'error';
		}
	}

	/**
	 * Sync all enabled calendars using delta query.
	 */
	async syncAll(): Promise<void> {
		try {
			this.status = 'syncing';
			this.error = null;

			// Get all enabled calendars
			const allCalendars = await getAllSyncMeta();
			const enabledCalendars = allCalendars.filter(meta => meta.enabled);

			if (enabledCalendars.length === 0) {
				// No calendars enabled - skip sync
				this.status = 'idle';
				return;
			}

			this.syncProgress = { current: 0, total: enabledCalendars.length };

			// Track if any errors occurred (but continue syncing other calendars)
			const errors: string[] = [];

			// Sync each enabled calendar
			for (const calendar of enabledCalendars) {
				try {
					// Load existing deltaLink from syncMeta
					const deltaLink = calendar.deltaLink;

					// Call syncCalendarEvents
					const result = await syncCalendarEvents(calendar.calendarId, deltaLink);

					if (result.success) {
						// Update syncMeta with new deltaLink and lastSyncAt
						await upsertSyncMeta({
							...calendar,
							deltaLink: result.deltaLink,
							lastSyncAt: new Date(),
						});
					} else {
						// Track error but continue
						errors.push(`${calendar.calendarName}: ${result.error || 'Unknown error'}`);
					}
				} catch (err) {
					console.error(`Failed to sync calendar ${calendar.calendarName}:`, err);
					errors.push(`${calendar.calendarName}: ${err instanceof Error ? err.message : 'Sync failed'}`);
				}

				// Increment progress
				this.syncProgress = {
					current: this.syncProgress.current + 1,
					total: this.syncProgress.total
				};
			}

			// Set status based on whether any errors occurred
			if (errors.length > 0) {
				this.status = 'error';
				this.error = errors.join('; ');
			} else {
				this.status = 'idle';
			}

			// Update lastSyncTime
			this.lastSyncTime = new Date();

			// Reload calendars metadata
			await this.loadSyncMeta();

			// Refresh the calendar view to show new events
			await calendarState.loadEvents();

		} catch (err) {
			console.error('Sync failed:', err);
			this.status = 'error';
			this.error = err instanceof Error ? err.message : 'Sync failed';
		}
	}

	/**
	 * Sync a specific calendar by ID.
	 */
	async syncCalendar(calendarId: string): Promise<void> {
		try {
			this.status = 'syncing';
			this.error = null;

			// Find the calendar in syncMeta
			const allCalendars = await getAllSyncMeta();
			const calendar = allCalendars.find(meta => meta.calendarId === calendarId);

			if (!calendar) {
				throw new Error('Calendar not found');
			}

			// Load existing deltaLink
			const deltaLink = calendar.deltaLink;

			// Sync
			const result = await syncCalendarEvents(calendarId, deltaLink);

			if (result.success) {
				// Update syncMeta
				await upsertSyncMeta({
					...calendar,
					deltaLink: result.deltaLink,
					lastSyncAt: new Date(),
				});

				this.status = 'idle';
				this.lastSyncTime = new Date();
			} else {
				this.status = 'error';
				this.error = result.error || 'Sync failed';
			}

			// Reload calendars
			await this.loadSyncMeta();

			// Refresh calendar view
			await calendarState.loadEvents();

		} catch (err) {
			console.error('Failed to sync calendar:', err);
			this.status = 'error';
			this.error = err instanceof Error ? err.message : 'Sync failed';
		}
	}

	/**
	 * Toggle calendar enabled state.
	 */
	async toggleCalendar(calendarId: string, enabled: boolean): Promise<void> {
		// Find the calendar in this.calendars
		const calendar = this.calendars.find(meta => meta.calendarId === calendarId);
		if (!calendar) {
			console.error('Calendar not found:', calendarId);
			return;
		}

		// Update enabled state
		calendar.enabled = enabled;

		// Save via upsertSyncMeta
		await upsertSyncMeta(calendar);

		// Update calendarState.outlookCalendarsEnabled Set
		calendarState.toggleOutlookCalendar(calendarId, enabled);

		// Reload calendars state
		await this.loadSyncMeta();
	}

	/**
	 * Clear all sync metadata.
	 */
	async clearAll(): Promise<void> {
		await clearAllSyncMeta();
		this.calendars = [];
		this.status = 'idle';
		this.error = null;
		this.lastSyncTime = null;
		this.syncProgress = { current: 0, total: 0 };
	}
}

export const outlookSyncState = new OutlookSyncStore();
