<script lang="ts">
	import { onMount } from 'svelte';
	import { actionState } from '$lib/stores/actions.svelte';
	import { completeAction } from '$lib/db/operations';
	import toast from 'svelte-5-french-toast';
	import type { GTDItem } from '$lib/db/schema';

	interface CalendarSidePanelProps {
		currentView: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';
		currentDate: Date;
	}

	let { currentView, currentDate }: CalendarSidePanelProps = $props();

	onMount(async () => {
		await actionState.loadActions();
	});

	// Group actions by context
	const groupedActions = $derived.by(() => {
		const groups = new Map<string, GTDItem[]>();

		for (const action of actionState.items) {
			const context = action.context || 'No Context';
			if (!groups.has(context)) {
				groups.set(context, []);
			}
			groups.get(context)!.push(action);
		}

		// Convert to array of {context, actions} and sort by context name
		const result = Array.from(groups.entries())
			.map(([context, actions]) => ({ context, actions }))
			.sort((a, b) => {
				// "No Context" goes last
				if (a.context === 'No Context') return 1;
				if (b.context === 'No Context') return -1;
				return a.context.localeCompare(b.context);
			});

		return result;
	});

	async function handleComplete(id: number, title: string) {
		try {
			const undo = await completeAction(id);
			await actionState.loadActions();

			// Show toast with undo
			toast.success(`Completed: ${title}`, {
				duration: 4000,
				action: {
					label: 'Undo',
					onClick: async () => {
						await undo();
						await actionState.loadActions();
						toast.success('Action restored');
					}
				}
			});
		} catch (error) {
			console.error('Failed to complete action:', error);
			toast.error('Failed to complete action');
		}
	}
</script>

<div class="w-80 border-l border-gray-200/60 dark:border-gray-800/60 flex flex-col bg-white dark:bg-gray-900">
	<!-- Header -->
	<div class="px-4 py-3 border-b border-gray-200/60 dark:border-gray-800/60">
		<div class="flex items-center justify-between">
			<h2 class="text-sm font-semibold text-gray-900 dark:text-white">Next Actions</h2>
			{#if actionState.itemCount > 0}
				<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
					{actionState.itemCount}
				</span>
			{/if}
		</div>
	</div>

	<!-- Actions List -->
	<div class="flex-1 overflow-y-auto">
		{#if actionState.itemCount === 0}
			<div class="px-4 py-8 text-center">
				<p class="text-sm text-green-600 dark:text-green-400">
					No next actions. Your plate is clear!
				</p>
			</div>
		{:else}
			<div class="py-2">
				{#each groupedActions as group (group.context)}
					<div class="mb-4">
						<!-- Context header -->
						<div class="px-4 py-1.5 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800/50">
							<h3 class="text-xs font-medium text-gray-700 dark:text-gray-300">
								{group.context}
							</h3>
						</div>

						<!-- Actions in this context -->
						<div class="divide-y divide-gray-100 dark:divide-gray-800/50">
							{#each group.actions as action (action.id)}
								<div class="px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors flex items-start gap-3">
									<!-- Checkbox -->
									<button
										onclick={() => handleComplete(action.id, action.title)}
										class="mt-0.5 w-4 h-4 rounded border border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
										aria-label="Complete action"
									>
										<svg class="w-3 h-3 text-transparent hover:text-blue-500 dark:hover:text-blue-400" fill="currentColor" viewBox="0 0 16 16">
											<path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
										</svg>
									</button>

									<!-- Action content -->
									<div class="flex-1 min-w-0">
										<p class="text-sm text-gray-900 dark:text-white break-words">
											{action.title}
										</p>
										{#if action.notes}
											<p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
												{action.notes}
											</p>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	/* Line clamp utility */
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
