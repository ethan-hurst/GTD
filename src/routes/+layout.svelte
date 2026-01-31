<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import StatusBar from '$lib/components/StatusBar.svelte';
	import OnboardingWizard from '$lib/components/OnboardingWizard.svelte';
	import { Toaster } from 'svelte-5-french-toast';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { theme } from '$lib/stores/theme.svelte';
	import { storageStatus } from '$lib/stores/storage.svelte';
	import { onboardingState } from '$lib/stores/onboarding.svelte';
	import { getFeatureFromRoute, markFeatureVisited } from '$lib/utils/featureTracking';

	const { children } = $props();
	let searchBarRef: any;
	let previousPath = $state('');

	// Global keyboard shortcut handler
	function handleKeydown(event: KeyboardEvent) {
		const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
		const modifierKey = isMac ? event.metaKey : event.ctrlKey;

		// Cmd/Ctrl + K: Focus search (always handle, even in inputs)
		if (modifierKey && event.key === 'k') {
			event.preventDefault();
			searchBarRef?.focus();
			// Track search feature usage
			markFeatureVisited('search').catch(() => {});
			return;
		}

		// Check if we're in an input/textarea/contenteditable
		const target = event.target as HTMLElement;
		const isInput =
			target.tagName === 'INPUT' ||
			target.tagName === 'TEXTAREA' ||
			target.isContentEditable;

		// For other shortcuts, don't interfere with inputs
		if (isInput) return;

		// Cmd/Ctrl + I: Navigate to inbox
		if (modifierKey && event.key === 'i') {
			event.preventDefault();
			goto('/');
			return;
		}

		// /: Focus inbox capture input
		if (event.key === '/') {
			event.preventDefault();
			goto('/').then(() => {
				window.dispatchEvent(new CustomEvent('focus-inbox-capture'));
			});
			// Track keyboard shortcut usage
			markFeatureVisited('keyboard-shortcuts').catch(() => {});
			return;
		}

		// n: Navigate to Next Actions
		if (event.key === 'n') {
			event.preventDefault();
			goto('/actions');
			// Track keyboard shortcut usage
			markFeatureVisited('keyboard-shortcuts').catch(() => {});
			return;
		}

		// p: Navigate to Projects
		if (event.key === 'p') {
			event.preventDefault();
			goto('/projects');
			// Track keyboard shortcut usage
			markFeatureVisited('keyboard-shortcuts').catch(() => {});
			return;
		}

		// w: Navigate to Waiting For
		if (event.key === 'w') {
			event.preventDefault();
			goto('/waiting');
			// Track keyboard shortcut usage
			markFeatureVisited('keyboard-shortcuts').catch(() => {});
			return;
		}

		// s: Navigate to Someday/Maybe
		if (event.key === 's') {
			event.preventDefault();
			goto('/someday');
			// Track keyboard shortcut usage
			markFeatureVisited('keyboard-shortcuts').catch(() => {});
			return;
		}

		// r: Navigate to Weekly Review
		if (event.key === 'r') {
			event.preventDefault();
			goto('/review');
			// Track keyboard shortcut usage
			markFeatureVisited('keyboard-shortcuts').catch(() => {});
			return;
		}

		// c: Navigate to Calendar
		if (event.key === 'c') {
			event.preventDefault();
			goto('/calendar');
			// Track keyboard shortcut usage
			markFeatureVisited('keyboard-shortcuts').catch(() => {});
			return;
		}
	}

	// Route-based feature tracking
	$effect(() => {
		const currentPath = $page.url.pathname;
		if (currentPath !== previousPath && (onboardingState.hasCompleted || onboardingState.hasSkipped)) {
			previousPath = currentPath;
			const feature = getFeatureFromRoute(currentPath);
			if (feature) {
				markFeatureVisited(feature).catch(() => {});
			}
		}
	});

	onMount(() => {
		// Set up theme listener for system preference changes
		const cleanup = theme.listen();

		// Check persistence status and show confirmation if granted (non-blocking)
		(async () => {
			await storageStatus.checkPersistence();
			if (storageStatus.persistenceState === 'GRANTED') {
				// Show confirmation toast on every load when storage is persistent
				const { toast } = await import('svelte-5-french-toast');
				toast.success('Storage is persistent', { duration: 3000 });
			}
		})();

		// Load onboarding state and show wizard if needed (non-blocking)
		(async () => {
			await onboardingState.loadState();
			const shouldShow = await onboardingState.shouldShowOnboarding();
			if (shouldShow) {
				onboardingState.startOnboarding();
			}
		})();

		return cleanup;
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<Toaster position="top-center" />

<div class="h-screen flex overflow-hidden bg-gray-50 dark:bg-gray-950 antialiased">
	<!-- Sidebar -->
	<Sidebar />

	<!-- Main Content Area -->
	<div class="flex-1 flex flex-col overflow-hidden">
		<!-- Top Bar with Search -->
		<header class="flex items-center px-6 py-3 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.1)] dark:shadow-[0_1px_3px_-1px_rgba(0,0,0,0.3)] bg-white dark:bg-gray-950 z-10">
			<div class="flex-1 max-w-xl">
				<SearchBar bind:this={searchBarRef} />
			</div>
		</header>

		<main class="flex-1 overflow-y-auto pb-6 bg-white dark:bg-gray-950">
			{@render children()}
		</main>

		<!-- Status Bar -->
		<StatusBar />
	</div>
</div>

<!-- Onboarding Wizard Overlay -->
{#if onboardingState.isActive}
	<OnboardingWizard />
{/if}
