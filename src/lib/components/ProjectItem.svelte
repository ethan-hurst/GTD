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
		class="min-h-11 px-4 py-3 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-inset active:bg-gray-50 dark:active:bg-gray-800 transition-all duration-150"
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
		<div class="flex items-start justify-between gap-2">
			<div class="flex-1 min-w-0">
				<!-- Title -->
				<h3 class="font-medium text-gray-900 dark:text-gray-100 text-base truncate">
					{project.title}
				</h3>

				<!-- Created date and stalled badge stacked on mobile -->
				<div class="flex flex-col phablet:flex-row phablet:items-center gap-1 phablet:gap-2 mt-1">
					<p class="text-sm text-gray-500 dark:text-gray-400">
						{formatDate(project.created)}
					</p>
					<!-- Stalled badge -->
					{#if isStalled}
						<span class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/30 rounded self-start">
							<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
							</svg>
							No next action
						</span>
					{/if}
				</div>
			</div>
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
