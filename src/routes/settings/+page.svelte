<script lang="ts">
	import { onMount } from 'svelte';
	import { exportDatabase, importDatabase, downloadJSON } from '$lib/db/export';
	import { onboardingState } from '$lib/stores/onboarding.svelte';
	import { storageStatus } from '$lib/stores/storage.svelte';
	import { syncState } from '$lib/stores/sync.svelte';
	import { generatePairingCode, formatPairingCode, validatePairingCode, normalizePairingCode } from '$lib/sync/pair';
	import { toast } from 'svelte-5-french-toast';

	let isExporting = $state(false);
	let isImporting = $state(false);
	let isResettingOnboarding = $state(false);
	let isRequestingPersistence = $state(false);
	let statusMessage = $state('');
	let statusType = $state<'success' | 'error' | ''>('');

	// Device Sync state
	let generatedCode = $state('');
	let inputCode = $state('');
	let reentryCode = $state('');
	let isPairing = $state(false);
	let isSyncing = $state(false);
	let showUnpairConfirm = $state(false);

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

	// Device Sync functions
	function handleGenerateCode() {
		generatedCode = generatePairingCode();
	}

	async function handleCopyCode() {
		try {
			await navigator.clipboard.writeText(generatedCode);
			toast.success('Pairing code copied to clipboard');
		} catch (error) {
			toast.error('Failed to copy code');
		}
	}

	function formatInputCode(code: string): string {
		const cleaned = code.replace(/[-\s]/g, '').toUpperCase();
		if (cleaned.length <= 3) return cleaned;
		return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}`;
	}

	function handleInputCodeChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const formatted = formatInputCode(target.value);
		inputCode = formatted;
	}

	function handleReentryCodeChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const formatted = formatInputCode(target.value);
		reentryCode = formatted;
	}

	async function handlePairDevice() {
		if (!inputCode) {
			toast.error('Please enter a pairing code');
			return;
		}

		try {
			isPairing = true;
			const success = await syncState.pair(inputCode);

			if (success) {
				toast.success('Device paired successfully!');
				inputCode = '';
				generatedCode = '';
			} else {
				toast.error(syncState.lastError || 'Failed to pair device');
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to pair device');
		} finally {
			isPairing = false;
		}
	}

	async function handleSetPairingCode() {
		if (!reentryCode) {
			toast.error('Please enter your pairing code');
			return;
		}

		try {
			if (!validatePairingCode(reentryCode)) {
				toast.error('Invalid pairing code format');
				return;
			}

			syncState.setPairingCode(reentryCode);
			toast.success('Pairing code set. Sync ready.');
			reentryCode = '';

			// Trigger a sync
			await handleForceSync();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Invalid pairing code');
		}
	}

	async function handleForceSync() {
		try {
			isSyncing = true;
			await syncState.forceSync();

			if (syncState.lastError) {
				toast.error(`Sync failed: ${syncState.lastError}`);
			} else {
				toast.success('Sync completed successfully');
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Sync failed');
		} finally {
			isSyncing = false;
		}
	}

	async function handleUnpair() {
		showUnpairConfirm = false;
		try {
			await syncState.unpair();
			toast.success('Device unpaired');
			generatedCode = '';
			inputCode = '';
			reentryCode = '';
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to unpair');
		}
	}

	function formatSyncTime(): string {
		if (!syncState.lastSyncTime) return 'Never';
		const now = Date.now();
		const then = syncState.lastSyncTime.getTime();
		const seconds = Math.floor((now - then) / 1000);

		if (seconds < 60) return `${seconds} seconds ago`;
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
		const days = Math.floor(hours / 24);
		return `${days} day${days === 1 ? '' : 's'} ago`;
	}

	onMount(async () => {
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

	<!-- Device Sync Section (full width) -->
	<div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 p-4 tablet:p-6 mt-4">
		<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Device Sync</h2>

		{#if !syncState.isPaired}
			<!-- Not Paired State -->
			<p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
				Sync your GTD data across devices. Data is encrypted end-to-end using your pairing code.
			</p>

			<!-- Start New Pair -->
			<div class="mb-6">
				<h3 class="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">Start New Pair</h3>
				{#if !generatedCode}
					<button
						onclick={handleGenerateCode}
						class="w-full phablet:w-auto px-4 py-2.5 min-h-11 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-md text-base font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 active:scale-[0.98]"
					>
						Generate Pairing Code
					</button>
				{:else}
					<div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4 mb-2">
						<p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
							Enter this code on your other device to link them:
						</p>
						<div class="flex items-center gap-2">
							<div class="text-2xl font-mono font-bold text-blue-700 dark:text-blue-300">
								{generatedCode}
							</div>
							<button
								onclick={handleCopyCode}
								class="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
							>
								Copy
							</button>
						</div>
					</div>
				{/if}
			</div>

			<!-- Join Existing Pair -->
			<div>
				<h3 class="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">Join Existing Pair</h3>
				<label for="pairing-code-input" class="block text-sm text-gray-600 dark:text-gray-400 mb-2">
					Enter pairing code from other device
				</label>
				<div class="flex flex-col phablet:flex-row gap-2">
					<input
						id="pairing-code-input"
						type="text"
						bind:value={inputCode}
						oninput={handleInputCodeChange}
						placeholder="XXX-XXX"
						maxlength="7"
						class="flex-1 px-3 py-2.5 text-base text-center font-mono uppercase bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					/>
					<button
						onclick={handlePairDevice}
						disabled={isPairing || !inputCode}
						class="px-4 py-2.5 min-h-11 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-md text-base font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 active:scale-[0.98]"
					>
						{isPairing ? 'Pairing...' : 'Pair Device'}
					</button>
				</div>
			</div>
		{:else}
			<!-- Paired State -->
			<div class="flex items-center gap-2 mb-4">
				<span class="w-3 h-3 rounded-full bg-green-500"></span>
				<span class="text-sm font-medium text-green-700 dark:text-green-400">Paired</span>
			</div>

			<!-- Pairing code re-entry if needed -->
			{#if !syncState.hasPairingCode()}
				<div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-4 mb-4">
					<p class="text-sm text-amber-800 dark:text-amber-300 font-medium mb-2">
						Pairing code needed for sync. Re-enter to resume syncing.
					</p>
					<div class="flex flex-col phablet:flex-row gap-2">
						<input
							type="text"
							bind:value={reentryCode}
							oninput={handleReentryCodeChange}
							placeholder="XXX-XXX"
							maxlength="7"
							class="flex-1 px-3 py-2.5 text-base text-center font-mono uppercase bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
						/>
						<button
							onclick={handleSetPairingCode}
							disabled={!reentryCode}
							class="px-4 py-2.5 min-h-11 bg-amber-600 text-white rounded-md text-base font-medium hover:bg-amber-700 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
						>
							Re-enter Code
						</button>
					</div>
				</div>
			{/if}

			<!-- Sync Status -->
			<div class="mb-4 text-sm">
				<div class="flex items-center gap-2 mb-1">
					<span class="text-gray-600 dark:text-gray-400">Last synced:</span>
					<span class="text-gray-900 dark:text-gray-100 font-medium tabular-nums">
						{formatSyncTime()}
					</span>
				</div>

				{#if syncState.syncState !== 'idle' && syncState.syncState !== 'error'}
					<div class="flex items-center gap-2 text-blue-600 dark:text-blue-400">
						<svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						<span class="capitalize">{syncState.syncState}...</span>
					</div>
				{/if}

				{#if syncState.syncState === 'error' && syncState.lastError}
					<div class="text-red-600 dark:text-red-400 mt-1">
						Error: {syncState.lastError}
					</div>
				{/if}
			</div>

			<!-- Actions -->
			<div class="flex flex-col phablet:flex-row gap-2">
				<button
					onclick={handleForceSync}
					disabled={isSyncing || !syncState.hasPairingCode()}
					class="px-4 py-2.5 min-h-11 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-md text-base font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 active:scale-[0.98]"
				>
					{isSyncing ? 'Syncing...' : 'Sync Now'}
				</button>
				<button
					onclick={() => showUnpairConfirm = true}
					class="px-4 py-2.5 min-h-11 bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-md text-base font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 active:scale-[0.98]"
				>
					Unpair Device
				</button>
			</div>

			<!-- Unpair Confirmation Modal -->
			{#if showUnpairConfirm}
				<div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
					<div class="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-800">
						<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Unpair Device?</h3>
						<p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
							This will remove sync pairing from this device. Your data will remain on this device, but will no longer sync with other devices. You'll need to re-pair to sync again.
						</p>
						<div class="flex gap-2">
							<button
								onclick={handleUnpair}
								class="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
							>
								Unpair
							</button>
							<button
								onclick={() => showUnpairConfirm = false}
								class="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			{/if}
		{/if}
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
