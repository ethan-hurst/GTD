<script lang="ts">
	import { outlookSyncState } from '$lib/stores/outlook-sync.svelte';

	function handleSync() {
		outlookSyncState.syncAll();
	}
</script>

<button
	onclick={handleSync}
	disabled={outlookSyncState.isSyncing}
	class="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border shadow-sm transition-all min-h-10
		focus:outline-none focus:ring-2 focus:ring-blue-500/40
		{outlookSyncState.hasError
			? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30'
			: 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}
		disabled:opacity-50 disabled:cursor-not-allowed"
	title={outlookSyncState.hasError ? 'Retry sync' : 'Sync Outlook calendars'}
>
	{#if outlookSyncState.isSyncing}
		<!-- Loading spinner -->
		<svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
			<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
		</svg>
		<span>
			{#if outlookSyncState.syncProgress.total > 1}
				Syncing ({outlookSyncState.syncProgress.current}/{outlookSyncState.syncProgress.total})
			{:else}
				Syncing...
			{/if}
		</span>
	{:else if outlookSyncState.hasError}
		<!-- Error state: warning icon -->
		<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
		</svg>
		<span>Retry Sync</span>
	{:else}
		<!-- Idle state: refresh icon -->
		<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
		</svg>
		<span>Sync Now</span>
	{/if}
</button>
