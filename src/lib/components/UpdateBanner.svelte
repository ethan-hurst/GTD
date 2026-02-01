<script lang="ts">
	import { onMount } from 'svelte';

	let showBanner = $state(false);

	onMount(() => {
		if (!('serviceWorker' in navigator)) return;

		// Record whether a SW already controls this page (not first visit)
		const hadController = !!navigator.serviceWorker.controller;

		function onControllerChange() {
			if (hadController) {
				showBanner = true;
			}
		}

		navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

		return () => {
			navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
		};
	});

	function dismiss() {
		showBanner = false;
	}

	function reload() {
		window.location.reload();
	}
</script>

{#if showBanner}
	<div
		class="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom"
		role="alert"
		aria-live="polite"
	>
		<div class="mx-auto max-w-lg px-4 pb-4">
			<div class="flex items-center justify-between gap-4 rounded-full bg-blue-600 px-5 py-3 text-white shadow-lg dark:bg-blue-500">
				<span class="text-sm font-medium">A new version is available.</span>
				<div class="flex items-center gap-2">
					<button
						onclick={dismiss}
						class="text-sm font-medium text-blue-100 hover:text-white transition-colors"
					>
						Dismiss
					</button>
					<button
						onclick={reload}
						class="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
					>
						Reload
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
