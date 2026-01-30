<script lang="ts">
	import { slide } from 'svelte/transition';
	import toast from 'svelte-5-french-toast';
	import { updateItem, deleteItem } from '$lib/db/operations';
	import { actionState } from '$lib/stores/actions.svelte';
	import type { GTDItem } from '$lib/db/schema';

	interface ActionDetailPanelProps {
		item: GTDItem;
		onSave: () => void;
		onClose: () => void;
	}

	let { item, onSave, onClose }: ActionDetailPanelProps = $props();

	// Local state for editable fields
	let title = $state(item.title);
	let notes = $state(item.notes || '');
	let context = $state(item.context || '');
	let projectId = $state(item.projectId?.toString() || '');

	// Keep local state in sync with item prop
	$effect(() => {
		title = item.title;
		notes = item.notes || '';
		context = item.context || '';
		projectId = item.projectId?.toString() || '';
	});

	async function handleSave() {
		const updates: Partial<GTDItem> = {
			title: title.trim(),
			notes: notes.trim() || undefined,
			context: context || undefined,
			projectId: projectId ? parseInt(projectId) : undefined
		};

		await updateItem(item.id, updates);
		toast.success('Action updated');
		onSave();
	}

	async function handleContextChange() {
		// Auto-save context changes
		await updateItem(item.id, {
			context: context || undefined
		});
		toast.success('Context updated');
		onSave();
	}

	async function handleDelete() {
		if (confirm('Delete this action?')) {
			await deleteItem(item.id);
			toast.success('Action deleted');
			onSave();
		}
	}

	function formatDate(date: Date): string {
		return new Intl.DateTimeFormat('en-US', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(date);
	}
</script>

<div
	class="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-b-lg border-t border-gray-200 dark:border-gray-700"
	transition:slide={{ duration: 200 }}
>
	<!-- Header with close button -->
	<div class="flex items-center justify-between mb-4">
		<h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
			Action Details
		</h4>
		<button
			onclick={onClose}
			class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
			title="Close"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
	</div>

	<!-- Editable fields -->
	<div class="space-y-4">
		<!-- Title -->
		<div>
			<label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
				Title
			</label>
			<input
				type="text"
				bind:value={title}
				class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
			/>
		</div>

		<!-- Notes -->
		<div>
			<label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
				Notes
			</label>
			<textarea
				bind:value={notes}
				rows="3"
				class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
				placeholder="Add notes..."
			></textarea>
		</div>

		<!-- Context -->
		<div>
			<label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
				Context
			</label>
			<select
				bind:value={context}
				onchange={handleContextChange}
				class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
			>
				<option value="">No context</option>
				{#each actionState.contexts as ctx (ctx.id)}
					<option value={ctx.name}>{ctx.name}</option>
				{/each}
			</select>
		</div>

		<!-- Project ID (placeholder for Phase 4) -->
		<div>
			<label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
				Project ID (optional)
			</label>
			<input
				type="number"
				bind:value={projectId}
				placeholder="Will be searchable dropdown in Phase 4"
				class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
			/>
		</div>

		<!-- Metadata (read-only) -->
		<div class="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
			<div>
				<span class="font-medium">Created:</span>
				{formatDate(item.created)}
			</div>
			<div>
				<span class="font-medium">Modified:</span>
				{formatDate(item.modified)}
			</div>
		</div>

		<!-- Action buttons -->
		<div class="flex items-center gap-2 pt-2">
			<button
				onclick={handleSave}
				class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md transition-colors"
			>
				Save
			</button>
			<button
				onclick={handleDelete}
				class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 rounded-md transition-colors"
			>
				Delete
			</button>
		</div>
	</div>
</div>
