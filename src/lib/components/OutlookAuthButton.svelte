<script lang="ts">
	import { authState } from '$lib/stores/auth.svelte';

	// Initialize auth state on mount
	$effect(() => {
		authState.init();
	});

	function handleConnect() {
		authState.connect();
	}

	function handleDisconnect() {
		if (confirm('Disconnect from Outlook? This will remove all synced calendar events.')) {
			authState.disconnect();
		}
	}

	function handleClearError() {
		authState.clearError();
	}
</script>

<div class="space-y-3">
	{#if authState.isAuthenticated}
		<!-- Connected state: Show user info and disconnect button -->
		<div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
			<div class="flex items-start justify-between gap-3">
				<div class="flex items-center gap-3 min-w-0 flex-1">
					<!-- Microsoft icon -->
					<div class="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
						<svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
							<path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z"/>
						</svg>
					</div>

					<!-- User info -->
					<div class="min-w-0 flex-1">
						<p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
							{authState.userName || 'Unknown User'}
						</p>
						<p class="text-xs text-gray-500 dark:text-gray-400 truncate">
							{authState.userEmail || ''}
						</p>
					</div>
				</div>

				<!-- Disconnect button -->
				<button
					onclick={handleDisconnect}
					disabled={authState.isLoading}
					class="flex-shrink-0 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-10"
					title="Disconnect from Outlook"
				>
					{authState.isLoading ? 'Disconnecting...' : 'Disconnect'}
				</button>
			</div>
		</div>

	{:else}
		<!-- Not connected state: Show connect button -->
		<button
			onclick={handleConnect}
			disabled={authState.isLoading}
			class="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm min-h-10"
		>
			{#if authState.isLoading}
				<!-- Loading spinner -->
				<svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
				</svg>
				<span>Connecting...</span>
			{:else}
				<!-- Microsoft icon -->
				<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
					<path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z"/>
				</svg>
				<span>Connect to Outlook</span>
			{/if}
		</button>
	{/if}

	<!-- Error message -->
	{#if authState.error}
		<div class="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3">
			<div class="flex items-start justify-between gap-2">
				<div class="flex items-start gap-2 min-w-0 flex-1">
					<svg class="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<p class="text-sm text-red-800 dark:text-red-200">
						{authState.error}
					</p>
				</div>
				<button
					onclick={handleClearError}
					class="flex-shrink-0 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 focus:outline-none"
					title="Dismiss error"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
		</div>
	{/if}
</div>
