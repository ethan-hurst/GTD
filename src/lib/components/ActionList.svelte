<script lang="ts">
	import { dndzone } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import toast from 'svelte-5-french-toast';
	import { actionState } from '$lib/stores/actions.svelte';
	import { completeAction, reorderActions, bulkCompleteActions } from '$lib/db/operations';
	import ActionItem from './ActionItem.svelte';
	import ActionDetailPanel from './ActionDetailPanel.svelte';
	import type { GTDItem } from '$lib/db/schema';

	// Local state for drag-and-drop
	let dragItems = $state<GTDItem[]>([]);

	// Keep dragItems in sync with actionState.items
	$effect(() => {
		dragItems = [...actionState.items];
	});

	// Track undo functions for toasts
	let undoFunctions = new Map<number, () => Promise<void>>();

	async function handleDndConsider(e: CustomEvent) {
		dragItems = e.detail.items;
	}

	async function handleDndFinalize(e: CustomEvent) {
		dragItems = e.detail.items;
		// Persist new order
		await reorderActions(dragItems.map(item => item.id));
		await actionState.loadActions();
	}

	async function handleComplete(id: number) {
		const item = actionState.items.find(i => i.id === id);
		if (!item) return;

		// Call completeAction and get undo function
		const undo = await completeAction(id);
		undoFunctions.set(id, undo);

		// Create custom toast with undo button
		const toastId = toast.success(
			`"${item.title}" completed`,
			{
				duration: 5000,
			}
		);

		// Wait 1 second for animation, then reload
		setTimeout(async () => {
			await actionState.loadActions();
			// Clean up undo function after animation + toast duration
			setTimeout(() => {
				undoFunctions.delete(id);
			}, 5000);
		}, 1000);
	}

	async function handleUndo(id: number) {
		const undo = undoFunctions.get(id);
		if (!undo) return;

		await undo();
		undoFunctions.delete(id);
		await actionState.loadActions();
	}

	async function handleBulkComplete() {
		if (actionState.selectedIds.length === 0) return;

		const count = actionState.selectedIds.length;
		const ids = [...actionState.selectedIds];

		// Bulk complete
		const undo = await bulkCompleteActions(ids);

		// Show single toast for batch
		toast.success(
			`${count} action${count > 1 ? 's' : ''} completed`,
			{
				duration: 5000,
			}
		);

		// Clear selection
		actionState.clearSelection();

		// Reload after brief delay
		setTimeout(async () => {
			await actionState.loadActions();
		}, 1000);
	}

	// Group actions by context for "All" view
	function groupByContext(items: GTDItem[]): Map<string, GTDItem[]> {
		const groups = new Map<string, GTDItem[]>();

		for (const item of items) {
			const context = item.context || 'No context';
			if (!groups.has(context)) {
				groups.set(context, []);
			}
			groups.get(context)!.push(item);
		}

		return groups;
	}

	const contextGroups = $derived(
		actionState.isAllView ? groupByContext(actionState.items) : new Map()
	);

	const viewTitle = $derived(
		actionState.isAllView
			? 'All Actions'
			: actionState.selectedContexts.length === 1
				? actionState.selectedContexts[0]
				: `${actionState.selectedContexts.length} contexts`
	);
</script>

<div class="flex-1 overflow-auto p-6">
	<!-- Header -->
	<div class="mb-4 flex items-center justify-between">
		<div>
			<h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
				{viewTitle}
			</h2>
			<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
				{actionState.itemCount} action{actionState.itemCount !== 1 ? 's' : ''}
			</p>
		</div>

		<!-- Bulk actions -->
		{#if actionState.selectedIds.length > 0}
			<div class="flex items-center gap-2">
				<span class="text-sm text-gray-600 dark:text-gray-400">
					{actionState.selectedIds.length} selected
				</span>
				<button
					onclick={handleBulkComplete}
					class="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
				>
					Complete selected
				</button>
				<button
					onclick={() => actionState.clearSelection()}
					class="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
				>
					Clear
				</button>
			</div>
		{/if}
	</div>

	<!-- Empty state -->
	{#if actionState.items.length === 0}
		<div class="text-center py-12">
			{#if actionState.isAllView}
				<p class="text-gray-500 dark:text-gray-400">
					No next actions yet. <a href="/" class="text-blue-600 dark:text-blue-400 hover:underline">Process your inbox</a> to create actions.
				</p>
			{:else}
				<p class="text-gray-500 dark:text-gray-400">
					No actions for {actionState.selectedContexts.join(', ')}. <a href="/" class="text-blue-600 dark:text-blue-400 hover:underline">Switch contexts or process your inbox.</a>
				</p>
			{/if}
		</div>
	{:else if actionState.isAllView}
		<!-- All view with context grouping -->
		<div class="space-y-6">
			{#each [...contextGroups.entries()] as [contextName, items] (contextName)}
				<div>
					<h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 px-2">
						{contextName}
						<span class="text-gray-400 font-normal">({items.length})</span>
					</h3>
					<div class="space-y-1">
						{#each items as item (item.id)}
							<div>
								<ActionItem
									{item}
									onComplete={handleComplete}
									onExpand={(id) => actionState.expandItem(id)}
									isExpanded={actionState.expandedId === item.id}
									isSelected={actionState.selectedIds.includes(item.id)}
									onToggleSelect={(id) => actionState.toggleSelection(id)}
								/>
								{#if actionState.expandedId === item.id}
									<ActionDetailPanel
										{item}
										onSave={async () => { await actionState.loadActions(); }}
										onClose={() => actionState.expandItem(item.id)}
									/>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<!-- Context-filtered view with drag-and-drop -->
		<section
			use:dndzone={{ items: dragItems, flipDurationMs: 300 }}
			onconsider={handleDndConsider}
			onfinalize={handleDndFinalize}
			class="space-y-1"
		>
			{#each dragItems as item (item.id)}
				<div animate:flip={{ duration: 300 }}>
					<ActionItem
						{item}
						onComplete={handleComplete}
						onExpand={(id) => actionState.expandItem(id)}
						isExpanded={actionState.expandedId === item.id}
						isSelected={actionState.selectedIds.includes(item.id)}
						onToggleSelect={(id) => actionState.toggleSelection(id)}
					/>
					{#if actionState.expandedId === item.id}
						<ActionDetailPanel
							{item}
							onSave={async () => { await actionState.loadActions(); }}
							onClose={() => actionState.expandItem(item.id)}
						/>
					{/if}
				</div>
			{/each}
		</section>
	{/if}
</div>
