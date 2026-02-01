import { getAllWaitingFor, resolveWaitingFor } from '../db/operations';
import type { GTDItem } from '../db/schema';
import { onSyncDataImported } from '$lib/sync/sync';

/**
 * Reactive state for Waiting For list with overdue detection.
 * Follows Svelte 5 $state runes pattern for reactive state management.
 */
export class WaitingForState {
	items = $state<GTDItem[]>([]);
	overdueIds = $state<Set<string>>(new Set());
	expandedId = $state<string | null>(null);

	// Derived state
	itemCount = $derived(this.items.length);
	overdueCount = $derived(this.overdueIds.size);

	/**
	 * Load waiting-for items from database and compute overdue set.
	 */
	async loadItems() {
		this.items = await getAllWaitingFor();

		// Compute overdue set based on followUpDate < now
		const now = new Date();
		this.overdueIds = new Set(
			this.items
				.filter(item => item.followUpDate && item.followUpDate < now)
				.map(item => item.id)
		);
	}

	/**
	 * Check if a waiting-for item is overdue.
	 */
	isOverdue(id: string): boolean {
		return this.overdueIds.has(id);
	}

	/**
	 * Expand/collapse an item for viewing details.
	 * Clicking the same item toggles it closed.
	 */
	expandItem(id: string) {
		if (this.expandedId === id) {
			this.expandedId = null;
		} else {
			this.expandedId = id;
		}
	}
}

export const waitingForState = new WaitingForState();
onSyncDataImported(() => waitingForState.loadItems());
