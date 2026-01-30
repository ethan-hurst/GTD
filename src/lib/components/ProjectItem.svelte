<script lang="ts">
	import { slide } from 'svelte/transition';
	import ProjectDetailPanel from './ProjectDetailPanel.svelte';
	import type { GTDItem } from '$lib/db/schema';

	interface Props {
		project: GTDItem;
		isStalled: boolean;
		isExpanded: boolean;
		onToggleExpand: () => void;
		onSave: () => void;
	}

	let { project, isStalled, isExpanded, onToggleExpand, onSave }: Props = $props();

	function handleSave() {
		onSave();
		onToggleExpand();
	}

	function formatDate(date: Date): string {
		return new Intl.DateTimeFormat('en-US', {
			dateStyle: 'medium'
		}).format(date);
	}
</script>

<div
	class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:shadow-sm transition-shadow"
>
	<!-- Project row -->
	<div
		class="px-4 py-3 cursor-pointer"
		onclick={onToggleExpand}
		role="button"
		tabindex="0"
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				onToggleExpand();
			}
		}}
	>
		<div class="flex items-start justify-between">
			<div class="flex-1 min-w-0">
				<!-- Title -->
				<h3 class="font-medium text-gray-900 dark:text-gray-100">
					{project.title}
				</h3>

				<!-- Created date -->
				<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
					{formatDate(project.created)}
				</p>
			</div>

			<!-- Stalled badge -->
			{#if isStalled}
				<span class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/30 rounded">
					<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
					</svg>
					No next action
				</span>
			{/if}
		</div>
	</div>

	<!-- Detail panel (expanded) -->
	{#if isExpanded}
		<ProjectDetailPanel
			item={project}
			onSave={handleSave}
			onClose={onToggleExpand}
		/>
	{/if}
</div>
