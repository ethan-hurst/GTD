<script lang="ts">
	import { onMount } from 'svelte';
	import { weeklyReviewState } from '$lib/stores/review.svelte';
	import { inboxState } from '$lib/stores/inbox.svelte';
	import { actionState } from '$lib/stores/actions.svelte';
	import { projectState } from '$lib/stores/projects.svelte';
	import { waitingForState } from '$lib/stores/waiting.svelte';
	import { somedayMaybeState } from '$lib/stores/someday.svelte';
	import type { ReviewStep } from '$lib/stores/review.svelte';

	interface WeeklyReviewWizardProps {
		onfinish?: () => void;
	}

	let { onfinish }: WeeklyReviewWizardProps = $props();

	// Load all state stores on mount
	onMount(async () => {
		await Promise.all([
			inboxState.loadItems(),
			actionState.loadActions(),
			projectState.loadProjects(),
			waitingForState.loadItems(),
			somedayMaybeState.loadItems()
		]);
	});

	// Get item count context for each step
	function getStepContext(step: ReviewStep): string {
		switch (step) {
			case 'inbox':
				const inboxCount = inboxState.itemCount;
				return inboxCount === 0
					? 'No items here — looking good!'
					: `${inboxCount} item${inboxCount === 1 ? '' : 's'} to process`;
			case 'calendar-past':
				return 'Review your past calendar for follow-ups';
			case 'calendar-future':
				return 'Review upcoming events';
			case 'actions':
				const actionCount = actionState.itemCount;
				return actionCount === 0
					? 'No items here — looking good!'
					: `${actionCount} next action${actionCount === 1 ? '' : 's'} to review`;
			case 'waiting':
				const waitingCount = waitingForState.itemCount;
				return waitingCount === 0
					? 'No items here — looking good!'
					: `${waitingCount} item${waitingCount === 1 ? '' : 's'} waiting on others`;
			case 'projects':
				const projectCount = projectState.itemCount;
				const stalledCount = projectState.stalledCount;
				return projectCount === 0
					? 'No items here — looking good!'
					: `${projectCount} project${projectCount === 1 ? '' : 's'}, ${stalledCount} stalled`;
			case 'someday':
				const somedayCount = somedayMaybeState.itemCount;
				return somedayCount === 0
					? 'No items here — looking good!'
					: `${somedayCount} someday/maybe item${somedayCount === 1 ? '' : 's'}`;
			case 'creative':
				return 'Capture any new ideas that came to mind during this review';
			default:
				return '';
		}
	}

	function isStepEmpty(step: ReviewStep): boolean {
		switch (step) {
			case 'inbox':
				return inboxState.itemCount === 0;
			case 'actions':
				return actionState.itemCount === 0;
			case 'waiting':
				return waitingForState.itemCount === 0;
			case 'projects':
				return projectState.itemCount === 0;
			case 'someday':
				return somedayMaybeState.itemCount === 0;
			default:
				return false;
		}
	}

	function handleCompleteStep() {
		const currentStep = weeklyReviewState.currentStep;
		weeklyReviewState.completeStep(currentStep);

		// Auto-advance to next incomplete step
		const nextIncompleteStep = weeklyReviewState.stepOrder.find(
			step => !weeklyReviewState.completedSteps.has(step)
		);
		if (nextIncompleteStep) {
			weeklyReviewState.goToStep(nextIncompleteStep);
		}
	}

	function handleFinishReview() {
		if (onfinish) {
			onfinish();
		}
	}
</script>

<div class="flex h-full">
	<!-- Step Sidebar -->
	<div class="w-60 border-r border-gray-200/60 dark:border-gray-700/60 flex flex-col">
		<!-- Progress Bar -->
		<div class="p-4 border-b border-gray-200/60 dark:border-gray-700/60">
			<div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
				<div
					class="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
					style="width: {weeklyReviewState.progress}%"
				></div>
			</div>
			<p class="text-xs text-gray-600 dark:text-gray-400 text-center tabular-nums">
				{weeklyReviewState.completedSteps.size} of 8 steps complete ({Math.round(weeklyReviewState.progress)}%)
			</p>
		</div>

		<!-- Step List -->
		<div class="flex-1 overflow-y-auto">
			{#each weeklyReviewState.stepOrder as step, index (step)}
				{@const isCompleted = weeklyReviewState.completedSteps.has(step)}
				{@const isCurrent = weeklyReviewState.currentStep === step}
				<button
					onclick={() => weeklyReviewState.goToStep(step)}
					class="w-full text-left px-4 py-3 border-b border-gray-200/60 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset {isCurrent ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-600 dark:border-l-blue-500' : ''}"
				>
					<div class="flex items-start gap-3">
						<div class="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center {isCompleted ? 'bg-green-600 dark:bg-green-500' : isCurrent ? 'bg-blue-600 dark:bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}">
							{#if isCompleted}
								<svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
							{:else}
								<span class="text-xs font-medium text-white">{index + 1}</span>
							{/if}
						</div>
						<div class="flex-1 min-w-0">
							<p class="text-sm font-medium {isCurrent ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-gray-100'} {isCompleted ? 'line-through text-gray-500 dark:text-gray-400' : ''}">
								{weeklyReviewState.stepLabels[step]}
							</p>
						</div>
					</div>
				</button>
			{/each}
		</div>
	</div>

	<!-- Step Content -->
	<div class="flex-1 flex flex-col">
		<div class="flex-1 overflow-y-auto">
			<div class="max-w-2xl mx-auto p-8">
				<!-- Current Step Title -->
				<h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
					{weeklyReviewState.stepLabels[weeklyReviewState.currentStep]}
				</h2>

				<!-- Step Description -->
				<p class="text-base text-gray-600 dark:text-gray-300 mb-6">
					{weeklyReviewState.stepDescriptions[weeklyReviewState.currentStep]}
				</p>

				<!-- Item Count Context -->
				<div class="bg-gray-50/50 dark:bg-gray-800/30 border border-gray-200/60 dark:border-gray-700/60 rounded-lg p-4 mb-6">
					<p class="text-sm {isStepEmpty(weeklyReviewState.currentStep) ? 'text-green-600 dark:text-green-400 font-medium' : 'text-gray-700 dark:text-gray-300'}">
						{getStepContext(weeklyReviewState.currentStep)}
					</p>
				</div>

				<!-- Mark Complete Button -->
				{#if !weeklyReviewState.completedSteps.has(weeklyReviewState.currentStep)}
					<button
						onclick={handleCompleteStep}
						class="px-6 py-3 text-sm font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 rounded-md transition-all shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950 active:scale-[0.98]"
					>
						Mark Step Complete
					</button>
				{:else}
					<div class="flex items-center gap-2 text-green-600 dark:text-green-400">
						<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
						</svg>
						<span class="text-sm font-medium">Step completed</span>
					</div>
				{/if}
			</div>
		</div>

		<!-- Navigation Footer -->
		<div class="border-t border-gray-200/60 dark:border-gray-700/60 p-4 flex items-center justify-between bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
			<button
				onclick={() => weeklyReviewState.back()}
				disabled={!weeklyReviewState.canGoBack}
				class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950"
			>
				← Back
			</button>

			<div class="flex gap-3">
				<button
					onclick={() => weeklyReviewState.next()}
					disabled={!weeklyReviewState.canGoNext}
					class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950"
				>
					Next →
				</button>

				{#if weeklyReviewState.isComplete}
					<button
						onclick={handleFinishReview}
						class="px-6 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950"
					>
						Finish Review
					</button>
				{/if}
			</div>
		</div>
	</div>
</div>
