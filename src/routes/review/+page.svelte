<script lang="ts">
	import { onMount } from 'svelte';
	import confetti from 'canvas-confetti';
	import { toast } from 'svelte-5-french-toast';
	import WeeklyReviewWizard from '$lib/components/WeeklyReviewWizard.svelte';
	import { weeklyReviewState } from '$lib/stores/review.svelte';

	// Load last review date on mount
	onMount(async () => {
		await weeklyReviewState.loadLastReview();
	});

	// Calculate days since last review
	const daysSinceLastReview = $derived(
		weeklyReviewState.lastReviewDate
			? Math.floor((Date.now() - weeklyReviewState.lastReviewDate.getTime()) / (1000 * 60 * 60 * 24))
			: Infinity
	);

	const isOverdue = $derived(daysSinceLastReview > 7);

	function getTimeSinceLastReview(): string {
		if (!weeklyReviewState.lastReviewDate) {
			return 'Never completed';
		}

		if (daysSinceLastReview === 0) {
			return 'Completed today';
		} else if (daysSinceLastReview === 1) {
			return 'Completed yesterday';
		} else if (daysSinceLastReview < 7) {
			return `Completed ${daysSinceLastReview} days ago`;
		} else {
			const weeks = Math.floor(daysSinceLastReview / 7);
			return `Completed ${weeks} week${weeks === 1 ? '' : 's'} ago`;
		}
	}

	async function handleFinish() {
		await weeklyReviewState.finishReview();

		// Celebration confetti
		confetti({
			particleCount: 100,
			spread: 70,
			origin: { y: 0.6 },
			disableForReducedMotion: true
		});

		// Success toast
		toast.success('Weekly review complete! Your GTD system is current.');
	}
</script>

{#if !weeklyReviewState.isActive}
	<!-- Start Page -->
	<div class="flex items-center justify-center min-h-full">
		<div class="text-center max-w-2xl p-4 tablet:px-8">
			<h1 class="text-2xl tablet:text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-4">
				Weekly Review
			</h1>
			<p class="text-base tablet:text-lg text-gray-500 dark:text-gray-400 mb-8">
				The weekly review keeps your GTD system current and trustworthy.
			</p>

			<!-- Last Review Indicator -->
			<div class="mb-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
				<p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
					Last Review
				</p>
				<p class="text-sm {isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : weeklyReviewState.lastReviewDate ? 'text-gray-600 dark:text-gray-400' : 'text-gray-500 dark:text-gray-500'}">
					{#if isOverdue}
						⚠️ {getTimeSinceLastReview()} — overdue!
					{:else}
						{getTimeSinceLastReview()}
					{/if}
				</p>
			</div>

			<!-- Start Button -->
			<button
				onclick={() => weeklyReviewState.startReview()}
				class="w-full tablet:w-auto min-h-11 px-8 py-4 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-all shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950 active:scale-[0.98]"
			>
				Start Weekly Review
			</button>
		</div>
	</div>
{:else}
	<!-- Wizard View -->
	<WeeklyReviewWizard onfinish={handleFinish} />
{/if}
