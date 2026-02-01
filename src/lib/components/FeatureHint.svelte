<script lang="ts">
	import { onMount, tick } from 'svelte';
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

	let isHovered = $state(false);
	let featureVisited = $state(false);
	let wrapperEl: HTMLDivElement | undefined = $state();
	let tooltipStyle = $state('');

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

	// Arrow position classes (arrow is positioned inside the tooltip)
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

	// Compute tooltip position using viewport coordinates
	function computeTooltipPosition() {
		if (!wrapperEl) return;
		const rect = wrapperEl.getBoundingClientRect();
		const gap = 8; // spacing between trigger and tooltip

		switch (position) {
			case 'top':
				tooltipStyle = `position:fixed; bottom:${window.innerHeight - rect.top + gap}px; left:${rect.left + rect.width / 2}px; transform:translateX(-50%);`;
				break;
			case 'bottom':
				tooltipStyle = `position:fixed; top:${rect.bottom + gap}px; left:${rect.left + rect.width / 2}px; transform:translateX(-50%);`;
				break;
			case 'left':
				tooltipStyle = `position:fixed; top:${rect.top + rect.height / 2}px; right:${window.innerWidth - rect.left + gap}px; transform:translateY(-50%);`;
				break;
			case 'right':
			default:
				tooltipStyle = `position:fixed; top:${rect.top + rect.height / 2}px; left:${rect.right + gap}px; transform:translateY(-50%);`;
				break;
		}
	}

	// Teleport tooltip to document.body to escape all overflow/stacking contexts
	// This is necessary because the sidebar has overflow-y-auto on the nav and
	// backdrop-filter on the aside, both of which clip or constrain child tooltips.
	function portalToBody(node: HTMLElement) {
		document.body.appendChild(node);
		return {
			destroy() {
				if (node.parentNode) {
					node.parentNode.removeChild(node);
				}
			}
		};
	}

	function handleMouseEnter() {
		isHovered = true;
		tick().then(computeTooltipPosition);
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
	bind:this={wrapperEl}
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
</div>

<!-- Hint tooltip rendered via portal to document.body to escape overflow containers -->
{#if displayHint}
	<div
		use:portalToBody
		id="hint-{feature}"
		class="z-50 w-64 px-3 py-2 text-sm bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg shadow-lg pointer-events-none"
		style={tooltipStyle}
		role="tooltip"
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
