<script lang="ts">
	import { outlookSyncState } from '$lib/stores/outlook-sync.svelte';
	import { onMount } from 'svelte';

	onMount(async () => {
		await outlookSyncState.loadSyncMeta();
	});

	async function handleToggle(calendarId: string, currentState: boolean) {
		await outlookSyncState.toggleCalendar(calendarId, !currentState);
	}

	// Count enabled calendars
	let enabledCount = $derived(outlookSyncState.calendars.filter(c => c.enabled).length);
	let totalCount = $derived(outlookSyncState.calendars.length);
</script>

{#if outlookSyncState.calendars.length > 0}
	<div class="space-y-2">
		<!-- Header with count badge -->
		<div class="flex items-center justify-between px-4 py-2">
			<h3 class="text-sm font-medium text-gray-900 dark:text-gray-100">
				Calendars
			</h3>
			<span class="text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
				{enabledCount} of {totalCount} enabled
			</span>
		</div>

		<!-- Calendar list -->
		<div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
			{#each outlookSyncState.calendars as calendar, index (calendar.id)}
				<div
					class="flex items-center gap-3 py-3 px-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors
						{index !== outlookSyncState.calendars.length - 1 ? 'border-b border-gray-200 dark:border-gray-700' : ''}"
				>
					<!-- Color dot -->
					<div
						class="flex-shrink-0 w-3 h-3 rounded-full"
						style="background-color: {calendar.color || '#6B7280'}"
					></div>

					<!-- Calendar name -->
					<div class="flex-1 min-w-0">
						<p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
							{calendar.calendarName}
						</p>
						{#if calendar.calendarId && outlookSyncState.calendars.some(c => c.calendarId === calendar.calendarId && (c.color?.toLowerCase().includes('default') || calendar.calendarName.toLowerCase().includes('calendar')))}
							<span class="text-xs text-gray-500 dark:text-gray-400">Default</span>
						{/if}
					</div>

					<!-- Toggle switch -->
					<button
						onclick={() => handleToggle(calendar.calendarId, calendar.enabled)}
						class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900
							{calendar.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}"
						role="switch"
						aria-checked={calendar.enabled}
						title={calendar.enabled ? 'Disable calendar' : 'Enable calendar'}
					>
						<span class="sr-only">Toggle {calendar.calendarName}</span>
						<span
							class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform
								{calendar.enabled ? 'translate-x-6' : 'translate-x-1'}"
						></span>
					</button>
				</div>
			{/each}
		</div>
	</div>
{:else}
	<!-- Empty state -->
	<div class="py-8 px-4 text-center">
		<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
		</svg>
		<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
			No calendars found. Click Sync Now to discover calendars.
		</p>
	</div>
{/if}
