import { getAllNextActions, getActionsByContext, getAllContexts } from '../db/operations';
import type { GTDItem, Context } from '../db/schema';
import { onSyncDataImported } from '$lib/sync/sync';

/**
 * Reactive state for Next Actions list with context filtering.
 * Follows Svelte 5 $state runes pattern for reactive state management.
 */
export class ActionState {
	items = $state<GTDItem[]>([]);
	contexts = $state<Context[]>([]);
	selectedContexts = $state<string[]>([]);  // Empty = "All" view
	selectedIds = $state<string[]>([]);        // For batch operations
	expandedId = $state<string | null>(null);  // For detail panel

	// Derived state
	itemCount = $derived(this.items.length);
	isAllView = $derived(this.selectedContexts.length === 0);

	/**
	 * Load actions from database based on current context filter.
	 * If no contexts selected (All view), load all actions.
	 * Otherwise load actions matching selected contexts.
	 */
	async loadActions() {
		if (this.selectedContexts.length === 0) {
			// All view
			this.items = await getAllNextActions();
		} else {
			// Filter by selected contexts
			this.items = await getActionsByContext(this.selectedContexts);
		}
	}

	/**
	 * Load all contexts from database for sidebar display.
	 */
	async loadContexts() {
		this.contexts = await getAllContexts();
	}

	/**
	 * Toggle a context filter on/off (multi-select).
	 * If removing the last selected context, switch to All view.
	 */
	toggleContext(contextName: string) {
		const index = this.selectedContexts.indexOf(contextName);
		if (index === -1) {
			// Add context to selection
			this.selectedContexts = [...this.selectedContexts, contextName];
		} else {
			// Remove context from selection
			this.selectedContexts = this.selectedContexts.filter(c => c !== contextName);
		}
		this.loadActions();
	}

	/**
	 * Select a single context (replaces current selection).
	 */
	selectContext(contextName: string) {
		this.selectedContexts = [contextName];
		this.loadActions();
	}

	/**
	 * Show all actions (clear context filter).
	 */
	showAll() {
		this.selectedContexts = [];
		this.loadActions();
	}

	/**
	 * Toggle selection of an item (for batch operations).
	 */
	toggleSelection(id: string) {
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
	 * Select all current action items.
	 */
	selectAll() {
		this.selectedIds = this.items.map(item => item.id);
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

export const actionState = new ActionState();
onSyncDataImported(() => { actionState.loadActions(); actionState.loadContexts(); });
