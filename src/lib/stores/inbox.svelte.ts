import { getAllInbox } from '../db/operations';
import type { GTDItem } from '../db/schema';

/**
 * Shared reactive inbox state for capture, processing, and selection.
 * Follows Svelte 5 $state runes pattern for reactive state management.
 */
export class InboxState {
	items = $state<GTDItem[]>([]);
	expandedId = $state<number | null>(null);
	isProcessing = $state(false);
	selectedIds = $state<number[]>([]);

	// Derived count for sidebar badge
	itemCount = $derived(this.items.length);

	/**
	 * Load inbox items from database (FIFO order: oldest first).
	 */
	async loadItems() {
		this.items = await getAllInbox();
	}

	/**
	 * Toggle selection of an item (for bulk actions).
	 */
	toggleSelection(id: number) {
		const index = this.selectedIds.indexOf(id);
		if (index === -1) {
			this.selectedIds = [...this.selectedIds, id];
		} else {
			this.selectedIds = this.selectedIds.filter(sid => sid !== id);
		}
	}

	/**
	 * Clear all selections.
	 */
	clearSelection() {
		this.selectedIds = [];
	}

	/**
	 * Select all current inbox items.
	 */
	selectAll() {
		this.selectedIds = this.items.map(item => item.id);
	}

	/**
	 * Expand/collapse an item for viewing details.
	 * Clicking the same item toggles it closed.
	 */
	expandItem(id: number) {
		if (this.expandedId === id) {
			this.expandedId = null;
		} else {
			this.expandedId = id;
		}
	}

	/**
	 * Start sequential processing mode (one item at a time).
	 * Expands the first item.
	 */
	startProcessing() {
		this.isProcessing = true;
		if (this.items.length > 0) {
			this.expandedId = this.items[0].id;
		}
	}

	/**
	 * After processing current item, advance to next item.
	 * Ends processing mode if no items remain.
	 */
	async advanceToNext() {
		await this.loadItems();
		if (this.items.length > 0) {
			this.expandedId = this.items[0].id;
		} else {
			// No more items to process
			this.isProcessing = false;
			this.expandedId = null;
		}
	}
}

export const inboxState = new InboxState();
