<script lang="ts">
	import { tick, onMount } from 'svelte';
	import toast from 'svelte-5-french-toast';
	import { addItem } from '../db/operations';
	import { inboxState } from '../stores/inbox.svelte';
	import { storageStatus } from '../stores/storage.svelte';
	import { analytics } from '$lib/analytics/events';

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

			// Track task creation (activation event)
			analytics.taskCreated('inbox');

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
			class="w-full min-h-11 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700
				bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
				shadow-sm focus:shadow-md
				focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
				transition-all duration-200 text-base"
		/>
	</form>
	<div class="mt-2">
		<p class="text-xs text-gray-400">Press Enter to capture · Press <kbd class="px-1.5 py-0.5 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">/</kbd> from anywhere to focus</p>
	</div>
</div>
