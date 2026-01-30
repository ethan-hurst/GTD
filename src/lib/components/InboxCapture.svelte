<script lang="ts">
	import { tick, onMount } from 'svelte';
	import toast from 'svelte-5-french-toast';
	import { addItem } from '../db/operations';
	import { inboxState } from '../stores/inbox.svelte';
	import { storageStatus } from '../stores/storage.svelte';

	let title = $state('');
	let inputEl: HTMLInputElement;

	onMount(() => {
		function handleFocusCapture() {
			inputEl?.focus();
		}
		window.addEventListener('focus-inbox-capture', handleFocusCapture);
		return () => window.removeEventListener('focus-inbox-capture', handleFocusCapture);
	});

	async function handleSubmit(event: Event) {
		event.preventDefault();

		const trimmedTitle = title.trim();
		if (!trimmedTitle) return;

		try {
			// Add item to database
			await addItem({
				title: trimmedTitle,
				type: 'inbox',
				notes: ''
			});

			// Update storage status
			storageStatus.recordSave();

			// Clear input and show toast
			title = '';
			toast.success('Captured', { duration: 1500 });

			// Maintain focus and reload items
			await tick();
			inputEl.focus();
			await inboxState.loadItems();
		} catch {
			toast.error('Failed to capture item. Please try again.');
		}
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
	<div class="mt-2">
		<p class="text-xs text-gray-400">Press Enter to capture · Press <kbd>/</kbd> from anywhere to focus</p>
	</div>
</div>
