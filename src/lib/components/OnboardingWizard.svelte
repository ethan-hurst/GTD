<script lang="ts">
	import { onboardingState } from '$lib/stores/onboarding.svelte';
	import { inboxState } from '$lib/stores/inbox.svelte';
	import { addItem } from '$lib/db/operations';
	import confetti from 'canvas-confetti';

	let captureInput = $state('');
	let hasCapturedFirst = $state(false);
	let isSubmitting = $state(false);
	let showCaptureSuccess = $state(false);

	async function handleCapture(e: Event) {
		e.preventDefault();
		if (!captureInput.trim() || isSubmitting) return;

		isSubmitting = true;

		try {
			// Add item to inbox
			await addItem({
				title: captureInput.trim(),
				type: 'inbox',
				notes: ''
			});

			// Reload inbox state
			await inboxState.loadItems();

			// Fire confetti celebration
			confetti({
				particleCount: 50,
				spread: 60,
				origin: { y: 0.6 },
				disableForReducedMotion: true
			});

			// Show success message
			showCaptureSuccess = true;
			hasCapturedFirst = true;

			// Mark step as complete
			await onboardingState.completeStep('capture');

			// Clear input
			captureInput = '';

			// Hide success message after 1s, enable next button
			setTimeout(() => {
				showCaptureSuccess = false;
			}, 1000);
		} finally {
			isSubmitting = false;
		}
	}

	async function handleFinish() {
		// Fire completion confetti
		confetti({
			particleCount: 100,
			spread: 70,
			disableForReducedMotion: true
		});

		// Small delay for confetti to be visible
		setTimeout(async () => {
			await onboardingState.finishOnboarding();
		}, 500);
	}
</script>

