<script lang="ts">
	import toast from 'svelte-5-french-toast';
	import { waitingForState } from '$lib/stores/waiting.svelte';
	import { addWaitingFor } from '$lib/db/operations';
	import WaitingForItem from './WaitingForItem.svelte';

	// Local state for create form
	let newTitle = $state('');
	let newPerson = $state('');
	let newFollowUpDate = $state('');

	async function handleAdd(e: Event) {
		e.preventDefault();

		const trimmedTitle = newTitle.trim();
		const trimmedPerson = newPerson.trim();
		if (!trimmedTitle || !trimmedPerson) return;

		const followUpDate = newFollowUpDate ? new Date(newFollowUpDate) : undefined;

		await addWaitingFor(trimmedTitle, trimmedPerson, followUpDate);

		// Clear form
		newTitle = '';
		newPerson = '';
		newFollowUpDate = '';

		await waitingForState.loadItems();
		toast.success('Added to Waiting For');
	}

	const isFormDisabled = $derived(!newTitle.trim() || !newPerson.trim());
</script>

<div class="p-6 max-w-4xl mx-auto">
	<!-- Header -->
	<div class="mb-4">
		<h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
			Waiting For
			<span class="ml-2 px-2 py-0.5 text-sm font-normal text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded tabular-nums">
				{waitingForState.itemCount} items
			</span>
		</h2>

		<!-- Overdue count indicator -->
		{#if waitingForState.overdueCount > 0}
			<p class="text-sm text-red-600 dark:text-red-400 mt-1 font-medium">
				{waitingForState.overdueCount} overdue
			</p>
		{/if}
	</div>

	<!-- Inline add form -->
	<form onsubmit={handleAdd} class="mb-6 space-y-3">
		<div class="flex gap-2">
			<input
				type="text"
				bind:value={newTitle}
				placeholder="What are you waiting for?"
				class="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
			/>
			<input
				type="text"
				bind:value={newPerson}
				placeholder="Who from?"
				class="w-48 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
			/>
		</div>
		<div class="flex gap-2">
			<input
				type="date"
				bind:value={newFollowUpDate}
				class="w-48 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
			/>
			<label class="flex items-center text-sm text-gray-600 dark:text-gray-400">
				Follow up by (optional)
			</label>
			<div class="flex-1"></div>
			<button
				type="submit"
				disabled={isFormDisabled}
				class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
			>
				Add
			</button>
		</div>
	</form>

	<!-- Item list -->
	{#if waitingForState.items.length === 0}
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
					d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
			<p class="text-gray-500 dark:text-gray-400 mb-2">
				No waiting-for items yet
			</p>
			<p class="text-sm text-gray-400 dark:text-gray-500 max-w-md mx-auto">
				When you delegate a task or are waiting on someone, add it here.
				Use inbox processing to delegate items, or add directly above.
			</p>
		</div>
	{:else}
		<!-- Waiting-for items -->
		<div class="space-y-2">
			{#each waitingForState.items as item (item.id)}
				<WaitingForItem
					{item}
					isOverdue={waitingForState.isOverdue(item.id)}
					isExpanded={waitingForState.expandedId === item.id}
					onToggleExpand={() => waitingForState.expandItem(item.id)}
					onResolved={() => waitingForState.loadItems()}
				/>
			{/each}
		</div>
	{/if}
</div>
