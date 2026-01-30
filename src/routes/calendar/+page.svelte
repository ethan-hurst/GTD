<script lang="ts">
	import { onMount } from 'svelte';
	import EventCalendar from '$lib/components/EventCalendar.svelte';
	import { calendarState } from '$lib/stores/calendar.svelte';

	onMount(async () => {
		await calendarState.loadEvents();
	});

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

	// Event handlers (for now, console.log - full EventForm comes in Plan 04)
	function handleEventClick(event: any) {
		console.log('Event clicked:', event);
	}

	function handleDateClick(date: Date) {
		console.log('Date clicked:', date);
	}

	async function handleEventDrop(event: any, newStart: Date, newEnd: Date) {
		console.log('Event dropped:', event, newStart, newEnd);
		await calendarState.updateEvent(event.id, {
			startTime: newStart,
			endTime: newEnd
		});
	}

	async function handleEventResize(event: any, newStart: Date, newEnd: Date) {
		console.log('Event resized:', event, newStart, newEnd);
		await calendarState.updateEvent(event.id, {
			startTime: newStart,
			endTime: newEnd
		});
	}
</script>

<div class="flex flex-col h-full">
	<!-- Toolbar -->
	<div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
		<!-- Left: Navigation -->
		<div class="flex items-center gap-3">
			<button
				onclick={goBack}
				class="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
				title="Previous"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
			</button>
			<button
				onclick={goToToday}
				class="px-3 py-1.5 text-sm font-medium rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
			>
				Today
			</button>
			<button
				onclick={goForward}
				class="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
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

		<!-- Right: View switcher -->
		<div class="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
			<button
				onclick={() => calendarState.setView('timeGridDay')}
				class="px-3 py-1.5 text-sm font-medium rounded transition-colors {calendarState.currentView === 'timeGridDay'
					? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
					: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}"
			>
				Day
			</button>
			<button
				onclick={() => calendarState.setView('timeGridWeek')}
				class="px-3 py-1.5 text-sm font-medium rounded transition-colors {calendarState.currentView === 'timeGridWeek'
					? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
					: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}"
			>
				Week
			</button>
			<button
				onclick={() => calendarState.setView('dayGridMonth')}
				class="px-3 py-1.5 text-sm font-medium rounded transition-colors {calendarState.currentView === 'dayGridMonth'
					? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
					: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}"
			>
				Month
			</button>
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
			events={calendarState.events}
			currentView={calendarState.currentView}
			currentDate={calendarState.currentDate}
			onEventClick={handleEventClick}
			onDateClick={handleDateClick}
			onEventDrop={handleEventDrop}
			onEventResize={handleEventResize}
		/>
	</div>
</div>