<div class="fixed inset-0 z-50 backdrop-blur-sm bg-black/50 tablet:flex tablet:items-center tablet:justify-center tablet:p-6">
	<!-- Modal Container - full-screen on mobile, centered card on tablet+ -->
	<div class="w-full h-full tablet:h-auto tablet:max-w-2xl bg-white dark:bg-gray-950 tablet:rounded-xl shadow-2xl flex flex-col tablet:max-h-[90vh]">
		<!-- Progress Bar at top -->
		<div class="border-b border-gray-200 dark:border-gray-700 p-4 tablet:p-6">
			<div class="flex items-center justify-between mb-2">
				<p class="text-sm font-medium text-gray-700 dark:text-gray-300">
					Step {onboardingState.currentStepIndex + 1} of 5
				</p>
				<p class="text-sm text-gray-500 dark:text-gray-400">
					{onboardingState.stepLabels[onboardingState.currentStep]}
				</p>
			</div>
			<div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
				<div
					class="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-200"
					style="width: {((onboardingState.currentStepIndex + 1) / 5) * 100}%"
				></div>
			</div>
		</div>

		<!-- Central content area -->
		<div class="flex-1 overflow-y-auto p-4 tablet:p-6">
			<div class="w-full mx-auto">
				{#if onboardingState.currentStep === 'welcome'}
					<!-- Step 1: Welcome -->
					<div class="text-center">
						<h1 class="text-2xl tablet:text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-4">
							Welcome to GTD
						</h1>
						<p class="text-base tablet:text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
							Getting Things Done is a methodology for managing everything on your plate. We'll walk through the 4 key concepts in about 60 seconds.
						</p>
						<div class="flex flex-col gap-2 phablet:flex-row phablet:items-center phablet:justify-center phablet:gap-4">
							<button
								onclick={() => onboardingState.skipOnboarding()}
								class="w-full phablet:w-auto min-h-11 px-6 py-3 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400/40 focus:ring-offset-2 transition-all duration-150"
							>
								I know GTD — skip
							</button>
							<button
								onclick={() => onboardingState.next()}
								class="w-full phablet:w-auto min-h-11 px-6 py-3 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 active:scale-[0.98] transition-all duration-150"
							>
								Let's go
							</button>
						</div>
					</div>

				{:else if onboardingState.currentStep === 'capture'}
					<!-- Step 2: Capture -->
					<div>
						<h2 class="text-xl tablet:text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-4">
							Step 1: Capture Everything
						</h2>
						<p class="text-base text-gray-600 dark:text-gray-300 mb-6">
							GTD starts with getting everything out of your head. Anything on your mind — tasks, ideas, commitments — goes into your Inbox.
						</p>

						<form onsubmit={handleCapture} class="mb-4">
							<input
								bind:value={captureInput}
								type="text"
								placeholder="Try it — type something on your mind..."
								disabled={isSubmitting}
								class="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:focus:ring-blue-400/40 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
								style="font-size: 16px;"
							/>
						</form>

					{#if showCaptureSuccess}
						<p class="text-green-600 dark:text-green-400 font-medium text-center mb-4">
							Captured!
						</p>
					{/if}

					<div class="text-sm text-gray-500 dark:text-gray-400 space-y-1">
						<p>e.g., Call dentist</p>
						<p>e.g., Plan weekend trip</p>
						<p>e.g., Review budget</p>
					</div>
				</div>

				{:else if onboardingState.currentStep === 'process'}
					<!-- Step 3: Process -->
					<div>
						<h2 class="text-xl tablet:text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-4">
							Step 2: Process to Zero
						</h2>
					<p class="text-base text-gray-600 dark:text-gray-300 mb-6">
						Once captured, process each item: Is it actionable? Will it take less than 2 minutes? Can you delegate it? The Processing Flow guides you through these decisions.
					</p>

					<!-- GTD Decision Tree Visual -->
					<div class="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-4">
						<!-- Is it actionable? -->
						<div class="border-l-4 border-blue-600 dark:border-blue-500 pl-4">
							<p class="font-semibold text-gray-900 dark:text-gray-100 mb-2">
								Is it actionable?
							</p>
							<div class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
								<div class="flex items-center gap-2">
									<span class="text-gray-400">→</span>
									<span><strong>No:</strong> Trash / Someday/Maybe / Reference</span>
								</div>
								<div class="flex items-center gap-2">
									<span class="text-gray-400">→</span>
									<span><strong>Yes:</strong> Continue below...</span>
								</div>
							</div>
						</div>

						<!-- Less than 2 minutes? -->
						<div class="border-l-4 border-green-600 dark:border-green-500 pl-4">
							<p class="font-semibold text-gray-900 dark:text-gray-100 mb-2">
								Less than 2 minutes?
							</p>
							<div class="text-sm text-gray-600 dark:text-gray-300">
								<span class="text-gray-400">→</span>
								<span><strong>Do it now</strong> (complete immediately)</span>
							</div>
						</div>

						<!-- Can someone else do it? -->
						<div class="border-l-4 border-yellow-600 dark:border-yellow-500 pl-4">
							<p class="font-semibold text-gray-900 dark:text-gray-100 mb-2">
								Can someone else do it?
							</p>
							<div class="text-sm text-gray-600 dark:text-gray-300">
								<span class="text-gray-400">→</span>
								<span><strong>Delegate</strong> (Waiting For list)</span>
							</div>
						</div>

						<!-- Otherwise -->
						<div class="border-l-4 border-purple-600 dark:border-purple-500 pl-4">
							<p class="font-semibold text-gray-900 dark:text-gray-100 mb-2">
								Otherwise
							</p>
							<div class="text-sm text-gray-600 dark:text-gray-300">
								<span class="text-gray-400">→</span>
								<span><strong>Next Action</strong> (assign a context like @computer, @phone)</span>
							</div>
						</div>
					</div>
				</div>

				{:else if onboardingState.currentStep === 'organize'}
					<!-- Step 4: Organize -->
					<div>
						<h2 class="text-xl tablet:text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-4">
							Step 3: Organize by Lists
						</h2>
					<p class="text-base text-gray-600 dark:text-gray-300 mb-6">
						GTD organizes your work into clear lists so you always know what to do next:
					</p>

					<!-- 4 GTD lists in 2x2 grid -->
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<!-- Next Actions -->
						<div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
							<div class="text-2xl mb-2">⚡</div>
							<h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-1">
								Next Actions
							</h3>
							<p class="text-sm text-gray-600 dark:text-gray-300">
								Tasks you can do right now, filtered by context (@computer, @phone, @office)
							</p>
						</div>

						<!-- Projects -->
						<div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
							<div class="text-2xl mb-2">📋</div>
							<h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-1">
								Projects
							</h3>
							<p class="text-sm text-gray-600 dark:text-gray-300">
								Outcomes requiring multiple steps. Every project needs at least one next action.
							</p>
						</div>

						<!-- Waiting For -->
						<div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
							<div class="text-2xl mb-2">⏳</div>
							<h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-1">
								Waiting For
							</h3>
							<p class="text-sm text-gray-600 dark:text-gray-300">
								Items you've delegated or are waiting on someone else for.
							</p>
						</div>

						<!-- Someday/Maybe -->
						<div class="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
							<div class="text-2xl mb-2">💭</div>
							<h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-1">
								Someday/Maybe
							</h3>
							<p class="text-sm text-gray-600 dark:text-gray-300">
								Ideas and possibilities for the future. Not now, but not forgotten.
							</p>
						</div>
					</div>
				</div>

				{:else if onboardingState.currentStep === 'review-intro'}
					<!-- Step 5: Review Intro -->
					<div class="text-center">
						<h2 class="text-xl tablet:text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-4">
							Step 4: Review Weekly
						</h2>
						<p class="text-base text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
							The Weekly Review is the secret to making GTD work. Once a week, review everything: empty your inbox, check all projects, follow up on delegations.
						</p>
						<p class="text-sm text-gray-500 dark:text-gray-400 mb-8">
							We'll remind you when it's time for your weekly review.
						</p>
						<button
							onclick={handleFinish}
							class="w-full phablet:w-auto min-h-11 px-6 py-3 text-base font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 rounded-lg shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:ring-offset-2 active:scale-[0.98] transition-all duration-150"
						>
							Get Started
						</button>
					</div>
				{/if}
			</div>
		</div>

		<!-- Navigation buttons at bottom -->
		<div class="border-t border-gray-200 dark:border-gray-700 p-4 tablet:p-6 pb-[env(safe-area-inset-bottom,0px)]">
			<div class="flex flex-col gap-2 phablet:flex-row phablet:items-center phablet:justify-between">
				<button
					onclick={() => onboardingState.back()}
					disabled={!onboardingState.canGoBack}
					class="w-full phablet:w-auto min-h-11 px-6 py-3 text-base font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-400/40 focus:ring-offset-2 transition-all duration-150"
				>
					← Back
				</button>

				{#if onboardingState.currentStep === 'capture'}
					<button
						onclick={() => onboardingState.next()}
						disabled={!hasCapturedFirst}
						class="w-full phablet:w-auto min-h-11 px-6 py-3 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 active:scale-[0.98] transition-all duration-150"
					>
						Next →
					</button>
				{:else if onboardingState.currentStep !== 'welcome' && onboardingState.currentStep !== 'review-intro'}
					<button
						onclick={() => onboardingState.next()}
						class="w-full phablet:w-auto min-h-11 px-6 py-3 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 active:scale-[0.98] transition-all duration-150"
					>
						Next →
					</button>
				{/if}
			</div>
		</div>
	</div>
</div>
