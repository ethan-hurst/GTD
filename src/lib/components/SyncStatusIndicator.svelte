<script lang="ts">
	import { outlookSyncState } from '$lib/stores/outlook-sync.svelte';

	/**
	 * Format relative time from a date.
	 * Returns: "now", "X min ago", "X hours ago", "yesterday", or date string.
	 */
	function formatRelativeTime(date: Date | null): string {
		if (!date) return 'Never synced';

		const now = Date.now();
		const diff = now - date.getTime();
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);

		if (minutes < 1) return 'now';
		if (minutes < 60) return `${minutes} min ago`;
		if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
		if (days === 1) return 'yesterday';

		// Format as date string
		return date.toLocaleDateString();
	}

	// Reactive computed value for relative time
	let relativeTime = $derived(formatRelativeTime(outlookSyncState.lastSyncTime));
</script>

<div class="flex items-center gap-2 text-sm">
	<!-- Status indicator dot -->
	<div class="relative flex items-center justify-center w-2 h-2">
		{#if outlookSyncState.isSyncing}
			<!-- Pulsing blue dot for syncing -->
			<span class="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 animate-ping"></span>
			<span class="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
		{:else if outlookSyncState.hasError}
			<!-- Red dot for error -->
			<span class="inline-flex rounded-full h-2 w-2 bg-red-500"></span>
		{:else if outlookSyncState.lastSyncTime}
			<!-- Green dot for successful sync -->
			<span class="inline-flex rounded-full h-2 w-2 bg-green-500"></span>
		{:else}
			<!-- Gray dot for never synced -->
			<span class="inline-flex rounded-full h-2 w-2 bg-gray-400"></span>
		{/if}
	</div>

	<!-- Status text -->
	<span class="text-gray-600 dark:text-gray-400">
		{#if outlookSyncState.isSyncing}
			Syncing...
		{:else}
			Last sync: {relativeTime}
		{/if}
	</span>

	<!-- Error indicator (clickable to show details) -->
	{#if outlookSyncState.hasError}
		<button
			class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 focus:outline-none"
			title={outlookSyncState.error || 'Sync error'}
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
		</button>
	{/if}
</div>
