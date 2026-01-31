<script lang="ts">
	import { onMount } from 'svelte';
	import { storageStatus } from '$lib/stores/storage.svelte';

	let intervalId: number | null = null;

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

	async function requestPersistentStorage() {
		await storageStatus.requestPersistence();
		await storageStatus.checkPersistence();
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
		{#if storageStatus.isPersistent}
			<span class="flex items-center gap-1.5">
				<span class="w-2 h-2 rounded-full bg-green-500"></span>
				<span>Persistent</span>
			</span>
		{:else}
			<button
				onclick={requestPersistentStorage}
				class="flex items-center gap-1.5 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
			>
				<span class="w-2 h-2 rounded-full bg-amber-500"></span>
				<span>Not Persistent - Click to request</span>
			</button>
		{/if}
	</div>

	<!-- Storage Quota -->
	<div class="flex-1 text-center">
		Storage: {formatQuota()}
	</div>

	<!-- Last Save Time -->
	<div>
		Last save: {formatLastSave()}
	</div>
</footer>
