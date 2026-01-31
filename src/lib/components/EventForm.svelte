<script lang="ts">
	import { slide } from 'svelte/transition';
	import toast from 'svelte-5-french-toast';
	import { calendarState } from '$lib/stores/calendar.svelte';
	import { mobileState } from '$lib/stores/mobile.svelte';
	import { getAllProjects } from '$lib/db/operations';
	import type { CalendarEvent, GTDItem } from '$lib/db/schema';

	interface EventFormProps {
		event?: CalendarEvent;        // Existing event for edit mode, undefined for create
		initialDate?: Date;           // Pre-fill start time when clicking a time slot
		onSave: () => void;          // Callback after save
		onClose: () => void;         // Close the form
	}

	let { event, initialDate, onSave, onClose }: EventFormProps = $props();

	// Preset color options
	const colorOptions = [
		{ name: 'Blue', value: '#3b82f6' },
		{ name: 'Green', value: '#10b981' },
		{ name: 'Red', value: '#ef4444' },
		{ name: 'Purple', value: '#8b5cf6' },
		{ name: 'Orange', value: '#f97316' },
		{ name: 'Teal', value: '#14b8a6' },
		{ name: 'Pink', value: '#ec4899' },
		{ name: 'Gray', value: '#6b7280' }
	];

	// Recurrence options
	const recurrenceOptions = [
		{ label: 'Does not repeat', value: null },
		{ label: 'Daily', value: 'FREQ=DAILY' },
		{ label: 'Weekly', value: 'FREQ=WEEKLY' },
		{ label: 'Monthly', value: 'FREQ=MONTHLY' }
	];

	// Helper functions for datetime-local conversion
	function dateToDatetimeLocal(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');
		return `${year}-${month}-${day}T${hours}:${minutes}`;
	}

	function datetimeLocalToDate(str: string): Date {
		return new Date(str);
	}

	// Initialize form fields
	let title = $state(event?.title || '');
	let startTimeStr = $state(
		event?.startTime ? dateToDatetimeLocal(event.startTime) :
		initialDate ? dateToDatetimeLocal(initialDate) :
		dateToDatetimeLocal(new Date())
	);
	let endTimeStr = $state(
		event?.endTime ? dateToDatetimeLocal(event.endTime) :
		(() => {
			const start = initialDate || new Date();
			const end = new Date(start.getTime() + 60 * 60 * 1000); // +1 hour
			return dateToDatetimeLocal(end);
		})()
	);
	let allDay = $state(event?.allDay || false);
	let location = $state(event?.location || '');
	let notes = $state(event?.notes || '');
	let selectedColor = $state(event?.color || '#3b82f6');
	let projectId = $state(event?.projectId?.toString() || '');
	let rrule = $state<string | null>(event?.rrule || null);

	let projects = $state<GTDItem[]>([]);
	let titleInput: HTMLInputElement;

	// Load projects when component mounts
	$effect(() => {
		getAllProjects().then(p => { projects = p; });
	});

	// Autofocus title input
	$effect(() => {
		if (titleInput) {
			titleInput.focus();
		}
	});

	// Update end time when start time changes (only if end is before start)
	$effect(() => {
		const start = datetimeLocalToDate(startTimeStr);
		const end = datetimeLocalToDate(endTimeStr);
		if (end <= start) {
			const newEnd = new Date(start.getTime() + 60 * 60 * 1000);
			endTimeStr = dateToDatetimeLocal(newEnd);
		}
	});

	async function handleSave() {
		if (!title.trim()) {
			toast.error('Title is required');
			return;
		}

		const startTime = datetimeLocalToDate(startTimeStr);
		const endTime = datetimeLocalToDate(endTimeStr);

		if (endTime <= startTime) {
			toast.error('End time must be after start time');
			return;
		}

		const eventData = {
			title: title.trim(),
			startTime,
			endTime,
			allDay,
			location: location.trim() || undefined,
			notes: notes.trim() || undefined,
			color: selectedColor,
			projectId: projectId ? parseInt(projectId) : undefined,
			source: 'manual' as const,
			rrule: rrule || undefined
		};

		try {
			if (event) {
				// Edit mode
				await calendarState.updateEvent(event.id, eventData);
				toast.success('Event updated');
			} else {
				// Create mode
				await calendarState.addEvent(eventData);
				toast.success('Event created');
			}
			onSave();
		} catch (error) {
			toast.error('Failed to save event');
			console.error(error);
		}
	}

	async function handleDelete() {
		if (!event) return;

		if (confirm('Delete this event?')) {
			try {
				await calendarState.deleteEvent(event.id);
				toast.success('Event deleted');
				onClose();
			} catch (error) {
				toast.error('Failed to delete event');
				console.error(error);
			}
		}
	}
