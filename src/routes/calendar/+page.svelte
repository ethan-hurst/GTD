<script lang="ts">
	import { onMount } from 'svelte';
	import EventCalendar from '$lib/components/EventCalendar.svelte';
	import IcsImport from '$lib/components/IcsImport.svelte';
	import EventForm from '$lib/components/EventForm.svelte';
	import CalendarSidePanel from '$lib/components/CalendarSidePanel.svelte';
	import { calendarState } from '$lib/stores/calendar.svelte';
	import { expandAllRecurrences } from '$lib/utils/recurrence';
	import toast from 'svelte-5-french-toast';
	import type { CalendarEvent } from '$lib/db/schema';

	onMount(async () => {
		await calendarState.loadEvents();
	});

	// Import modal state
	let showImport = $state(false);

	// Side panel state - default visible on desktop
	let showSidePanel = $state(true);

	// EventForm state
	let showForm = $state(false);
	let editingEvent = $state<CalendarEvent | undefined>(undefined);
	let initialDate = $state<Date | undefined>(undefined);

	// View switcher state - use derived from calendarState
	const viewLabels = {
		timeGridDay: 'Day',
		timeGridWeek: 'Week',
		dayGridMonth: 'Month'
	} as const;

	// Navigation functions
	function goToToday() {
		calendarState.setDate(new Date());
	}

	function goBack() {
		const view = calendarState.currentView;
		const currentDate = calendarState.currentDate;

		if (view === 'timeGridDay') {
			const newDate = new Date(currentDate);
			newDate.setDate(newDate.getDate() - 1);
			calendarState.setDate(newDate);
		} else if (view === 'timeGridWeek') {
			const newDate = new Date(currentDate);
			newDate.setDate(newDate.getDate() - 7);
			calendarState.setDate(newDate);
		} else if (view === 'dayGridMonth') {
			const newDate = new Date(currentDate);
			newDate.setMonth(newDate.getMonth() - 1);
			calendarState.setDate(newDate);
		}
	}

	function goForward() {
		const view = calendarState.currentView;
		const currentDate = calendarState.currentDate;

		if (view === 'timeGridDay') {
			const newDate = new Date(currentDate);
			newDate.setDate(newDate.getDate() + 1);
			calendarState.setDate(newDate);
		} else if (view === 'timeGridWeek') {
			const newDate = new Date(currentDate);
			newDate.setDate(newDate.getDate() + 7);
			calendarState.setDate(newDate);
		} else if (view === 'dayGridMonth') {
			const newDate = new Date(currentDate);
			newDate.setMonth(newDate.getMonth() + 1);
			calendarState.setDate(newDate);
		}
	}

	// Calculate visible date range based on current view
	const visibleRange = $derived.by(() => {
		const date = calendarState.currentDate;
		const view = calendarState.currentView;

		if (view === 'timeGridDay') {
			// Start of day to end of day
			const start = new Date(date);
			start.setHours(0, 0, 0, 0);
			const end = new Date(date);
			end.setHours(23, 59, 59, 999);
			return { start, end };
		} else if (view === 'timeGridWeek') {
			// Start of week (Monday) to end of week (Sunday)
			const start = new Date(date);
			const day = start.getDay();
			const diff = day === 0 ? -6 : 1 - day; // Monday is 1, Sunday is 0
			start.setDate(start.getDate() + diff);
			start.setHours(0, 0, 0, 0);

			const end = new Date(start);
			end.setDate(start.getDate() + 6);
			end.setHours(23, 59, 59, 999);
			return { start, end };
		} else {
			// Month view: first day of month to last day of month
			const start = new Date(date.getFullYear(), date.getMonth(), 1);
			start.setHours(0, 0, 0, 0);
			const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
			end.setHours(23, 59, 59, 999);
			return { start, end };
		}
	});

	// Expand recurring events for the visible range
	const displayEvents = $derived.by(() => {
		const range = visibleRange;
		return expandAllRecurrences(calendarState.events, range.start, range.end);
	});

	// Format date label based on current view
	const dateLabel = $derived.by(() => {
		const date = calendarState.currentDate;
		const view = calendarState.currentView;

		if (view === 'timeGridDay') {
			// "Thursday, January 30, 2026"
			return date.toLocaleDateString('en-US', {
				weekday: 'long',
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			});
		} else if (view === 'timeGridWeek') {
			// "Jan 26 - Feb 1, 2026"
			const startOfWeek = new Date(date);
			startOfWeek.setDate(date.getDate() - date.getDay());
			const endOfWeek = new Date(startOfWeek);
			endOfWeek.setDate(startOfWeek.getDate() + 6);

			const startStr = startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
			const endStr = endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
			const year = date.getFullYear();

			return `${startStr} - ${endStr}, ${year}`;
		} else {
			// "January 2026"
			return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
		}
	});

	// New Event button handler
	function openNewEventForm() {
		const now = new Date();
		// Round to next hour
		now.setMinutes(0, 0, 0);
		now.setHours(now.getHours() + 1);

		initialDate = now;
		editingEvent = undefined;
		showForm = true;
	}

	// Event handlers
	function handleEventClick(event: CalendarEvent) {
		editingEvent = event;
		initialDate = undefined;
		showForm = true;
	}

	function handleDateClick(date: Date) {
		initialDate = date;
		editingEvent = undefined;
		showForm = true;
	}

	async function handleEventDrop(event: CalendarEvent, newStart: Date, newEnd: Date) {
		await calendarState.updateEvent(event.id, {
			startTime: newStart,
			endTime: newEnd
		});
		toast.success('Event rescheduled');
	}

	async function handleEventResize(event: CalendarEvent, newStart: Date, newEnd: Date) {
		await calendarState.updateEvent(event.id, {
			startTime: newStart,
			endTime: newEnd
		});
		toast.success('Event updated');
	}

	function handleFormSave() {
		showForm = false;
		editingEvent = undefined;
		initialDate = undefined;
	}

	function handleFormClose() {
		showForm = false;
		editingEvent = undefined;
		initialDate = undefined;
	}

	function openImport() {
		showImport = true;
	}

	function closeImport() {
		showImport = false;
	}

	async function handleImported() {
		// Reload events after import
		await calendarState.loadEvents();
		closeImport();
	}
