import { getAllSomedayMaybe, promoteSomedayToActive } from '../db/operations';
import type { GTDItem } from '../db/schema';

/**
 * Predefined categories for Someday/Maybe items.
 * Exported for use in UI components.
 */
export const SOMEDAY_CATEGORIES = [
	'Projects',
	'Learning',
	'Travel',
	'Hobbies',
	'Books & Media',
	'Skills',
	'Places to Visit',
	'Things to Try'
] as const;

export type SomedayCategory = typeof SOMEDAY_CATEGORIES[number];

/**
 * Reactive state for Someday/Maybe list with category filtering.
 * Follows Svelte 5 $state runes pattern for reactive state management.
 */
export class SomedayMaybeState {
	items = $state<GTDItem[]>([]);
	selectedCategory = $state<string | null>(null);  // null = All view
	expandedId = $state<number | null>(null);

	// Derived state
	itemCount = $derived(this.items.length);
	filteredItems = $derived(
		this.selectedCategory === null
			? this.items
			: this.items.filter(item => item.category === this.selectedCategory)
	);
	filteredCount = $derived(this.filteredItems.length);

	/**
	 * Load someday/maybe items from database.
	 */
	async loadItems() {
		this.items = await getAllSomedayMaybe();
	}

	/**
	 * Select a category to filter items (or null for All view).
	 */
	selectCategory(category: string | null) {
		this.selectedCategory = category;
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
}

export const somedayMaybeState = new SomedayMaybeState();
