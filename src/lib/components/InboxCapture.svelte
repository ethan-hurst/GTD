<script lang="ts">
	import { tick } from 'svelte';
	import { addItem } from '../db/operations';
	import { inboxState } from '../stores/inbox.svelte';
	import { storageStatus } from '../stores/storage.svelte';

	let title = $state('');
	let inputEl: HTMLInputElement;
	let showFlash = $state(false);

	async function handleSubmit(event: Event) {
		event.preventDefault();

		const trimmedTitle = title.trim();
		if (!trimmedTitle) return;

		// Add item to database
		await addItem({
			title: trimmedTitle,
			type: 'inbox',
			notes: ''
		});

		// Update storage status
		storageStatus.recordSave();

		// Clear input and show flash
		title = '';
		showFlash = true;
		setTimeout(() => {
			showFlash = false;
		}, 1500);

		// Maintain focus and reload items
		await tick();
		inputEl.focus();
		await inboxState.loadItems();
	}
</script>

<div class="mb-6">
	<form onsubmit={handleSubmit}>
		<input
			bind:this={inputEl}
			bind:value={title}
			type="text"
			placeholder="What's on your mind?"
			autofocus
			class="w-full px-4 py-3 rounded-md border border-gray-300 dark:border-gray-700
				bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
				focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
				transition-colors text-sm"
		/>
	</form>
	<div class="mt-2 flex items-center justify-between">
		<p class="text-xs text-gray-400">Press Enter to capture</p>
		{#if showFlash}
			<p class="text-xs text-green-500 font-medium animate-pulse">Captured!</p>
		{/if}
	</div>
</div>
