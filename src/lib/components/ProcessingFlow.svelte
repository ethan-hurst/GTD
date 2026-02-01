<script lang="ts">
	import { onMount } from 'svelte';
	import type { GTDItem, Context } from '../db/schema';
	import { updateItem, deleteItem, getAllContexts, getAllProjects, addProject, addEvent } from '../db/operations';
	import { storageStatus } from '../stores/storage.svelte';
	import { toast } from 'svelte-5-french-toast';
	import { analytics } from '$lib/analytics/events';

	interface ProcessingFlowProps {
		item: GTDItem;
		onProcessed: () => void;
	}

	let { item, onProcessed }: ProcessingFlowProps = $props();

	type Step = 'actionable' | 'two-minute' | 'not-actionable' | 'delegate-or-defer' | 'delegate-input' | 'assign-context' | 'select-project' | 'schedule-event';
	let step = $state<Step>('actionable');
	let delegateName = $state('');
	let followUpDateStr = $state('');
	let eventStartTime = $state('');
	let eventEndTime = $state('');
	let contexts = $state<Context[]>([]);
	let projects = $state<GTDItem[]>([]);
	let selectedProjectId = $state<string | undefined>(undefined);
	let newProjectTitle = $state('');
	let afterContext: 'nextAction' | 'project' | null = null;

	// Step indicators
	const stepIndicators = {
		'actionable': 'Step 1 of 3',
		'two-minute': 'Step 2 of 3',
		'not-actionable': 'Step 2 of 3',
		'delegate-or-defer': 'Step 3 of 3',
		'delegate-input': 'Step 3 of 3',
		'select-project': 'Select Project',
		'assign-context': 'Choose Context',
		'schedule-event': 'Schedule Event'
	};

	onMount(async () => {
		contexts = await getAllContexts();
	});

	// Navigation
	function goBack() {
		if (step === 'two-minute' || step === 'not-actionable') {
			step = 'actionable';
		} else if (step === 'delegate-or-defer') {
			step = 'two-minute';
		} else if (step === 'delegate-input') {
			step = 'delegate-or-defer';
		} else if (step === 'select-project') {
			step = 'delegate-or-defer';
		} else if (step === 'schedule-event') {
			step = 'delegate-or-defer';
		} else if (step === 'assign-context') {
			if (afterContext === 'project') {
				step = 'select-project';
			} else {
				step = 'delegate-or-defer';
			}
		}
	}

	// Actions
	async function doNow() {
		await deleteItem(item.id);
		storageStatus.recordSave();
		analytics.taskCompleted();
		toast.success('Done! Item completed.');
		onProcessed();
	}

	async function trash() {
		await deleteItem(item.id);
		storageStatus.recordSave();
		analytics.taskDeleted();
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
		// Reference items stored as someday type
		await updateItem(item.id, { type: 'someday' });
		storageStatus.recordSave();
		toast.success('Saved for reference.');
		onProcessed();
	}

	async function nextAction(context?: string) {
		await updateItem(item.id, { type: 'next-action', context });
		storageStatus.recordSave();
		toast.success('Added to Next Actions.');
		onProcessed();
	}

	async function project(context?: string) {
		await updateItem(item.id, { type: 'next-action', context, projectId: selectedProjectId });
		storageStatus.recordSave();
		toast.success(selectedProjectId ? 'Added to project as next action.' : 'Added to Next Actions.');
		onProcessed();
	}

	function initiateNextAction() {
		afterContext = 'nextAction';
		step = 'assign-context';
	}

	async function initiateProject() {
		projects = await getAllProjects();
		step = 'select-project';
	}

	async function assignContextAndSave(contextName?: string) {
		if (afterContext === 'nextAction') {
			await nextAction(contextName);
		} else if (afterContext === 'project') {
			await project(contextName);
		}
	}

	async function delegate() {
		if (!delegateName.trim()) return;
		const followUpDate = followUpDateStr ? new Date(followUpDateStr) : undefined;
		await updateItem(item.id, {
			type: 'waiting',
			delegatedTo: delegateName.trim(),
			followUpDate
		});
		storageStatus.recordSave();
		toast.success('Moved to Waiting For.');
		onProcessed();
	}

	async function scheduleEvent() {
		if (!eventStartTime) return;

		// Parse start time, default end time to start + 1 hour if not provided
		const startDate = new Date(eventStartTime);
		const endDate = eventEndTime ? new Date(eventEndTime) : new Date(startDate.getTime() + 60 * 60 * 1000);

		await addEvent({
			title: item.title,
			startTime: startDate,
			endTime: endDate,
			source: 'manual'
		});

		// Remove the inbox item (mark as processed)
		await deleteItem(item.id);
		storageStatus.recordSave();
		toast.success('Added to calendar.');
		onProcessed();
	}
