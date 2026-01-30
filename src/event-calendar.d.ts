declare module '@event-calendar/core' {
	import type { SvelteComponent } from 'svelte';

	export interface EventCalendarOptions {
		view?: string;
		date?: Date;
		events?: any[];
		plugins?: any[];
		headerToolbar?: {
			start?: string;
			center?: string;
			end?: string;
		};
		editable?: boolean;
		eventClick?: (info: any) => void;
		dateClick?: (info: any) => void;
		eventDrop?: (info: any) => void;
		eventResize?: (info: any) => void;
		allDaySlot?: boolean;
		slotMinTime?: string;
		slotMaxTime?: string;
		nowIndicator?: boolean;
		dayMaxEvents?: boolean;
		height?: string | number;
		slotDuration?: string;
		[key: string]: any;
	}

	export default class Calendar extends SvelteComponent<{
		plugins: any[];
		options: EventCalendarOptions;
	}> {}
}

declare module '@event-calendar/time-grid' {
	const TimeGrid: any;
	export default TimeGrid;
}

declare module '@event-calendar/day-grid' {
	const DayGrid: any;
	export default DayGrid;
}

declare module '@event-calendar/interaction' {
	const Interaction: any;
	export default Interaction;
}

declare module '@event-calendar/list' {
	const List: any;
	export default List;
}