</script>

<div
	class="fixed inset-0 z-50 bg-white dark:bg-gray-950 overflow-y-auto tablet:relative tablet:inset-auto tablet:z-auto tablet:w-96 tablet:border-l tablet:border-gray-200 tablet:dark:border-gray-800 flex flex-col h-full tablet:shadow-xl pb-safe"
	transition:slide={{ axis: 'x', duration: 200 }}
>
	<!-- Header: sticky on mobile for scrolling -->
	<div class="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
		<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
			{event ? 'Edit Event' : 'New Event'}
		</h3>
		<button
			onclick={onClose}
			class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
			title="Close"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
	</div>

	<!-- Form content - scrollable -->
	<div class="flex-1 overflow-y-auto px-4 py-4">
		<div class="space-y-4">
			<!-- Title -->
			<div>
				<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
					Title <span class="text-red-500">*</span>
				</label>
				<input
					bind:this={titleInput}
					bind:value={title}
					type="text"
					placeholder="Event title"
					class="w-full px-3 py-2 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				/>
			</div>

			<!-- All day toggle -->
			<div>
				<label class="flex items-center gap-2 cursor-pointer">
					<input
						type="checkbox"
						bind:checked={allDay}
						class="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
					/>
					<span class="text-sm font-medium text-gray-700 dark:text-gray-300">All day</span>
				</label>
			</div>

			<!-- Start date/time -->
			<div>
				<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
					Start
				</label>
				<input
					bind:value={startTimeStr}
					type="datetime-local"
					class="w-full px-3 py-2 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				/>
			</div>

			<!-- End date/time -->
			<div>
				<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
					End
				</label>
				<input
					bind:value={endTimeStr}
					type="datetime-local"
					class="w-full px-3 py-2 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				/>
			</div>

			<!-- Location -->
			<div>
				<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
					Location
				</label>
				<input
					bind:value={location}
					type="text"
					placeholder="Add location"
					class="w-full px-3 py-2 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				/>
			</div>

			<!-- Notes -->
			<div>
				<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
					Notes
				</label>
				<textarea
					bind:value={notes}
					rows="3"
					placeholder="Add notes..."
					class="w-full px-3 py-2 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
				></textarea>
			</div>

			<!-- Color picker -->
			<div>
				<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
					Color
				</label>
				<div class="flex gap-2">
					{#each colorOptions as color (color.value)}
						<button
							type="button"
							onclick={() => selectedColor = color.value}
							class="min-w-11 min-h-11 w-11 h-11 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 {selectedColor === color.value ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-900' : 'hover:scale-110'}"
							style="background-color: {color.value}"
							title={color.name}
						></button>
					{/each}
				</div>
			</div>

			<!-- Project link -->
			<div>
				<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
					Project (optional)
				</label>
				<select
					bind:value={projectId}
					class="w-full px-3 py-2 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				>
					<option value="">(None)</option>
					{#each projects as proj (proj.id)}
						<option value={proj.id.toString()}>{proj.title}</option>
					{/each}
				</select>
			</div>

			<!-- Recurrence -->
			<div>
				<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
					Recurrence
				</label>
				<select
					bind:value={rrule}
					class="w-full px-3 py-2 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				>
					{#each recurrenceOptions as option (option.value || 'none')}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</div>
		</div>
	</div>

	<!-- Footer buttons -->
	<div class="px-4 py-3 border-t border-gray-200 dark:border-gray-800 flex flex-col tablet:flex-row items-stretch tablet:items-center gap-2">
		<button
			onclick={handleSave}
			class="w-full tablet:flex-1 min-h-11 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
		>
			{event ? 'Save' : 'Create'}
		</button>
		{#if event}
			<button
				onclick={handleDelete}
				class="w-full tablet:w-auto min-h-11 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
			>
				Delete
			</button>
		{/if}
		<button
			onclick={onClose}
			class="w-full tablet:w-auto min-h-11 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
		>
			Cancel
		</button>
	</div>
</div>