</script>

<div class="bg-gray-50 dark:bg-gray-800/50 p-3 tablet:p-6 rounded-b-lg border-t border-gray-200 dark:border-gray-700">
	<!-- Step Indicator -->
	<div class="text-xs text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
		{stepIndicators[step]}
	</div>

	<!-- Item Display -->
	<div class="mb-4">
		<h3 class="font-medium text-base text-gray-900 dark:text-gray-100 mb-1">
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
					class="w-full px-4 py-3 min-h-11 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
				>
					Yes, it's actionable
				</button>
				<button
					onclick={() => step = 'not-actionable'}
					class="w-full px-4 py-3 min-h-11 text-base font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-md active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
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
					class="w-full px-4 py-3 min-h-11 text-base font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 rounded-md active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
				>
					Yes, do it now
				</button>
				<button
					onclick={() => step = 'delegate-or-defer'}
					class="w-full px-4 py-3 min-h-11 text-base font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-md active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
				>
					No, it takes longer
				</button>
			</div>
		</div>
		<button
			onclick={goBack}
			class="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:underline min-h-11"
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
					class="w-full px-4 py-3 min-h-11 text-base font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 rounded-md active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
				>
					Trash it
				</button>
				<button
					onclick={someday}
					class="w-full px-4 py-3 min-h-11 text-base font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-md active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
				>
					Someday/Maybe
				</button>
				<button
					onclick={reference}
					class="w-full px-4 py-3 min-h-11 text-base font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-md active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
				>
					Keep as Reference
				</button>
			</div>
		</div>
		<button
			onclick={goBack}
			class="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:underline min-h-11"
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
					onclick={initiateNextAction}
					class="w-full px-4 py-3 min-h-11 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
				>
					Defer (Next Action)
				</button>
				<button
					onclick={() => step = 'delegate-input'}
					class="w-full px-4 py-3 min-h-11 text-base font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-md active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
				>
					Delegate
				</button>
				<button
					onclick={() => step = 'schedule-event'}
					class="w-full px-4 py-3 min-h-11 text-base font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-md active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
				>
					Schedule it
				</button>
				<button
					onclick={initiateProject}
					class="w-full px-4 py-3 min-h-11 text-base font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-md active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
				>
					It's part of a project
				</button>
			</div>
		</div>
		<button
			onclick={goBack}
			class="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:underline min-h-11"
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
			<form onsubmit={(e) => { e.preventDefault(); delegate(); }} class="flex flex-col gap-3">
				<input
					type="text"
					bind:value={delegateName}
					placeholder="Name or email"
					class="px-3 py-2 text-base min-h-11 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					autofocus
				/>
				<div class="flex flex-col gap-1">
					<input
						type="date"
						bind:value={followUpDateStr}
						class="px-3 py-2 text-base min-h-11 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					/>
					<p class="text-xs text-gray-500 dark:text-gray-400">Optional: When to follow up</p>
				</div>
				<button
					type="submit"
					disabled={!delegateName.trim()}
					class="w-full px-4 py-3 min-h-11 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
				>
					Delegate
				</button>
			</form>
		</div>
		<button
			onclick={goBack}
			class="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:underline min-h-11"
		>
			← Back
		</button>
	{/if}

	<!-- Select Project -->
	{#if step === 'select-project'}
		<div class="mb-4">
			<p class="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
				Which project does this belong to?
			</p>
			<div class="flex flex-col gap-2">
				{#each projects as proj (proj.id)}
					<button
						onclick={() => { selectedProjectId = proj.id; afterContext = 'project'; step = 'assign-context'; }}
						class="w-full px-4 py-3 min-h-11 text-base font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-md active:scale-[0.98] transition-all text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
					>
						{proj.title}
					</button>
				{/each}

				{#if projects.length > 0}
					<div class="border-t border-gray-100 dark:border-gray-700/50 my-2"></div>
				{/if}

				<div class="space-y-2">
					<p class="text-sm font-medium text-gray-700 dark:text-gray-300">
						Create new project:
					</p>
					<input
						type="text"
						bind:value={newProjectTitle}
						placeholder="New project outcome..."
						class="w-full px-3 py-2 text-base min-h-11 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					/>
					<button
						onclick={async () => {
							if (!newProjectTitle.trim()) return;
							const newId = await addProject(newProjectTitle.trim());
							selectedProjectId = newId;
							newProjectTitle = '';
							afterContext = 'project';
							step = 'assign-context';
						}}
						disabled={!newProjectTitle.trim()}
						class="w-full px-4 py-3 min-h-11 text-base font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
					>
						Create & Link
					</button>
				</div>

				<div class="border-t border-gray-100 dark:border-gray-700/50 my-2"></div>

				<button
					onclick={() => { selectedProjectId = undefined; afterContext = 'project'; step = 'assign-context'; }}
					class="w-full px-4 py-3 min-h-11 text-base font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-md active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
				>
					Skip (no project)
				</button>
			</div>
		</div>
		<button
			onclick={goBack}
			class="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:underline min-h-11"
		>
			← Back
		</button>
	{/if}

	<!-- Assign Context -->
	{#if step === 'assign-context'}
		<div class="mb-4">
			<p class="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
				Which context?
			</p>
			<div class="flex flex-col gap-2">
				{#each contexts as context (context.id)}
					<button
						onclick={() => assignContextAndSave(context.name)}
						class="w-full px-4 py-3 min-h-11 text-base font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-md active:scale-[0.98] transition-all text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
					>
						{context.name}
					</button>
				{/each}
				<button
					onclick={() => assignContextAndSave()}
					class="w-full px-4 py-3 min-h-11 text-base font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-md active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
				>
					Skip (no context)
				</button>
			</div>
		</div>
		<button
			onclick={goBack}
			class="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:underline min-h-11"
		>
			← Back
		</button>
	{/if}

	<!-- Schedule Event -->
	{#if step === 'schedule-event'}
		<div class="mb-4">
			<p class="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
				When is this scheduled?
			</p>
			<form onsubmit={(e) => { e.preventDefault(); scheduleEvent(); }} class="flex flex-col gap-3">
				<div>
					<label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
						Start time
					</label>
					<input
						type="datetime-local"
						bind:value={eventStartTime}
						class="w-full px-3 py-2 text-base min-h-11 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						required
						autofocus
					/>
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
						End time (optional)
					</label>
					<input
						type="datetime-local"
						bind:value={eventEndTime}
						class="w-full px-3 py-2 text-base min-h-11 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					/>
					<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Defaults to 1 hour after start</p>
				</div>
				<button
					type="submit"
					disabled={!eventStartTime}
					class="w-full px-4 py-3 min-h-11 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
				>
					Add to Calendar
				</button>
			</form>
		</div>
		<button
			onclick={goBack}
			class="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:underline min-h-11"
		>
			← Back
		</button>
	{/if}
</div>
