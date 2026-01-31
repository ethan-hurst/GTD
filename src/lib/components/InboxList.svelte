<script lang="ts">
	import { inboxState } from '../stores/inbox.svelte';
	import { formatRelativeTime } from '../utils/time';
	import { bulkDeleteItems } from '../db/operations';
	import { storageStatus } from '../stores/storage.svelte';
	import { slide } from 'svelte/transition';
	import ProcessingFlow from './ProcessingFlow.svelte';

	async function handleBulkDelete() {
		if (inboxState.selectedIds.length === 0) return;

		await bulkDeleteItems(inboxState.selectedIds);
		storageStatus.recordSave();
		inboxState.clearSelection();
		await inboxState.loadItems();
	}

	function getFirstLineOfNotes(notes: string): string {
		if (!notes) return '';
		const firstLine = notes.split('\n')[0];
		return firstLine.length > 60 ? firstLine.substring(0, 60) + '...' : firstLine;
	}

	// Check if all items are selected
	const allSelected = $derived(
		inboxState.items.length > 0 &&
		inboxState.selectedIds.length === inboxState.items.length
	);
</script>

{#if inboxState.items.length === 0}
	<!-- Empty state handled by parent -->
{:else}
	<!-- Bulk Actions Bar -->
	{#if inboxState.selectedIds.length > 0}
		<div class="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md flex items-center justify-between">
			<span class="text-sm font-medium text-blue-900 dark:text-blue-100">
				{inboxState.selectedIds.length} selected
			</span>
			<div class="flex gap-2">
				{#if !allSelected}
					<button
						onclick={() => inboxState.selectAll()}
						class="px-3 py-1 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-blue-900"
					>
						Select All
					</button>
				{/if}
				<button
					onclick={() => inboxState.clearSelection()}
					class="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-blue-900"
				>
					Deselect
				</button>
				<button
					onclick={handleBulkDelete}
					class="px-3 py-1 text-sm font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-800 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-blue-900"
				>
					Delete
				</button>
			</div>
		</div>
	{/if}

	<!-- Items List -->
	<div class="space-y-2">
		{#each inboxState.items as item (item.id)}
			<div class="{inboxState.expandedId === item.id ? 'border-l-4 border-blue-500 rounded-md' : 'rounded-md'}">
				<div
					class="flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
					onclick={(e) => {
						// Don't expand if clicking checkbox
						if ((e.target as HTMLElement).tagName !== 'INPUT') {
							inboxState.expandItem(item.id);
						}
					}}
				>
					<!-- Checkbox (hidden when expanded or when processing) -->
					{#if inboxState.expandedId !== item.id}
						<input
							type="checkbox"
							checked={inboxState.selectedIds.includes(item.id)}
							onchange={() => inboxState.toggleSelection(item.id)}
							disabled={inboxState.isProcessing}
							class="mt-1 w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
						/>
					{:else}
						<!-- Spacer to maintain alignment when checkbox is hidden -->
						<div class="w-4"></div>
					{/if}

					<!-- Content -->
					<div class="flex-1 min-w-0">
						<div class="flex items-start justify-between gap-2">
							<h3 class="font-medium text-gray-900 dark:text-gray-100 break-words">
								{item.title}
							</h3>
							<span class="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
								{formatRelativeTime(item.created)}
							</span>
						</div>
						{#if item.notes}
							<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
								{getFirstLineOfNotes(item.notes)}
							</p>
						{/if}
					</div>
				</div>

				<!-- Processing Flow (inline expansion) -->
				{#if inboxState.expandedId === item.id}
					<div transition:slide={{ duration: 200 }} class="border-t border-gray-200 dark:border-gray-700">
						<ProcessingFlow
							{item}
							onProcessed={() => inboxState.advanceToNext()}
						/>
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}
