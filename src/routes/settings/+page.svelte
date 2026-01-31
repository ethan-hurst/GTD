<script lang="ts">
	import { onMount } from 'svelte';
	import { exportDatabase, importDatabase, downloadJSON } from '$lib/db/export';
	import { onboardingState } from '$lib/stores/onboarding.svelte';
	import { storageStatus } from '$lib/stores/storage.svelte';
	import { toast } from 'svelte-5-french-toast';

	let isExporting = $state(false);
	let isImporting = $state(false);
	let isResettingOnboarding = $state(false);
	let isRequestingPersistence = $state(false);
	let statusMessage = $state('');
	let statusType = $state<'success' | 'error' | ''>('');

	async function handleExport() {
		try {
			isExporting = true;
			statusMessage = '';
			const jsonData = await exportDatabase();
			const filename = `gtd-backup-${new Date().toISOString().split('T')[0]}.json`;
			downloadJSON(jsonData, filename);
			statusMessage = 'Data exported successfully';
			statusType = 'success';
		} catch (error) {
			statusMessage = `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
			statusType = 'error';
		} finally {
			isExporting = false;
		}
	}

	async function handleImport() {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = 'application/json';

		input.onchange = async (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (!file) return;

			try {
				isImporting = true;
				statusMessage = '';
				const text = await file.text();
				await importDatabase(text);
				statusMessage = 'Data imported successfully. Reload to see changes.';
				statusType = 'success';
			} catch (error) {
				statusMessage = `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
				statusType = 'error';
			} finally {
				isImporting = false;
			}
		};

		input.click();
	}

	async function handleResetOnboarding() {
		const confirmed = window.confirm(
			'This will reset the walkthrough and all feature hints. Continue?'
		);

		if (!confirmed) return;

		try {
			isResettingOnboarding = true;
			statusMessage = '';
			await onboardingState.resetOnboarding();
			statusMessage = 'Onboarding reset. Refresh to see the walkthrough again.';
			statusType = 'success';
		} catch (error) {
			statusMessage = `Reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
			statusType = 'error';
		} finally {
			isResettingOnboarding = false;
		}
	}

	async function handleRequestPersistence() {
		try {
			isRequestingPersistence = true;
			const granted = await storageStatus.requestPersistence();

			if (granted) {
				toast.success('Storage is now persistent! Your data is safe.');
				await storageStatus.updateQuota();
			} else {
				// Denied - show browser-specific guidance
				const browser = detectBrowser();
				const guidance = getBrowserGuidance(browser);
				toast.error(guidance, { duration: 8000 });
			}
		} catch (error) {
			toast.error(`Failed to request persistence: ${error instanceof Error ? error.message : 'Unknown error'}`);
		} finally {
			isRequestingPersistence = false;
		}
	}

	function detectBrowser(): string {
		const ua = navigator.userAgent;
		if (ua.includes('Chrome') && !ua.includes('Edg')) return 'chrome';
		if (ua.includes('Safari') && !ua.includes('Chrome')) return 'safari';
		if (ua.includes('Firefox')) return 'firefox';
		if (ua.includes('Edg')) return 'edge';
		return 'unknown';
	}

	function getBrowserGuidance(browser: string): string {
		switch (browser) {
			case 'chrome':
				return 'Persistent storage denied. Try bookmarking this app (Ctrl/Cmd+D) or installing it as a PWA.';
			case 'safari':
				return 'Persistent storage denied. Try adding this app to your home screen for reliable storage.';
			case 'firefox':
				return 'Persistent storage denied. Firefox may deny persistence in private browsing mode.';
			case 'edge':
				return 'Persistent storage denied. Try bookmarking this app or installing it as a PWA.';
			default:
				return 'Persistent storage denied. Try bookmarking this app or using it more frequently.';
		}
	}

	function formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
	}

	function formatLastSave(): string {
		if (!storageStatus.lastSaveTime) return 'Never';
		const now = Date.now();
		const then = storageStatus.lastSaveTime.getTime();
		const seconds = Math.floor((now - then) / 1000);

		if (seconds < 60) return `${seconds}s ago`;
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		return `${days}d ago`;
	}

	function getQuotaPercentage(): number {
		if (storageStatus.quota === 0) return 0;
		return (storageStatus.usage / storageStatus.quota) * 100;
	}

	function getQuotaColor(): string {
		const percentage = getQuotaPercentage();
		if (percentage > 90) return 'bg-red-500';
		if (percentage > 75) return 'bg-amber-500';
		return 'bg-green-500';
	}

	onMount(() => {
		// Check persistence status on mount
		storageStatus.checkPersistence();
		storageStatus.updateQuota();

		// Show persistent storage confirmation if granted
		if (storageStatus.persistenceState === 'GRANTED') {
			toast.success('Storage is persistent', { duration: 3000 });
		}
	});
</script>

<div class="max-w-4xl mx-auto p-4 tablet:p-6">
	<!-- Header -->
	<h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">Settings</h1>

	<!-- Status Message -->
	{#if statusMessage}
		<div
			class="mb-6 p-4 rounded-md shadow-sm {statusType === 'success'
				? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
				: 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'}"
		>
			{statusMessage}
		</div>
	{/if}

	<!-- Cards grid: single column on mobile, two columns on tablet+ -->
	<div class="grid grid-cols-1 tablet:grid-cols-2 gap-4">
		<!-- Export Section -->
		<div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 p-4 tablet:p-6">
			<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Data Export</h2>
			<p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
				Download a backup of all your data in JSON format. This includes all tasks, lists, and settings.
			</p>
			<button
				onclick={handleExport}
				disabled={isExporting}
				class="w-full phablet:w-auto px-4 py-2.5 min-h-11 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-md text-base font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 active:scale-[0.98]"
			>
				{isExporting ? 'Exporting...' : 'Export Data'}
			</button>
		</div>

		<!-- Import Section -->
		<div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 p-4 tablet:p-6">
			<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Data Import</h2>
			<p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
				Restore data from a previously exported JSON file.
			</p>
			<div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 mb-4 shadow-sm">
				<p class="text-sm text-amber-800 dark:text-amber-300 font-medium">
					Warning: This will replace all existing data
				</p>
			</div>
			<button
				onclick={handleImport}
				disabled={isImporting}
				class="w-full phablet:w-auto px-4 py-2.5 min-h-11 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-md text-base font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 active:scale-[0.98]"
			>
				{isImporting ? 'Importing...' : 'Import Data'}
			</button>
		</div>
	</div>

	<!-- Storage Section (full width) -->
	<div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 p-4 tablet:p-6 mt-4">
		<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Storage</h2>
		<p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
			Persistent storage ensures your data won't be deleted when the browser needs space.
		</p>

		<!-- Persistence Status -->
		<div class="mb-4">
			{#if storageStatus.persistenceState === 'GRANTED'}
				<div class="flex items-center gap-2 text-green-700 dark:text-green-400">
					<span class="w-3 h-3 rounded-full bg-green-500"></span>
					<span class="font-medium">Storage is persistent</span>
				</div>
				<p class="text-xs text-gray-600 dark:text-gray-400 mt-1 ml-5">
					Your data is protected from automatic deletion.
				</p>
			{:else if storageStatus.persistenceState === 'DENIED'}
				<div class="flex items-center gap-2 text-red-700 dark:text-red-400">
					<span class="w-3 h-3 rounded-full bg-red-500"></span>
					<span class="font-medium">Persistent storage denied</span>
				</div>
				<p class="text-xs text-gray-600 dark:text-gray-400 mt-1 ml-5">
					Your browser declined the request. Try bookmarking this app or using it more frequently.
				</p>
			{:else}
				<div class="flex items-center gap-2 text-amber-700 dark:text-amber-400">
					<span class="w-3 h-3 rounded-full bg-amber-500"></span>
					<span class="font-medium">Storage is not persistent</span>
				</div>
				<p class="text-xs text-gray-600 dark:text-gray-400 mt-1 ml-5">
					Your data may be deleted if the browser needs space.
				</p>
			{/if}
		</div>

		<!-- Storage Quota (only show when persistent) -->
		{#if storageStatus.persistenceState === 'GRANTED' && storageStatus.quota > 0}
			<div class="mb-4">
				<div class="flex items-center justify-between text-sm mb-1">
					<span class="text-gray-600 dark:text-gray-400">Storage Used</span>
					<span class="text-gray-900 dark:text-gray-100 font-medium tabular-nums">
						{formatBytes(storageStatus.usage)} / {formatBytes(storageStatus.quota)}
						({getQuotaPercentage().toFixed(1)}%)
					</span>
				</div>
				<div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
					<div
						class="{getQuotaColor()} h-full transition-all duration-300"
						style="width: {getQuotaPercentage()}%"
					></div>
				</div>
			</div>
		{/if}

		<!-- Last Save Time -->
		<div class="mb-4 text-sm">
			<span class="text-gray-600 dark:text-gray-400">Last saved:</span>
			<span class="text-gray-900 dark:text-gray-100 font-medium ml-1 tabular-nums">
				{formatLastSave()}
			</span>
		</div>

		<!-- Request/Retry Button -->
		{#if storageStatus.persistenceState !== 'GRANTED'}
			<button
				onclick={handleRequestPersistence}
				disabled={isRequestingPersistence}
				class="w-full phablet:w-auto px-4 py-2.5 min-h-11 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-md text-base font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 active:scale-[0.98]"
			>
				{#if isRequestingPersistence}
					<span class="flex items-center gap-2">
						<svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						Requesting...
					</span>
				{:else}
					{storageStatus.persistenceState === 'DENIED' ? 'Retry Request' : 'Enable Persistent Storage'}
				{/if}
			</button>
		{/if}

		<!-- Explanation -->
		<div class="mt-4 text-xs text-gray-500 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-md p-3">
			<p class="font-medium mb-1">What is persistent storage?</p>
			<p>
				Persistent storage prevents the browser from automatically deleting your data when disk space runs low.
				Without it, all your tasks, projects, and settings could be lost.
			</p>
		</div>
	</div>

	<!-- Onboarding Section (full width) -->
	<div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 p-4 tablet:p-6 mt-4">
		<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Onboarding</h2>
		<p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
			Reset the onboarding walkthrough and re-enable all contextual hints.
		</p>
		<button
			onclick={handleResetOnboarding}
			disabled={isResettingOnboarding}
			class="w-full phablet:w-auto px-4 py-2.5 min-h-11 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-md text-base font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 active:scale-[0.98]"
		>
			{isResettingOnboarding ? 'Resetting...' : 'Reset Onboarding'}
		</button>
	</div>
</div>
