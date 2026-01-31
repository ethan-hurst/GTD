<script lang="ts">
	import { onMount } from 'svelte';
	import { storageStatus } from '$lib/stores/storage.svelte';
	import { toast } from 'svelte-5-french-toast';

	let intervalId: number | null = null;
	let isRequesting = $state(false);

	function formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
	}

	function formatQuota(): string {
		const usedMB = storageStatus.usage / (1024 * 1024);
		const totalMB = storageStatus.quota / (1024 * 1024);
		const percentage = storageStatus.quota > 0
			? ((storageStatus.usage / storageStatus.quota) * 100).toFixed(1)
			: '0.0';
		return `${percentage}% (${usedMB.toFixed(1)} MB / ${totalMB.toFixed(0)} MB)`;
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

	async function requestPersistentStorage() {
		try {
			isRequesting = true;
			const granted = await storageStatus.requestPersistence();

			if (granted) {
				toast.success('Storage is now persistent!');
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
			isRequesting = false;
		}
	}

	function hasStorageAPI(): boolean {
		return typeof navigator !== 'undefined' &&
		       navigator.storage !== undefined &&
		       typeof navigator.storage.persisted === 'function';
	}

	onMount(() => {
		storageStatus.checkPersistence();
		storageStatus.updateQuota();

		intervalId = window.setInterval(() => {
			storageStatus.updateQuota();
		}, 30000); // 30 seconds

		return () => {
			if (intervalId !== null) {
				clearInterval(intervalId);
			}
		};
	});
</script>

<footer class="border-t border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-900/50 h-9 flex items-center px-6 py-1.5 text-xs text-gray-400 dark:text-gray-500">
	<!-- Persistence Status -->
	<div class="flex items-center gap-2">
		{#if !hasStorageAPI()}
			<!-- Gray dot - API not available -->
			<span class="flex items-center gap-1.5">
				<span class="w-2 h-2 rounded-full bg-gray-400"></span>
				<span>Storage API unavailable</span>
			</span>
		{:else if storageStatus.persistenceState === 'GRANTED'}
			<!-- Green dot - persistent -->
			<span class="flex items-center gap-1.5">
				<span class="w-2 h-2 rounded-full bg-green-500"></span>
				<span>Persistent</span>
			</span>
		{:else if storageStatus.persistenceState === 'DENIED'}
			<!-- Red dot - denied with retry option -->
			<button
				onclick={requestPersistentStorage}
				disabled={isRequesting}
				class="flex items-center gap-1.5 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
			>
				<span class="w-2 h-2 rounded-full bg-red-500"></span>
				{#if isRequesting}
					<span>Requesting...</span>
				{:else}
					<span>Denied - Retry</span>
				{/if}
			</button>
		{:else}
			<!-- Amber dot - not persistent (UNKNOWN) -->
			<button
				onclick={requestPersistentStorage}
				disabled={isRequesting}
				class="flex items-center gap-1.5 hover:text-amber-600 dark:hover:text-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
			>
				<span class="w-2 h-2 rounded-full bg-amber-500"></span>
				{#if isRequesting}
					<span>Requesting...</span>
				{:else}
					<span>Not Persistent - Click to request</span>
				{/if}
			</button>
		{/if}
	</div>

	<!-- Storage Quota (only show when persistent) -->
	{#if storageStatus.persistenceState === 'GRANTED' && storageStatus.quota > 0}
		<div class="flex-1 text-center">
			Storage: {formatQuota()}
		</div>
	{:else}
		<div class="flex-1"></div>
	{/if}

	<!-- Last Save Time -->
	<div>
		Last save: {formatLastSave()}
	</div>
</footer>