</script>

<div class="flex h-full">
	<!-- Main calendar area -->
	<div class="flex-1 flex flex-col">
		<!-- Toolbar -->
		<div class="flex items-center justify-between px-6 py-3 border-b border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-gray-900">
			<!-- Left: New Event button + Navigation -->
			<div class="flex items-center gap-3">
				<button
					onclick={openNewEventForm}
					class="px-3 py-1.5 text-sm font-medium rounded bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white transition-all flex items-center gap-1.5 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 active:scale-[0.97]"
					title="Create new event"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
					New Event
				</button>
				<div class="w-px h-6 bg-gray-200 dark:bg-gray-700/60"></div>
				<button
					onclick={goBack}
					class="p-2.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
					title="Previous"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
				</button>
				<button
					onclick={goToToday}
					class="px-3 py-1.5 text-sm font-medium rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
				>
					Today
				</button>
				<button
					onclick={goForward}
					class="p-2.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
					title="Next"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</button>
				<h1 class="ml-4 text-lg font-semibold text-gray-900 dark:text-white">
					{dateLabel}
				</h1>
			</div>

			<!-- Right: Import button, Actions toggle, View switcher -->
			<div class="flex items-center gap-3">
				<button
					onclick={openImport}
					class="px-3 py-1.5 text-sm font-medium rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
					title="Import .ics calendar file"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
					</svg>
					Import
				</button>

				<button
					onclick={() => showSidePanel = !showSidePanel}
					class="px-3 py-1.5 text-sm font-medium rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 {showSidePanel ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900' : ''}"
					title="Toggle next actions panel"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
					</svg>
					Actions
				</button>

				<div class="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
					<button
						onclick={() => calendarState.setView('timeGridDay')}
						class="px-3 py-1.5 text-sm font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 {calendarState.currentView === 'timeGridDay'
							? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm ring-1 ring-gray-900/5 dark:ring-white/10'
							: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}"
					>
						Day
					</button>
					<button
						onclick={() => calendarState.setView('timeGridWeek')}
						class="px-3 py-1.5 text-sm font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 {calendarState.currentView === 'timeGridWeek'
							? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm ring-1 ring-gray-900/5 dark:ring-white/10'
							: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}"
					>
						Week
					</button>
					<button
						onclick={() => calendarState.setView('dayGridMonth')}
						class="px-3 py-1.5 text-sm font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 {calendarState.currentView === 'dayGridMonth'
							? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm ring-1 ring-gray-900/5 dark:ring-white/10'
							: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}"
					>
						Month
					</button>
				</div>
			</div>
		</div>

		<!-- Calendar Container -->
		<div class="flex-1 overflow-hidden relative">
			{#if calendarState.events.length === 0 && !calendarState.isLoading}
				<div class="absolute inset-0 flex items-center justify-center pointer-events-none">
					<p class="text-sm text-gray-500 dark:text-gray-400">
						No events yet. Click a time slot to add one, or import from an .ics file.
					</p>
				</div>
			{/if}
			<EventCalendar
				events={displayEvents}
				currentView={calendarState.currentView}
				currentDate={calendarState.currentDate}
				onEventClick={handleEventClick}
				onDateClick={handleDateClick}
				onEventDrop={handleEventDrop}
				onEventResize={handleEventResize}
			/>
		</div>
	</div>

	<!-- Right panels: EventForm OR CalendarSidePanel -->
	{#if showForm}
		<!-- EventForm takes priority when open -->
		<EventForm
			event={editingEvent}
			initialDate={initialDate}
			onSave={handleFormSave}
			onClose={handleFormClose}
		/>
	{:else if showSidePanel}
		<!-- CalendarSidePanel shows when EventForm is not open -->
		<CalendarSidePanel
			currentView={calendarState.currentView}
			currentDate={calendarState.currentDate}
		/>
	{/if}
</div>

<!-- Import Modal -->
{#if showImport}
	<IcsImport onClose={closeImport} onImported={handleImported} />
{/if}
