<script lang="ts">
	import { fade } from 'svelte/transition';
	import { updateItem, deleteItem } from '$lib/db/operations';
	import { formatRelativeTime } from '$lib/utils/time';
	import { usePan, type PanCustomEvent, type GestureCustomEvent } from 'svelte-gestures';
	import { mobileState } from '$lib/stores/mobile.svelte';
	import type { GTDItem } from '$lib/db/schema';

	interface Props {
		item: GTDItem;
		onComplete: (id: number) => void;
		onExpand: (id: number) => void;
		isExpanded: boolean;
		isSelected: boolean;
		onToggleSelect: (id: number) => void;
	}

	let { item, onComplete, onExpand, isExpanded, isSelected, onToggleSelect }: Props = $props();

	let isCompleting = $state(false);
	let isEditing = $state(false);
	let editValue = $state(item.title);

	// Swipe gesture state
	let swipeOffset = $state(0);
	let isRevealing = $state(false);
	const SWIPE_THRESHOLD = 80;

	// Keep editValue in sync with item.title
	$effect(() => {
		editValue = item.title;
	});

	async function handleComplete() {
		isCompleting = true;
		// Call parent handler which will trigger DB operation and show toast
		onComplete(item.id);
	}

	async function handleSaveTitle() {
		if (!editValue.trim()) {
			// Revert if empty
			editValue = item.title;
			isEditing = false;
			return;
		}

		if (editValue.trim() !== item.title) {
			await updateItem(item.id, { title: editValue.trim() });
		}
		isEditing = false;
	}

	function handleTitleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			handleSaveTitle();
		} else if (e.key === 'Escape') {
			editValue = item.title;
			isEditing = false;
		}
	}

	function handleTitleClick(e: MouseEvent) {
		e.stopPropagation();
		isEditing = true;
	}

	function handleRowClick() {
		if (!isEditing) {
			onExpand(item.id);
		}
	}

	function handleCheckboxClick(e: MouseEvent) {
		e.stopPropagation();
	}

	function handleBadgeClick(e: MouseEvent) {
		e.stopPropagation();
		// Future: navigate to project detail
	}

	// Swipe gesture handlers
	function handlePan(event: PanCustomEvent) {
		if (!mobileState.isMobile) return;
		swipeOffset = Math.max(-120, Math.min(120, event.detail.x));
		isRevealing = Math.abs(swipeOffset) > 20;
	}

	function handlePanUp(event: GestureCustomEvent) {
		if (!mobileState.isMobile) {
			swipeOffset = 0;
			isRevealing = false;
			return;
		}

		if (swipeOffset > SWIPE_THRESHOLD) {
			// Swipe right: complete item
			handleComplete();
		} else if (swipeOffset < -SWIPE_THRESHOLD) {
			// Swipe left: delete item
			deleteItem(item.id);
		}
		swipeOffset = 0;
		isRevealing = false;
	}

	const panGesture = usePan(handlePan, () => ({ delay: 0, touchAction: 'pan-y' }), { onpanup: handlePanUp });
</script>

{#if !isCompleting}
	<div class="relative overflow-hidden rounded-md">
		<!-- Revealed action backgrounds -->
		{#if isRevealing && mobileState.isMobile}
			<div class="absolute inset-y-0 left-0 w-full flex items-center px-4 bg-green-500 text-white z-0">
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
				</svg>
				<span class="ml-2 text-sm font-medium">Complete</span>
			</div>
			<div class="absolute inset-y-0 right-0 w-full flex items-center justify-end px-4 bg-red-500 text-white z-0">
				<span class="mr-2 text-sm font-medium">Delete</span>
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
				</svg>
			</div>
		{/if}

		<!-- Main item content (slides) -->
		<div
			{...panGesture}
			style="transform: translateX({mobileState.isMobile ? swipeOffset : 0}px); transition: {isRevealing ? 'none' : 'transform 0.2s ease-out'};"
			class="relative z-10 bg-white dark:bg-gray-950 flex items-start gap-3 min-h-11 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 active:bg-gray-50 dark:active:bg-gray-800 transition-colors cursor-pointer rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-inset"
			onclick={handleRowClick}
			role="button"
			tabindex="0"
			onkeydown={(e: KeyboardEvent) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					handleRowClick();
				}
			}}
		>
		<!-- Selection checkbox (visible on hover or when selected) -->
		<div
			class="flex-shrink-0 mt-1"
			class:opacity-0={!isSelected}
			class:group-hover:opacity-100={!isSelected}
			onclick={handleCheckboxClick}
		>
			<input
				type="checkbox"
				checked={isSelected}
				onchange={() => onToggleSelect(item.id)}
				class="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
			/>
		</div>

		<!-- Completion checkbox (circle) -->
		<button
			onclick={(e) => {
				e.stopPropagation();
				handleComplete();
			}}
			class="flex-shrink-0 mt-1 min-w-11 min-h-11 flex items-center justify-center rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2"
			title="Complete action"
		>
			<span class="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400"></span>
		</button>

		<!-- Content -->
		<div class="flex-1 min-w-0">
			<!-- Title (inline editable) -->
			{#if isEditing}
				<input
					bind:value={editValue}
					onblur={handleSaveTitle}
					onkeydown={handleTitleKeydown}
					onclick={(e) => e.stopPropagation()}
					class="font-medium text-gray-900 dark:text-gray-100 w-full bg-white dark:bg-gray-800 border border-blue-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
					autofocus
				/>
			{:else}
				<h3
					onclick={handleTitleClick}
					class="font-medium text-gray-900 dark:text-gray-100 cursor-text hover:bg-gray-100/70 dark:hover:bg-gray-700/70 px-2 py-1 rounded inline-block truncate text-base"
				>
					{item.title}
				</h3>
			{/if}

			<!-- Badges and metadata -->
			<div class="flex items-center gap-2 mt-1 flex-wrap" onclick={(e) => e.stopPropagation()}>
				<!-- Context badge -->
				{#if item.context}
					<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-150">
						{item.context}
					</span>
				{/if}

				<!-- Project badge -->
				{#if item.projectId}
					<button
						onclick={handleBadgeClick}
						class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-all duration-150"
					>
						Project
					</button>
				{/if}

				<!-- Relative age -->
				<span class="text-xs text-gray-400">
					{formatRelativeTime(item.created)}
				</span>
			</div>
		</div>
		</div>
	</div>
{:else}
	<!-- Completing animation: strikethrough + fade out -->
	<div
		class="flex items-start gap-3 p-3 line-through opacity-50 rounded-md"
		transition:fade={{ duration: 1000 }}
	>
		<div class="flex-shrink-0 mt-1 w-4 h-4"></div>
		<div class="flex-shrink-0 mt-1 w-5 h-5 rounded-full border-2 border-gray-400 bg-green-500"></div>
		<div class="flex-1 min-w-0">
			<h3 class="font-medium text-gray-500 dark:text-gray-400">
				{item.title}
			</h3>
		</div>
	</div>
{/if}
