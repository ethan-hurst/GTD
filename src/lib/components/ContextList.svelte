<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { actionState } from '$lib/stores/actions.svelte';
	import { addContext, updateContext, deleteContext } from '$lib/db/operations';
	import toast from 'svelte-5-french-toast';

	let isAddingContext = $state(false);
	let newContextName = $state('');
	let inputElement = $state<HTMLInputElement | undefined>();
	let editingContextId = $state<number | null>(null);
	let editingContextName = $state('');

	onMount(async () => {
		await actionState.loadContexts();
		await actionState.loadActions();
	});

	// Calculate total actions for "All" view
	const totalActionCount = $derived(
		actionState.contexts.reduce((total, ctx) => {
			// Count actions for each context
			const count = actionState.items.filter(
				item => item.context === ctx.name && !item.completedAt
			).length;
			return total + count;
		}, 0)
	);

	function handleAddClick() {
		isAddingContext = true;
		// Focus input after it's rendered
		setTimeout(() => inputElement?.focus(), 50);
	}

	async function handleAddContext() {
		const name = newContextName.trim();
		if (!name) {
			isAddingContext = false;
			return;
		}

		// Auto-prepend @ if not present
		const contextName = name.startsWith('@') ? name : `@${name}`;

		try {
			await addContext(contextName);
			await actionState.loadContexts();
			newContextName = '';
			isAddingContext = false;
		} catch (error) {
			console.error('Failed to add context:', error);
			// Keep form open so user can try again
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			handleAddContext();
		} else if (e.key === 'Escape') {
			newContextName = '';
			isAddingContext = false;
		}
	}

	function getContextActionCount(contextName: string): number {
		return actionState.items.filter(
			item => item.context === contextName && !item.completedAt
		).length;
	}

	function startEditContext(id: number, name: string, e: MouseEvent) {
		e.stopPropagation();
		editingContextId = id;
		editingContextName = name;
	}

	async function saveContextRename() {
		if (!editingContextId || !editingContextName.trim()) {
			editingContextId = null;
			return;
		}

		const name = editingContextName.trim();
		const contextName = name.startsWith('@') ? name : `@${name}`;

		try {
			await updateContext(editingContextId, { name: contextName });
			await actionState.loadContexts();
			await actionState.loadActions();
			toast.success('Context renamed');
			editingContextId = null;
		} catch (error) {
			console.error('Failed to rename context:', error);
			toast.error('Failed to rename context');
		}
	}

	function handleEditKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			saveContextRename();
		} else if (e.key === 'Escape') {
			editingContextId = null;
		}
	}

	async function handleDeleteContext(id: number, name: string, e: MouseEvent) {
		e.stopPropagation();

		if (confirm(`Delete ${name}? Actions will keep their text but lose this filter.`)) {
			try {
				await deleteContext(id);
				await actionState.loadContexts();
				await actionState.loadActions();
				toast.success('Context deleted');
			} catch (error) {
				console.error('Failed to delete context:', error);
				toast.error('Failed to delete context');
			}
		}
	}
</script>

<div class="space-y-1">
	<!-- Header with Add button -->
	<div class="flex items-center justify-between px-4 py-2">
		<span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
			Contexts
		</span>
		<button
			onclick={handleAddClick}
			class="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
			title="Add context"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
		</button>
	</div>

	<!-- All view -->
	<button
		onclick={() => { actionState.showAll(); goto('/actions'); }}
		class="w-full flex items-center justify-between px-4 py-2 rounded-md text-sm font-medium transition-colors
			{actionState.isAllView
				? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
				: 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}"
	>
		<span>All</span>
		{#if totalActionCount > 0}
			<span class="bg-blue-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
				{totalActionCount}
			</span>
		{/if}
	</button>

	<!-- Context items -->
	{#each actionState.contexts as context (context.id)}
		{@const count = getContextActionCount(context.name)}
		{@const isSelected = actionState.selectedContexts.includes(context.name)}
		{@const isEditing = editingContextId === context.id}

		<div class="group relative flex items-center gap-1 w-full">
			{#if isEditing}
				<!-- Inline edit mode -->
				<div class="flex-1 px-4 py-2">
					<input
						bind:value={editingContextName}
						onblur={saveContextRename}
						onkeydown={handleEditKeydown}
						onclick={(e) => e.stopPropagation()}
						class="w-full px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-blue-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
						autofocus
					/>
				</div>
			{:else}
				<!-- Normal display mode -->
				<button
					onclick={() => { actionState.toggleContext(context.name); goto('/actions'); }}
					class="flex-1 flex items-center justify-between px-4 py-2 rounded-md text-sm font-medium transition-colors
						{isSelected
							? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
							: 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}"
				>
					<span>{context.name}</span>
					{#if count > 0}
						<span class="bg-blue-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
							{count}
						</span>
					{/if}
				</button>

				<!-- Edit/Delete icons (visible on hover, outside main button) -->
				<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
					<button
						onclick={(e) => startEditContext(context.id, context.name, e)}
						class="p-1 hover:bg-gray-300 dark:hover:bg-gray-700 rounded transition-colors"
						title="Rename context"
					>
						<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
						</svg>
					</button>
					<button
						onclick={(e) => handleDeleteContext(context.id, context.name, e)}
						class="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
						title="Delete context"
					>
						<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
						</svg>
					</button>
				</div>
			{/if}
		</div>
	{/each}

	<!-- Add context form -->
	{#if isAddingContext}
		<div class="px-4 py-2">
			<input
				bind:this={inputElement}
				bind:value={newContextName}
				onkeydown={handleKeydown}
				onblur={handleAddContext}
				placeholder="Context name"
				class="w-full px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
			/>
		</div>
	{/if}
</div>
