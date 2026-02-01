<script lang="ts">
	import { onMount } from 'svelte';

	// Props (Svelte 5 pattern)
	let { onclose } = $props<{ onclose: () => void }>();

	// State ($state runes)
	let submitting = $state(false);
	let submitted = $state(false);
	let feedbackType = $state<'bug' | 'feature'>('bug');
	let description = $state('');
	let email = $state('');
	let screenshotData = $state('');
	let isOnline = $state(navigator.onLine);
	let modalElement: HTMLElement;
	let previouslyFocused: HTMLElement | null = null;

	// Online/offline detection
	$effect(() => {
		const handleOnline = () => { isOnline = true; };
		const handleOffline = () => { isOnline = false; };

		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);

		return () => {
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
		};
	});

	// Focus management
	onMount(() => {
		// Store previously focused element
		previouslyFocused = document.activeElement as HTMLElement;

		// Focus first interactive element
		const firstFocusable = modalElement.querySelector<HTMLElement>('button, input, textarea, select');
		firstFocusable?.focus();

		return () => {
			// Restore focus on unmount
			previouslyFocused?.focus();
		};
	});

	// Screenshot capture with html2canvas
	async function captureScreenshot() {
		try {
			// Hide modal temporarily for clean screenshot
			const modal = modalElement;
			modal.style.display = 'none';

			// Dynamic import of html2canvas
			const html2canvas = (await import('html2canvas')).default;
			const canvas = await html2canvas(document.body, { scale: 0.5, useCORS: true });

			// Restore modal
			modal.style.display = '';

			// Convert to data URL with compression
			screenshotData = canvas.toDataURL('image/jpeg', 0.7);

			// Compress further if > 500KB
			if (screenshotData.length > 500 * 1024) {
				screenshotData = canvas.toDataURL('image/jpeg', 0.3);
			}
		} catch (err) {
			console.error('Screenshot failed:', err);
		}
	}

	// Keyboard navigation (Tab trap and Escape)
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onclose();
			return;
		}

		if (event.key === 'Tab') {
			const focusable = Array.from(
				modalElement.querySelectorAll<HTMLElement>(
					'button, input:not([type="hidden"]), textarea, select, [tabindex]:not([tabindex="-1"])'
				)
			);
			const first = focusable[0];
			const last = focusable[focusable.length - 1];

			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last?.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first?.focus();
			}
		}
	}

	// Form submission
	async function handleSubmit(event: Event) {
		event.preventDefault();
		submitting = true;

		try {
			if (isOnline) {
				// Online: POST to /feedback-form.html endpoint
				const formData = new FormData();
				formData.append('form-name', 'feedback');
				formData.append('bot-field', ''); // Honeypot
				formData.append('type', feedbackType);
				formData.append('description', description);
				if (email) formData.append('email', email);
				if (screenshotData) formData.append('screenshot', screenshotData);

				const response = await fetch('/feedback-form.html', {
					method: 'POST',
					body: formData
				});

				if (!response.ok) {
					throw new Error('Submission failed');
				}

				submitted = true;
				setTimeout(() => {
					onclose();
				}, 2000);
			} else {
				// Offline: Queue for later (TODO: Plan 02 will add offline queue integration)
				console.log('Offline submission - queuing for later');
				// TODO: Import and call queueFeedback from '$lib/db/feedback-queue'
				submitted = true;
				setTimeout(() => {
					onclose();
				}, 2000);
			}
		} catch (error) {
			console.error('Feedback submission error:', error);
			// Show error via svelte-5-french-toast
			const { toast } = await import('svelte-5-french-toast');
			toast.error('Failed to submit feedback. Please try again.');
			submitting = false;
		}
	}

	// Remove screenshot
	function removeScreenshot() {
		screenshotData = '';
	}
</script>

<!-- Backdrop -->
<div
	class="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
	onclick={onclose}
	role="presentation"
>
	<!-- Modal content -->
	<div
		bind:this={modalElement}
		class="relative max-w-[500px] w-[90%] max-h-[85vh] overflow-y-auto rounded-xl shadow-2xl bg-white dark:bg-gray-900 p-6"
		role="dialog"
		aria-labelledby="feedback-title"
		aria-modal="true"
		onclick={(e) => e.stopPropagation()}
		onkeydown={handleKeydown}
	>
		<!-- Close button -->
		<button
			onclick={onclose}
			class="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 rounded-md"
			aria-label="Close feedback form"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>

		<!-- Title -->
		<h2 id="feedback-title" class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
			Send Feedback
		</h2>

		{#if !submitted}
			<form onsubmit={handleSubmit} class="space-y-4">
				<!-- Type selector (segmented control) -->
				<div>
					<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Type
					</label>
					<div class="flex gap-2">
						<button
							type="button"
							onclick={() => feedbackType = 'bug'}
							class="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 {feedbackType === 'bug' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}"
						>
							Bug Report
						</button>
						<button
							type="button"
							onclick={() => feedbackType = 'feature'}
							class="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 {feedbackType === 'feature' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}"
						>
							Feature Request
						</button>
					</div>
				</div>

				<!-- Description -->
				<div>
					<label for="description" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Description
					</label>
					<textarea
						id="description"
						bind:value={description}
						required
						minlength="10"
						rows="5"
						placeholder="Tell us what happened or what you'd like to see..."
						class="w-full px-3 py-2.5 text-base border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 transition-all duration-150 resize-none"
					></textarea>
				</div>

				<!-- Screenshot -->
				{#if screenshotData}
					<div class="space-y-2">
						<label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
							Screenshot
						</label>
						<div class="relative border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
							<img src={screenshotData} alt="Screenshot preview" class="w-full" />
							<button
								type="button"
								onclick={removeScreenshot}
								class="absolute top-2 right-2 px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md shadow-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:ring-offset-2"
							>
								Remove
							</button>
						</div>
					</div>
				{:else}
					<button
						type="button"
						onclick={captureScreenshot}
						class="w-full py-2.5 px-4 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-950 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2"
					>
						<div class="flex items-center justify-center gap-2">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
							</svg>
							<span>Attach Screenshot</span>
						</div>
					</button>
				{/if}

				<!-- Email (optional) -->
				<div>
					<label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Email <span class="text-xs text-gray-500 dark:text-gray-400 font-normal">(optional - only if you'd like us to follow up)</span>
					</label>
					<input
						type="email"
						id="email"
						bind:value={email}
						class="w-full px-3 py-2.5 text-base border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 transition-all duration-150"
					/>
				</div>

				<!-- Offline indicator -->
				{#if !isOnline}
					<div class="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
						<svg class="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
						</svg>
						<p class="text-sm text-amber-800 dark:text-amber-200">
							You're offline. Feedback will be sent when you're back online.
						</p>
					</div>
				{/if}

				<!-- Submit button -->
				<button
					type="submit"
					disabled={submitting || !description || description.length < 10}
					class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-lg shadow-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2"
				>
					{submitting ? 'Sending...' : 'Send Feedback'}
				</button>
			</form>
		{:else}
			<!-- Success state -->
			<div class="py-8 text-center">
				<div class="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
					<svg class="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
				</div>
				<p class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
					Thank you!
				</p>
				<p class="text-sm text-gray-600 dark:text-gray-400">
					Your feedback has been received.
					{#if !isOnline}
						It will be sent once you're back online.
					{/if}
				</p>
			</div>
		{/if}
	</div>
</div>
