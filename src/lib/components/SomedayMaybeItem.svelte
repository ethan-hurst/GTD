<script lang="ts">
	import toast from 'svelte-5-french-toast';
	import { SOMEDAY_CATEGORIES } from '$lib/stores/someday.svelte';
	import { promoteSomedayToActive, updateItem, deleteItem } from '$lib/db/operations';
	import type { GTDItem } from '$lib/db/schema';

	interface Props {
		item: GTDItem;
		isExpanded: boolean;
		onToggleExpand: () => void;
		onChanged: () => void;
	}

	let { item, isExpanded, onToggleExpand, onChanged }: Props = $props();

	// Local state for editing
	let notes = $state(item.notes || '');

	// Keep notes in sync with item
	$effect(() => {
		notes = item.notes || '';
	});

	function formatDate(date: Date): string {
		return new Intl.DateTimeFormat('en-US', {
			dateStyle: 'medium'
		}).format(date);
	}

	async function handlePromoteToProject() {
		await promoteSomedayToActive(item.id, 'project');
		toast.success('Promoted to Projects');
		onChanged();
	}

	async function handlePromoteToAction() {
		await promoteSomedayToActive(item.id, 'next-action');
		toast.success('Promoted to Next Actions');
		onChanged();
	}

	async function handleNotesBlur() {
		if (notes !== item.notes) {
			await updateItem(item.id, { notes });
		}
	}

	async function handleCategoryClick(category: string) {
		// Toggle category: if already set, clear it; otherwise set it
		const newCategory = item.category === category ? undefined : category;
		await updateItem(item.id, { category: newCategory });
		onChanged();
	}

	async function handleDelete() {
		if (confirm(`Delete "${item.title}"?`)) {
			await deleteItem(item.id);
			toast.success('Item deleted');
			onChanged();
		}
	}
</script>

<div
	class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:shadow-sm transition-shadow"
>
	<!-- Main row -->
	<div class="min-h-11 px-4 py-3 flex items-start justify-between gap-2">
		<!-- Left side: title, category, date -->
		<div
			class="flex-1 min-w-0 cursor-pointer active:bg-gray-50 dark:active:bg-gray-800 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset rounded-lg"
			onclick={onToggleExpand}
			role="button"
			tabindex="0"
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					onToggleExpand();
				}
			}}
		>
			<div class="flex items-center gap-2 flex-wrap">
				<h3 class="font-medium text-gray-900 dark:text-gray-100 text-base truncate">
					{item.title}
				</h3>
				<!-- Category badge -->
				{#if item.category}
					<span class="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
						{item.category}
					</span>
				{/if}
			</div>
			<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
				Added: {formatDate(item.created)}
			</p>
		</div>

		<!-- Right side: promote buttons -->
		<div class="flex items-center gap-1 flex-shrink-0">
			<button
				onclick={(e) => {
					e.stopPropagation();
					handlePromoteToProject();
				}}
				class="min-h-11 min-w-11 px-3 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 rounded-md transition-all duration-150 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
				title="Promote to Project"
			>
				<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
				</svg>
				<span class="hidden phablet:inline">Project</span>
			</button>
			<button
				onclick={(e) => {
					e.stopPropagation();
					handlePromoteToAction();
				}}
				class="min-h-11 min-w-11 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded-md transition-all duration-150 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
				title="Promote to Next Action"
			>
				<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
				</svg>
				<span class="hidden phablet:inline">Action</span>
			</button>
		</div>
	</div>

	<!-- Expanded panel -->
	{#if isExpanded}
		<div class="border-t border-gray-200 dark:border-gray-800 px-4 py-4 space-y-4 bg-gray-50 dark:bg-gray-900/50">
			<!-- Notes field -->
			<div>
				<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
					Notes
				</label>
				<textarea
					bind:value={notes}
					onblur={handleNotesBlur}
					placeholder="Add notes or details about this idea..."
					class="w-full px-3 py-2 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y min-h-[80px]"
				/>
			</div>

			<!-- Category selector -->
			<div>
				<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
					Category
				</label>
				<div class="flex flex-wrap gap-2">
					{#each SOMEDAY_CATEGORIES as category}
						<button
							onclick={() => handleCategoryClick(category)}
							class="min-h-11 px-3 py-1.5 text-xs rounded-md transition-colors
								{item.category === category
									? 'bg-blue-500 text-white font-medium'
									: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}"
						>
							{category}
						</button>
					{/each}
				</div>
			</div>

			<!-- Delete button -->
			<div class="flex justify-end pt-2">
				<button
					onclick={handleDelete}
					class="min-h-11 min-w-11 px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors flex items-center gap-1"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
					</svg>
					Delete
				</button>
			</div>
		</div>
	{/if}
</div>
