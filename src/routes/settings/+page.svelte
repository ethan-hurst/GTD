<script lang="ts">
	import { exportDatabase, importDatabase, downloadJSON } from '$lib/db/export';

	let isExporting = $state(false);
	let isImporting = $state(false);
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
</script>

<div class="max-w-2xl mx-auto p-8">
	<!-- Header -->
	<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">Settings</h1>

	<!-- Status Message -->
	{#if statusMessage}
		<div
			class="mb-6 p-4 rounded-md {statusType === 'success'
				? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
				: 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'}"
		>
			{statusMessage}
		</div>
	{/if}

	<!-- Export Section -->
	<div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 mb-6">
		<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Data Export</h2>
		<p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
			Download a backup of all your data in JSON format. This includes all tasks, lists, and settings.
		</p>
		<button
			onclick={handleExport}
			disabled={isExporting}
			class="px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-md text-sm font-medium
				hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
		>
			{isExporting ? 'Exporting...' : 'Export Data'}
		</button>
	</div>

	<!-- Import Section -->
	<div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
		<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Data Import</h2>
		<p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
			Restore data from a previously exported JSON file.
		</p>
		<div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 mb-4">
			<p class="text-sm text-amber-800 dark:text-amber-300 font-medium">
				⚠️ Warning: This will replace all existing data
			</p>
		</div>
		<button
			onclick={handleImport}
			disabled={isImporting}
			class="px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-md text-sm font-medium
				hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
		>
			{isImporting ? 'Importing...' : 'Import Data'}
		</button>
	</div>
</div>
