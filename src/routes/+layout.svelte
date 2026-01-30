<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import StatusBar from '$lib/components/StatusBar.svelte';
	import { Toaster } from 'svelte-5-french-toast';
	import { goto } from '$app/navigation';
	import { theme } from '$lib/stores/theme.svelte';
	import { storageStatus } from '$lib/stores/storage.svelte';

	const { children } = $props();
	let searchBarRef: any;

	// Global keyboard shortcut handler
	function handleKeydown(event: KeyboardEvent) {
		const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
		const modifierKey = isMac ? event.metaKey : event.ctrlKey;

		// Cmd/Ctrl + K: Focus search (always handle, even in inputs)
		if (modifierKey && event.key === 'k') {
			event.preventDefault();
			searchBarRef?.focus();
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
			return;
		}

		// n: Navigate to Next Actions
		if (event.key === 'n') {
			event.preventDefault();
			goto('/actions');
			return;
		}

		// p: Navigate to Projects
		if (event.key === 'p') {
			event.preventDefault();
			goto('/projects');
			return;
		}
	}

	onMount(() => {
		// Set up theme listener for system preference changes
		const cleanup = theme.listen();

		// Request persistent storage (non-blocking)
		storageStatus.requestPersistence().catch(() => {
			// Silently fail if not supported or denied
		});

		return cleanup;
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<Toaster position="top-center" />

<div class="h-screen flex overflow-hidden">
	<!-- Sidebar -->
	<Sidebar />

	<!-- Main Content Area -->
	<div class="flex-1 flex flex-col overflow-hidden">
		<!-- Top Bar with Search -->
		<header class="flex items-center px-6 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
			<div class="flex-1 max-w-xl">
				<SearchBar bind:this={searchBarRef} />
			</div>
		</header>

		<main class="flex-1 overflow-y-auto pb-9">
			{@render children()}
		</main>

		<!-- Status Bar -->
		<StatusBar />
	</div>
</div>
