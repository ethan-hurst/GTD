<script lang="ts">
	import { inboxState } from '../stores/inbox.svelte';
	import { formatRelativeTime } from '../utils/time';
	import { bulkDeleteItems, deleteItem } from '../db/operations';
	import { storageStatus } from '../stores/storage.svelte';
	import { slide } from 'svelte/transition';
	import { usePan, type PanCustomEvent, type GestureCustomEvent } from 'svelte-gestures';
	import { mobileState } from '../stores/mobile.svelte';
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

	// Swipe gesture state per item (using Map to track by item ID)
	let swipeOffsets = $state(new Map<number, number>());
	let revealingItems = $state(new Set<number>());
	const SWIPE_THRESHOLD = 80;

	function createPanHandlers(itemId: number) {
		function handlePan(event: PanCustomEvent) {
			if (!mobileState.isMobile) return;
			const offset = Math.max(-120, Math.min(120, event.detail.x));
			swipeOffsets.set(itemId, offset);
			if (Math.abs(offset) > 20) {
				revealingItems.add(itemId);
			} else {
				revealingItems.delete(itemId);
			}
			// Force reactivity
			swipeOffsets = new Map(swipeOffsets);
			revealingItems = new Set(revealingItems);
		}

		function handlePanUp(event: GestureCustomEvent) {
			if (!mobileState.isMobile) {
				swipeOffsets.delete(itemId);
				revealingItems.delete(itemId);
				swipeOffsets = new Map(swipeOffsets);
				revealingItems = new Set(revealingItems);
				return;
			}

			const offset = swipeOffsets.get(itemId) ?? 0;
			if (offset > SWIPE_THRESHOLD) {
				// Swipe right: start processing
				inboxState.expandItem(itemId);
			} else if (offset < -SWIPE_THRESHOLD) {
				// Swipe left: delete
				deleteItem(itemId);
				storageStatus.recordSave();
				inboxState.loadItems();
			}
			swipeOffsets.delete(itemId);
			revealingItems.delete(itemId);
			swipeOffsets = new Map(swipeOffsets);
			revealingItems = new Set(revealingItems);
		}

		return usePan(handlePan, () => ({ delay: 0, touchAction: 'pan-y' }), { onpanup: handlePanUp });
	}
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
						class="min-h-11 min-w-11 px-3 py-1 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-blue-900"
					>
						Select All
					</button>
				{/if}
				<button
					onclick={() => inboxState.clearSelection()}
					class="min-h-11 min-w-11 px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-blue-900"
				>
					Deselect
				</button>
				<button
					onclick={handleBulkDelete}
					class="min-h-11 min-w-11 px-3 py-1 text-sm font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-800 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-blue-900"
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
				<div class="relative overflow-hidden rounded-md">
					<!-- Revealed action backgrounds -->
					{#if revealingItems.has(item.id) && mobileState.isMobile}
						<div class="absolute inset-y-0 left-0 w-full flex items-center px-4 bg-blue-500 text-white z-0">
							<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
							</svg>
							<span class="ml-2 text-sm font-medium">Process</span>
						</div>
						<div class="absolute inset-y-0 right-0 w-full flex items-center justify-end px-4 bg-red-500 text-white z-0">
							<span class="mr-2 text-sm font-medium">Delete</span>
							<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
							</svg>
						</div>
					{/if}

					<!-- Main item content (slides) -->
					<div
						{...createPanHandlers(item.id)}
						style="transform: translateX({mobileState.isMobile ? (swipeOffsets.get(item.id) ?? 0) : 0}px); transition: {revealingItems.has(item.id) ? 'none' : 'transform 0.2s ease-out'};"
						class="relative z-10 bg-white dark:bg-gray-950 flex items-start gap-3 min-h-11 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 active:bg-gray-50 dark:active:bg-gray-800 transition-colors cursor-pointer"
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
