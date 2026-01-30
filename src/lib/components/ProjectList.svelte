<script lang="ts">
	import toast from 'svelte-5-french-toast';
	import { projectState } from '$lib/stores/projects.svelte';
	import { addProject } from '$lib/db/operations';
	import ProjectItem from './ProjectItem.svelte';

	// Local state for create form
	let newProjectTitle = $state('');

	async function handleCreateProject(e: Event) {
		e.preventDefault();

		const trimmedTitle = newProjectTitle.trim();
		if (!trimmedTitle) return;

		await addProject(trimmedTitle);
		newProjectTitle = '';
		await projectState.loadProjects();
		toast.success('Project created');
	}

	const isFormDisabled = $derived(!newProjectTitle.trim());
</script>

<div class="p-6 max-w-4xl mx-auto">
	<!-- Header -->
	<div class="mb-4">
		<h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
			Projects
			<span class="ml-2 px-2 py-0.5 text-sm font-normal text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded">
				{projectState.itemCount}
			</span>
		</h2>

		<!-- Stalled count indicator -->
		{#if projectState.stalledCount > 0}
			<p class="text-sm text-amber-600 dark:text-amber-400 mt-1">
				{projectState.stalledCount} stalled
			</p>
		{/if}
	</div>

	<!-- Create form -->
	<form onsubmit={handleCreateProject} class="mb-6">
		<div class="flex gap-2">
			<input
				type="text"
				bind:value={newProjectTitle}
				placeholder="New project outcome..."
				class="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
			/>
			<button
				type="submit"
				disabled={isFormDisabled}
				class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
			>
				Add Project
			</button>
		</div>
	</form>

	<!-- Project list -->
	{#if projectState.items.length === 0 && !newProjectTitle.trim()}
		<!-- Empty state -->
		<div class="text-center py-12">
			<svg
				class="w-16 h-16 mx-auto text-gray-400 mb-4"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="1.5"
					d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
				/>
			</svg>
			<p class="text-gray-500 dark:text-gray-400 mb-2">
				No active projects
			</p>
			<p class="text-sm text-gray-400 dark:text-gray-500">
				Projects are multi-step outcomes. Create one to track your goals.
			</p>
		</div>
	{:else}
		<!-- Project items -->
		<div class="space-y-2">
			{#each projectState.items as project (project.id)}
				<ProjectItem
					{project}
					isStalled={projectState.isStalled(project.id)}
					isExpanded={projectState.expandedId === project.id}
					onToggleExpand={() => projectState.expandItem(project.id)}
				/>
			{/each}
		</div>
	{/if}
</div>
