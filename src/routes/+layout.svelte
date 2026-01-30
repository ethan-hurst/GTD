<script>
	import { onMount } from 'svelte';
	import '../app.css';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import StatusBar from '$lib/components/StatusBar.svelte';
	import { theme } from '$lib/stores/theme.svelte';
	import { storageStatus } from '$lib/stores/storage.svelte';

	const { children } = $props();

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

<div class="h-screen flex overflow-hidden">
	<!-- Sidebar -->
	<Sidebar />

	<!-- Main Content Area -->
	<div class="flex-1 flex flex-col overflow-hidden">
		<main class="flex-1 overflow-y-auto pb-9">
			{@render children()}
		</main>

		<!-- Status Bar -->
		<StatusBar />
	</div>
</div>
