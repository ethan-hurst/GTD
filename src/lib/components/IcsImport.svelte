<script lang="ts">
	import { parseICS, validateICS } from '$lib/utils/ics-parser';
	import { calendarState } from '$lib/stores/calendar.svelte';
	import type { CalendarEvent } from '$lib/db/schema';

	interface IcsImportProps {
		onClose: () => void;
		onImported: () => void;
	}

	let { onClose, onImported }: IcsImportProps = $props();

	let fileInput: HTMLInputElement | null = $state(null);
	let dragActive = $state(false);
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let previewEvents = $state<Omit<CalendarEvent, 'id' | 'created' | 'modified'>[] | null>(null);
	let filename = $state<string>('');

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			processFile(target.files[0]);
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		dragActive = true;
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		dragActive = false;
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragActive = false;

		if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
			processFile(event.dataTransfer.files[0]);
		}
	}

	async function processFile(file: File) {
		error = null;
		isLoading = true;
		filename = file.name;

		try {
			const content = await file.text();

			// Validate ICS format
			if (!validateICS(content)) {
				error = 'Invalid ICS file format. File must start with BEGIN:VCALENDAR';
				isLoading = false;
				return;
			}

			// Parse ICS content
			const events = parseICS(content, file.name);

			if (events.length === 0) {
				error = 'No events found in ICS file';
				isLoading = false;
				return;
			}

			// Show preview
			previewEvents = events;
			isLoading = false;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to parse ICS file';
			isLoading = false;
		}
	}

	async function handleImport() {
		if (!previewEvents || previewEvents.length === 0) return;

		isLoading = true;
		error = null;

		try {
			await calendarState.bulkImport(previewEvents);

			// Show success (parent component should handle toast)
			onImported();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to import events';
			isLoading = false;
		}
	}

	function reset() {
		previewEvents = null;
		error = null;
		filename = '';
		if (fileInput) {
			fileInput.value = '';
		}
	}
</script>

<!-- Modal overlay -->
<div
	class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 tablet:flex tablet:items-center tablet:justify-center tablet:p-4"
	onclick={(e) => {
		if (e.target === e.currentTarget) onClose();
	}}
	role="dialog"
	aria-modal="true"
	aria-labelledby="import-title"
>
	<!-- Modal card -->
	<div class="bg-white dark:bg-gray-950 tablet:dark:bg-gray-900 tablet:rounded-xl shadow-2xl h-full tablet:h-auto tablet:max-w-lg w-full p-4 tablet:p-6 overflow-y-auto pb-[env(safe-area-inset-bottom,0px)]">
		<div class="flex items-center justify-between mb-4">
			<h2 id="import-title" class="text-xl font-semibold text-gray-900 dark:text-white">
				Import Calendar Events
			</h2>
			<button
				onclick={onClose}
				class="p-2 min-w-11 min-h-11 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
				aria-label="Close"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		{#if !previewEvents}
			<!-- File upload area -->
			<div
				class="border-2 border-dashed rounded-lg p-8 min-h-32 text-center transition-colors {dragActive
					? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
					: 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'}"
				ondragover={handleDragOver}
				ondragleave={handleDragLeave}
				ondrop={handleDrop}
			>
				<input
					bind:this={fileInput}
					type="file"
					accept=".ics,.ical,.ifb,.icalendar"
					onchange={handleFileSelect}
					class="hidden"
					id="ics-file-input"
				/>

				<label
					for="ics-file-input"
					class="cursor-pointer flex flex-col items-center gap-3"
				>
					<svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
					</svg>

					<div class="text-base text-gray-600 dark:text-gray-400">
						<span class="font-semibold text-blue-600 dark:text-blue-400">Tap to select file</span>
						<span class="hidden tablet:inline"> or drag and drop</span>
					</div>

					<p class="text-xs text-gray-500 dark:text-gray-500">
						.ics, .ical, .ifb, or .icalendar files
					</p>
				</label>
			</div>

			{#if error}
				<div class="mt-4 p-3 rounded bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
					<p class="text-sm text-red-800 dark:text-red-300">{error}</p>
				</div>
			{/if}

			{#if isLoading}
				<div class="mt-4 flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400">
					<svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
					<span class="text-sm">Processing file...</span>
				</div>
			{/if}
		{:else}
			<!-- Preview and import -->
			<div class="space-y-4">
				<div class="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
					<p class="text-sm text-green-800 dark:text-green-300">
						<strong>Found {previewEvents.length} event{previewEvents.length === 1 ? '' : 's'}</strong> in {filename}
					</p>
					<p class="text-xs text-green-700 dark:text-green-400 mt-1">
						Ready to import all events to your calendar
					</p>
				</div>

				{#if error}
					<div class="p-3 rounded bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
						<p class="text-sm text-red-800 dark:text-red-300">{error}</p>
					</div>
				{/if}

				<!-- Action buttons -->
				<div class="flex flex-col tablet:flex-row gap-3 tablet:justify-end">
					<button
						onclick={reset}
						disabled={isLoading}
						class="w-full tablet:w-auto px-4 py-2.5 min-h-11 text-base font-medium rounded border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
					>
						Cancel
					</button>
					<button
						onclick={handleImport}
						disabled={isLoading}
						class="w-full tablet:w-auto px-4 py-2.5 min-h-11 text-base font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
					>
						{#if isLoading}
							<svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							Importing...
						{:else}
							Import All
						{/if}
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
