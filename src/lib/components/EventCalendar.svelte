<script lang="ts">
	import Calendar from '@event-calendar/core';
	import TimeGrid from '@event-calendar/time-grid';
	import DayGrid from '@event-calendar/day-grid';
	import Interaction from '@event-calendar/interaction';
	import '@event-calendar/core/index.css';
	import type { CalendarEvent } from '$lib/db/schema';

	interface EventCalendarProps {
		events: CalendarEvent[];
		currentView: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';
		currentDate: Date;
		onEventClick?: (event: CalendarEvent) => void;
		onDateClick?: (date: Date) => void;
		onEventDrop?: (event: CalendarEvent, newStart: Date, newEnd: Date) => void;
		onEventResize?: (event: CalendarEvent, newStart: Date, newEnd: Date) => void;
	}

	let {
		events,
		currentView,
		currentDate,
		onEventClick,
		onDateClick,
		onEventDrop,
		onEventResize
	}: EventCalendarProps = $props();

	// Map CalendarEvent[] to EventCalendar's event format
	const ecEvents = $derived(
		events.map((e) => ({
			id: String(e.id),
			title: e.title,
			start: e.startTime,
			end: e.endTime,
			allDay: e.allDay || false,
			backgroundColor: e.color,
			extendedProps: {
				location: e.location,
				notes: e.notes,
				projectId: e.projectId,
				source: e.source,
				rrule: e.rrule,
				recurrenceId: e.recurrenceId,
				exceptionDates: e.exceptionDates,
				originalEvent: e
			}
		}))
	);

	const plugins = [TimeGrid, DayGrid, Interaction];

	const options = $derived({
		view: currentView,
		date: currentDate,
		events: ecEvents,
		headerToolbar: {
			start: '',
			center: '',
			end: ''
		},
		editable: true,
		eventClick: (info: any) => {
			if (onEventClick && info.event?.extendedProps?.originalEvent) {
				onEventClick(info.event.extendedProps.originalEvent);
			}
		},
		dateClick: (info: any) => {
			if (onDateClick && info.date) {
				onDateClick(info.date);
			}
		},
		eventDrop: (info: any) => {
			if (onEventDrop && info.event?.extendedProps?.originalEvent) {
				const event = info.event.extendedProps.originalEvent;
				onEventDrop(event, info.event.start, info.event.end);
			}
		},
		eventResize: (info: any) => {
			if (onEventResize && info.event?.extendedProps?.originalEvent) {
				const event = info.event.extendedProps.originalEvent;
				onEventResize(event, info.event.start, info.event.end);
			}
		},
		allDaySlot: true,
		slotMinTime: '06:00:00',
		slotMaxTime: '22:00:00',
		nowIndicator: true,
		dayMaxEvents: true,
		height: '100%',
		slotDuration: '00:30:00'
	});
</script>

<div class="event-calendar-wrapper">
	<Calendar {plugins} {options} />
</div>

<style>
	.event-calendar-wrapper {
		height: 100%;
		width: 100%;
	}

	/* Dark mode overrides for EventCalendar */
	:global(.dark) .event-calendar-wrapper :global(.ec) {
		--ec-bg-color: rgb(17 24 39);
		--ec-border-color: rgb(55 65 81);
		--ec-text-color: rgb(229 231 235);
		--ec-today-bg-color: rgb(31 41 55);
		--ec-event-bg-color: rgb(59 130 246);
		--ec-event-text-color: rgb(255 255 255);
		--ec-button-bg-color: rgb(31 41 55);
		--ec-button-text-color: rgb(229 231 235);
		--ec-button-border-color: rgb(55 65 81);
		--ec-button-active-bg-color: rgb(55 65 81);
	}

	/* Light mode variables (defaults are mostly fine, but ensure consistency) */
	:global(.light) .event-calendar-wrapper :global(.ec) {
		--ec-bg-color: rgb(255 255 255);
		--ec-border-color: rgb(229 231 235);
		--ec-text-color: rgb(17 24 39);
		--ec-today-bg-color: rgb(243 244 246);
		--ec-event-bg-color: rgb(59 130 246);
		--ec-event-text-color: rgb(255 255 255);
	}
</style>
