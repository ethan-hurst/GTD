import { getAllProjects, getStalledProjects } from '../db/operations';
import type { GTDItem } from '../db/schema';
import { onSyncDataImported } from '$lib/sync/sync';

/**
 * Reactive state for Projects list with stalled detection.
 * Follows Svelte 5 $state runes pattern for reactive state management.
 */
export class ProjectState {
	items = $state<GTDItem[]>([]);
	stalledIds = $state<Set<string>>(new Set());
	selectedIds = $state<string[]>([]);        // For batch operations
	expandedId = $state<string | null>(null);  // For detail panel

	// Derived state
	itemCount = $derived(this.items.length);
	stalledCount = $derived(this.stalledIds.size);

	/**
	 * Load projects from database and detect stalled projects.
	 */
	async loadProjects() {
		this.items = await getAllProjects();

		const stalledProjects = await getStalledProjects();
		this.stalledIds = new Set(stalledProjects.map(p => p.id));
	}

	/**
	 * Check if a project is stalled (has no active next actions).
	 */
	isStalled(id: number): boolean {
		return this.stalledIds.has(id);
	}

	/**
	 * Expand/collapse a project for viewing details.
	 * Clicking the same project toggles it closed.
	 */
	expandItem(id: string) {
		if (this.expandedId === id) {
			this.expandedId = null;
		} else {
			this.expandedId = id;
		}
	}

	/**
	 * Toggle selection of a project (for batch operations).
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
}

export const projectState = new ProjectState();
onSyncDataImported(() => projectState.loadProjects());
