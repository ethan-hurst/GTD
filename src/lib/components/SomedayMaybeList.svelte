<script lang="ts">
	import toast from 'svelte-5-french-toast';
	import { somedayMaybeState, SOMEDAY_CATEGORIES } from '$lib/stores/someday.svelte';
	import { addSomedayItem } from '$lib/db/operations';
	import SomedayMaybeItem from './SomedayMaybeItem.svelte';

	// Local state for inline add form
	let newItemTitle = $state('');

	async function handleAddItem(e: Event) {
		e.preventDefault();

		const trimmedTitle = newItemTitle.trim();
		if (!trimmedTitle) return;

		// Add with title only - no category during capture (per user decision)
		await addSomedayItem(trimmedTitle);
		newItemTitle = '';
		await somedayMaybeState.loadItems();
		toast.success('Added to Someday/Maybe');
	}

	const isFormDisabled = $derived(!newItemTitle.trim());

	// Calculate category counts for sidebar
	function getCategoryCount(category: string): number {
		return somedayMaybeState.items.filter(item => item.category === category).length;
	}

	const totalCount = $derived(somedayMaybeState.itemCount);
</script>

<div class="flex h-full">
	<!-- Category filter sidebar -->
	<div class="w-48 border-r border-gray-200 dark:border-gray-800 p-4 space-y-1">
		<div class="mb-2">
			<span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
				Categories
			</span>
		</div>

		<!-- All button -->
		<button
			onclick={() => somedayMaybeState.selectCategory(null)}
			class="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors
				{somedayMaybeState.selectedCategory === null
					? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
					: 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}"
		>
			<span>All</span>
			{#if totalCount > 0}
				<span class="text-xs text-gray-500 dark:text-gray-400">
					{totalCount}
				</span>
			{/if}
		</button>

		<!-- Category buttons -->
		{#each SOMEDAY_CATEGORIES as category}
			{@const count = getCategoryCount(category)}
			{@const isActive = somedayMaybeState.selectedCategory === category}
			<button
				onclick={() => somedayMaybeState.selectCategory(category)}
				class="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors
					{isActive
						? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
						: 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}"
			>
				<span>{category}</span>
				{#if count > 0}
					<span class="text-xs text-gray-500 dark:text-gray-400">
						{count}
					</span>
				{/if}
			</button>
		{/each}
	</div>

	<!-- Main content area -->
	<div class="flex-1 overflow-auto p-6">
		<!-- Header -->
		<div class="mb-4">
			<h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
				Someday/Maybe
				<span class="ml-2 px-2 py-0.5 text-sm font-normal text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded">
					{somedayMaybeState.filteredCount}
				</span>
			</h2>
			{#if somedayMaybeState.selectedCategory}
				<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
					Filtered by: {somedayMaybeState.selectedCategory}
				</p>
			{/if}
		</div>

		<!-- Inline add form -->
		<form onsubmit={handleAddItem} class="mb-6">
			<div class="flex gap-2">
				<input
					type="text"
					bind:value={newItemTitle}
					placeholder="Capture an idea..."
					class="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				/>
				<button
					type="submit"
					disabled={isFormDisabled}
					class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Add
				</button>
			</div>
		</form>

		<!-- Item list -->
		{#if somedayMaybeState.filteredItems.length === 0}
			<!-- Empty state -->
			<div class="text-center py-12">
				<svg
					class="w-16 h-16 mx-auto text-gray-400 mb-4"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.5"
						d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
					/>
				</svg>
				{#if somedayMaybeState.selectedCategory}
					<!-- Category-filtered empty state -->
					<p class="text-gray-500 dark:text-gray-400 mb-2">
						No items in {somedayMaybeState.selectedCategory}
					</p>
					<p class="text-sm text-gray-400 dark:text-gray-500">
						Add items above or categorize existing ones from the All view.
					</p>
				{:else}
					<!-- All view empty state -->
					<p class="text-gray-500 dark:text-gray-400 mb-2">
						No someday/maybe ideas yet
					</p>
					<p class="text-sm text-gray-400 dark:text-gray-500 max-w-md mx-auto">
						This is your incubation list. Capture ideas, dreams, and future projects here. Review them during your weekly review to decide what's ready to become active.
					</p>
				{/if}
			</div>
		{:else}
			<!-- Item list -->
			<div class="space-y-2">
				{#each somedayMaybeState.filteredItems as item (item.id)}
					<SomedayMaybeItem
						{item}
						isExpanded={somedayMaybeState.expandedId === item.id}
						onToggleExpand={() => somedayMaybeState.expandItem(item.id)}
						onChanged={() => somedayMaybeState.loadItems()}
					/>
				{/each}
			</div>
		{/if}
	</div>
</div>
