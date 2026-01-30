<script lang="ts">
	import { searchItems } from '../db/search';
	import type { GTDItem } from '../db/schema';

	let query = $state('');
	let results = $state<GTDItem[]>([]);
	let isOpen = $state(false);
	let selectedIndex = $state(-1);
	let searchEl: HTMLInputElement;

	// Perform search and update results
	async function performSearch(searchQuery: string) {
		if (!searchQuery.trim()) {
			results = [];
			isOpen = false;
			return;
		}

		try {
			const items = await searchItems(searchQuery);
			results = items;
			isOpen = items.length > 0;
			selectedIndex = -1;
		} catch {
			results = [];
			isOpen = false;
		}
	}

	// Effect to trigger search when query changes
	$effect(() => {
		const q = query;
		if (q.length > 0) {
			const timeout = setTimeout(() => performSearch(q), 300);
			return () => clearTimeout(timeout);
		} else {
			results = [];
			isOpen = false;
			selectedIndex = -1;
		}
	});

	// Handle keyboard navigation
	function handleKeydown(event: KeyboardEvent) {
		if (!isOpen || results.length === 0) {
			if (event.key === 'Escape') {
				close();
			}
			return;
		}

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				selectedIndex = selectedIndex < results.length - 1 ? selectedIndex + 1 : 0;
				break;
			case 'ArrowUp':
				event.preventDefault();
				selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : results.length - 1;
				break;
			case 'Enter':
				event.preventDefault();
				if (selectedIndex >= 0) {
					navigateToItem(results[selectedIndex]);
				}
				break;
			case 'Escape':
				event.preventDefault();
				close();
				break;
		}
	}

	// Navigate to item
	function navigateToItem(item: GTDItem) {
		const typeRoutes: Record<GTDItem['type'], string> = {
			'inbox': '/',
			'next-action': '/actions',
			'project': '/projects',
			'waiting': '/waiting',
			'someday': '/someday'
		};
		window.location.href = typeRoutes[item.type] ?? '/';
		close();
	}

	// Close dropdown and clear
	function close() {
		isOpen = false;
		query = '';
		results = [];
		selectedIndex = -1;
		searchEl?.blur();
	}

	// Close on backdrop click
	function handleBackdropClick() {
		close();
	}

	// Public API for external focus
	export function focus() {
		searchEl?.focus();
	}

	// Get badge color for item type
	function getTypeBadgeClass(type: GTDItem['type']): string {
		switch (type) {
			case 'inbox':
				return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
			case 'next-action':
				return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
			case 'project':
				return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
			case 'waiting':
				return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';
			default:
				return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
		}
	}

	// Format type display name
	function getTypeDisplayName(type: GTDItem['type']): string {
		switch (type) {
			case 'inbox':
				return 'Inbox';
			case 'next-action':
				return 'Next Action';
			case 'project':
				return 'Project';
			case 'waiting':
				return 'Waiting';
			default:
				return type;
		}
	}

	// Truncate note preview
	function getNotePreview(notes: string): string {
		if (!notes) return '';
		return notes.length > 60 ? notes.slice(0, 60) + '...' : notes;
	}
</script>

<!-- Backdrop for closing on outside click -->
{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-40"
		onclick={handleBackdropClick}
		aria-hidden="true"
	></div>
{/if}

<div class="relative">
	<!-- Search Input -->
	<div class="relative">
		<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
			<svg
				class="h-4 w-4 text-gray-400"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
				/>
			</svg>
		</div>
		<input
			bind:this={searchEl}
			bind:value={query}
			onkeydown={handleKeydown}
			type="text"
			placeholder="Search... (Cmd+K)"
			class="w-full bg-gray-100 dark:bg-gray-800 border-0 rounded-md pl-10 pr-3 py-1.5
				text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500
				focus:bg-white dark:focus:bg-gray-700 transition-colors"
		/>
	</div>

	<!-- Results Dropdown -->
	{#if isOpen && results.length > 0}
		<div
			class="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800
				shadow-lg border border-gray-200 dark:border-gray-700 rounded-md
				max-h-80 overflow-y-auto z-50"
		>
			{#each results as item, index}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="px-4 py-3 cursor-pointer border-b border-gray-100 dark:border-gray-700
						last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700
						{selectedIndex === index ? 'bg-gray-100 dark:bg-gray-700' : ''}"
					onclick={() => navigateToItem(item)}
				>
					<div class="flex items-center gap-2 mb-1">
						<span class="font-medium text-sm text-gray-900 dark:text-gray-100">
							{item.title}
						</span>
						<span
							class="px-2 py-0.5 rounded-full text-xs font-medium {getTypeBadgeClass(item.type)}"
						>
							{getTypeDisplayName(item.type)}
						</span>
					</div>
					{#if item.notes}
						<p class="text-xs text-gray-500 dark:text-gray-400 truncate">
							{getNotePreview(item.notes)}
						</p>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>