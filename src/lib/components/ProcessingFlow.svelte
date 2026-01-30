<script lang="ts">
	import type { GTDItem } from '../db/schema';
	import { updateItem, deleteItem } from '../db/operations';
	import { storageStatus } from '../stores/storage.svelte';
	import { toast } from 'svelte-5-french-toast';

	interface ProcessingFlowProps {
		item: GTDItem;
		onProcessed: () => void;
	}

	let { item, onProcessed }: ProcessingFlowProps = $props();

	type Step = 'actionable' | 'two-minute' | 'not-actionable' | 'delegate-or-defer' | 'delegate-input';
	let step = $state<Step>('actionable');
	let delegateName = $state('');

	// Step indicators
	const stepIndicators = {
		'actionable': 'Step 1 of 3',
		'two-minute': 'Step 2 of 3',
		'not-actionable': 'Step 2 of 3',
		'delegate-or-defer': 'Step 3 of 3',
		'delegate-input': 'Step 3 of 3'
	};

	// Navigation
	function goBack() {
		if (step === 'two-minute' || step === 'not-actionable') {
			step = 'actionable';
		} else if (step === 'delegate-or-defer') {
			step = 'two-minute';
		} else if (step === 'delegate-input') {
			step = 'delegate-or-defer';
		}
	}

	// Actions
	async function doNow() {
		await deleteItem(item.id);
		storageStatus.recordSave();
		toast.success('Done! Item completed.');
		onProcessed();
	}

	async function trash() {
		await deleteItem(item.id);
		storageStatus.recordSave();
		toast.success('Trashed.');
		onProcessed();
	}

	async function someday() {
		await updateItem(item.id, { type: 'someday' });
		storageStatus.recordSave();
		toast.success('Moved to Someday/Maybe.');
		onProcessed();
	}

	async function reference() {
		// TODO Phase 5+: implement reference material category
		await updateItem(item.id, { type: 'someday' });
		storageStatus.recordSave();
		toast.success('Saved for reference.');
		onProcessed();
	}

	async function nextAction() {
		await updateItem(item.id, { type: 'next-action' });
		storageStatus.recordSave();
		toast.success('Added to Next Actions.');
		onProcessed();
	}

	async function project() {
		// Project assignment comes in Phase 4
		await updateItem(item.id, { type: 'next-action' });
		storageStatus.recordSave();
		toast.success('Added to Next Actions.');
		onProcessed();
	}

	async function delegate() {
		if (!delegateName.trim()) return;
		await updateItem(item.id, { type: 'waiting', delegatedTo: delegateName.trim() });
		storageStatus.recordSave();
		toast.success('Moved to Waiting For.');
		onProcessed();
	}
</script>

<div class="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-b-lg">
	<!-- Step Indicator -->
	<div class="text-xs text-gray-500 dark:text-gray-400 mb-3">
		{stepIndicators[step]}
	</div>

	<!-- Item Display -->
	<div class="mb-4">
		<h3 class="font-medium text-gray-900 dark:text-gray-100 mb-1">
			{item.title}
		</h3>
		{#if item.notes}
			<p class="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
				{item.notes}
			</p>
		{/if}
	</div>

	<!-- Step 1: Is this actionable? -->
	{#if step === 'actionable'}
		<div class="mb-4">
			<p class="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
				Is this actionable?
			</p>
			<div class="flex flex-col gap-2">
				<button
					onclick={() => step = 'two-minute'}
					class="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md transition-colors"
				>
					Yes, it's actionable
				</button>
				<button
					onclick={() => step = 'not-actionable'}
					class="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-md transition-colors"
				>
					No, not actionable
				</button>
			</div>
		</div>
	{/if}

	<!-- Step 2a: Can you do it in under 2 minutes? -->
	{#if step === 'two-minute'}
		<div class="mb-4">
			<p class="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
				Can you do it in under 2 minutes?
			</p>
			<div class="flex flex-col gap-2">
				<button
					onclick={doNow}
					class="px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 rounded-md transition-colors"
				>
					Yes, do it now
				</button>
				<button
					onclick={() => step = 'delegate-or-defer'}
					class="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-md transition-colors"
				>
					No, it takes longer
				</button>
			</div>
		</div>
		<button
			onclick={goBack}
			class="text-xs text-blue-600 dark:text-blue-400 hover:underline"
		>
			← Back
		</button>
	{/if}

	<!-- Step 2b: What do you want to do with it? (not actionable) -->
	{#if step === 'not-actionable'}
		<div class="mb-4">
			<p class="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
				What do you want to do with it?
			</p>
			<div class="flex flex-col gap-2">
				<button
					onclick={trash}
					class="px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 rounded-md transition-colors"
				>
					Trash it
				</button>
				<button
					onclick={someday}
					class="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-md transition-colors"
				>
					Someday/Maybe
				</button>
				<button
					onclick={reference}
					class="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-md transition-colors"
				>
					Keep as Reference
				</button>
			</div>
		</div>
		<button
			onclick={goBack}
			class="text-xs text-blue-600 dark:text-blue-400 hover:underline"
		>
			← Back
		</button>
	{/if}

	<!-- Step 3: Delegate or defer? -->
	{#if step === 'delegate-or-defer'}
		<div class="mb-4">
			<p class="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
				Delegate or defer?
			</p>
			<div class="flex flex-col gap-2">
				<button
					onclick={() => step = 'delegate-input'}
					class="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-md transition-colors"
				>
					Delegate to someone
				</button>
				<button
					onclick={nextAction}
					class="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md transition-colors"
				>
					I'll do it next
				</button>
				<button
					onclick={project}
					class="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-md transition-colors"
				>
					It's part of a project
				</button>
			</div>
		</div>
		<button
			onclick={goBack}
			class="text-xs text-blue-600 dark:text-blue-400 hover:underline"
		>
			← Back
		</button>
	{/if}

	<!-- Delegate Input -->
	{#if step === 'delegate-input'}
		<div class="mb-4">
			<p class="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
				Who are you delegating to?
			</p>
			<form onsubmit={(e) => { e.preventDefault(); delegate(); }} class="flex flex-col gap-2">
				<input
					type="text"
					bind:value={delegateName}
					placeholder="Name or email"
					class="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					autofocus
				/>
				<button
					type="submit"
					disabled={!delegateName.trim()}
					class="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
				>
					Delegate
				</button>
			</form>
		</div>
		<button
			onclick={goBack}
			class="text-xs text-blue-600 dark:text-blue-400 hover:underline"
		>
			← Back
		</button>
	{/if}
</div>
