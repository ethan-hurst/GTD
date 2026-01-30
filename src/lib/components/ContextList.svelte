<script lang="ts">
	import { onMount } from 'svelte';
	import { actionState } from '$lib/stores/actions.svelte';
	import { addContext } from '$lib/db/operations';

	let isAddingContext = $state(false);
	let newContextName = $state('');
	let inputElement = $state<HTMLInputElement | undefined>();

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
		onclick={() => actionState.showAll()}
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
		<button
			onclick={() => actionState.toggleContext(context.name)}
			class="w-full flex items-center justify-between px-4 py-2 rounded-md text-sm font-medium transition-colors
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
