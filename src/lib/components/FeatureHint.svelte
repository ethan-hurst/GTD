<script lang="ts">
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	import type { Feature } from '$lib/utils/featureTracking';
	import { hasVisitedFeature } from '$lib/utils/featureTracking';
	import { onboardingState } from '$lib/stores/onboarding.svelte';
	import { getHintContent } from '$lib/utils/hintContent';

	interface Props {
		feature: Feature;
		children: Snippet;
		position?: 'top' | 'bottom' | 'left' | 'right';
	}

	let { feature, children, position = 'right' }: Props = $props();

	let showHint = $state(false);
	let isHovered = $state(false);
	let featureVisited = $state(false);

	// Only show hints if onboarding has been completed or skipped
	const shouldShowHints = $derived(
		onboardingState.hasCompleted || onboardingState.hasSkipped
	);

	// Get appropriate hint content based on whether user skipped onboarding
	const hintContent = $derived(getHintContent(feature, onboardingState.hasSkipped));

	// Check if feature has been visited
	onMount(async () => {
		featureVisited = await hasVisitedFeature(feature);
	});

	// Show hint only if: onboarding done, feature not visited, and element is hovered
	const displayHint = $derived(shouldShowHints && !featureVisited && isHovered);

	// Position classes for the tooltip
	const positionClasses = $derived.by(() => {
		switch (position) {
			case 'top':
				return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
			case 'bottom':
				return 'top-full left-1/2 -translate-x-1/2 mt-2';
			case 'left':
				return 'right-full top-1/2 -translate-y-1/2 mr-2';
			case 'right':
			default:
				return 'left-full top-1/2 -translate-y-1/2 ml-2';
		}
	});

	// Arrow position classes
	const arrowClasses = $derived.by(() => {
		switch (position) {
			case 'top':
				return 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-900 dark:border-t-gray-100';
			case 'bottom':
				return 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-gray-900 dark:border-b-gray-100';
			case 'left':
				return 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-gray-900 dark:border-l-gray-100';
			case 'right':
			default:
				return 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-gray-900 dark:border-r-gray-100';
		}
	});

	function handleMouseEnter() {
		isHovered = true;
	}

	function handleMouseLeave() {
		isHovered = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			isHovered = false;
		}
	}
</script>

<div
	class="relative inline-block"
	onmouseenter={handleMouseEnter}
	onmouseleave={handleMouseLeave}
	role="tooltip"
	aria-describedby={displayHint ? `hint-${feature}` : undefined}
>
	<!-- Wrapped content -->
	<div class="relative">
		{@render children()}

		<!-- Pulsing indicator dot (only shown if hint should be visible) -->
		{#if shouldShowHints && !featureVisited}
			<div
				class="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"
				aria-hidden="true"
			></div>
		{/if}
	</div>

	<!-- Hint tooltip (shown on hover) -->
	{#if displayHint}
		<div
			id="hint-{feature}"
			class="absolute z-50 w-64 px-3 py-2 text-sm bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg shadow-lg {positionClasses}"
			role="tooltip"
			onkeydown={handleKeydown}
		>
			<!-- Arrow -->
			<div
				class="absolute w-0 h-0 border-4 {arrowClasses}"
				aria-hidden="true"
			></div>

			<!-- Content -->
			<div class="font-semibold mb-1">{hintContent.title}</div>
			<div class="text-xs opacity-90">{hintContent.description}</div>
		</div>
	{/if}
</div>
