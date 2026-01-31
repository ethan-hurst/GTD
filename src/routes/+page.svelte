<script lang="ts">
	import { onMount } from 'svelte';
	import InboxCapture from '$lib/components/InboxCapture.svelte';
	import InboxList from '$lib/components/InboxList.svelte';
	import { inboxState } from '$lib/stores/inbox.svelte';

	onMount(async () => {
		await inboxState.loadItems();
	});
</script>

<div class="max-w-4xl mx-auto p-4 tablet:p-6">
	<!-- Header -->
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
			{#if inboxState.isProcessing}
				Processing Inbox
			{:else}
				Inbox
			{/if}
		</h1>
		<span class="text-sm text-gray-500 dark:text-gray-400 tabular-nums">
			{inboxState.itemCount} {inboxState.itemCount === 1 ? 'item' : 'items'}
		</span>
	</div>

	<!-- Process Inbox Button -->
	{#if inboxState.itemCount > 0 && !inboxState.isProcessing}
		<div class="mb-6">
			<button
				onclick={() => inboxState.startProcessing()}
				class="w-full min-h-11 px-4 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg shadow-sm hover:shadow-md active:scale-[0.99] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
			>
				Process Inbox ({inboxState.itemCount})
			</button>
		</div>
	{/if}

	<!-- Stop Processing Button -->
	{#if inboxState.isProcessing}
		<div class="mb-6">
			<button
				onclick={() => { inboxState.isProcessing = false; inboxState.expandedId = null; }}
				class="w-full min-h-11 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg shadow-sm hover:shadow-md active:scale-[0.99] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
			>
				Stop Processing
			</button>
		</div>
	{/if}

	<!-- Capture Input (hidden during processing) -->
	{#if !inboxState.isProcessing}
		<InboxCapture />
	{/if}

	<!-- Item List or Empty State -->
	{#if inboxState.itemCount > 0}
		<InboxList />
	{:else}
		<!-- Empty State (Inbox Zero) -->
		<div class="text-center py-16">
			<div class="mb-6 inline-flex items-center justify-center w-20 h-20 bg-green-50 dark:bg-green-900/20 rounded-full">
				<svg class="w-10 h-10 text-green-500 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
				</svg>
			</div>
			<h2 class="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
				Your inbox is clear
			</h2>
			<p class="text-sm text-gray-500 dark:text-gray-500">
				Capture something with the input above
			</p>
		</div>
	{/if}
</div>
