<script lang="ts">
	import { fade } from 'svelte/transition';
	import { updateItem } from '$lib/db/operations';
	import { formatRelativeTime } from '$lib/utils/time';
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
</script>

{#if !isCompleting}
	<div
		class="flex items-start gap-3 min-h-11 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 active:bg-gray-50 dark:active:bg-gray-800 transition-colors cursor-pointer rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-inset"
		onclick={handleRowClick}
		role="button"
		tabindex="0"
		onkeydown={(e) => {
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
