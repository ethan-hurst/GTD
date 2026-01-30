<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import ThemeToggle from './ThemeToggle.svelte';
	import ContextList from './ContextList.svelte';
	import { inboxState } from '$lib/stores/inbox.svelte';
	import { projectState } from '$lib/stores/projects.svelte';
	import { weeklyReviewState } from '$lib/stores/review.svelte';

	onMount(async () => {
		await inboxState.loadItems();
		await projectState.loadProjects();
		await weeklyReviewState.loadLastReview();
	});

	// Derive overdue status
	let isOverdue = $derived(() => {
		if (!weeklyReviewState.lastReviewDate) return true; // Never completed = overdue
		const daysSince = Math.floor(
			(Date.now() - weeklyReviewState.lastReviewDate.getTime()) / (1000 * 60 * 60 * 24)
		);
		return daysSince > 7;
	});
</script>

<aside class="w-60 border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex flex-col">
	<!-- App Title -->
	<div class="p-6 border-b border-gray-200 dark:border-gray-800">
		<h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">GTD</h1>
	</div>

	<!-- Navigation -->
	<nav class="flex-1 p-4 space-y-1">
		<a
			href="/"
			class="flex items-center justify-between px-4 py-2 rounded-md text-sm font-medium transition-colors
				{$page.url.pathname === '/'
					? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
					: 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}"
		>
			<span>Inbox</span>
			{#if inboxState.itemCount > 0}
				<span class="bg-blue-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
					{inboxState.itemCount}
				</span>
			{/if}
		</a>

		<!-- Separator -->
		<div class="border-t border-gray-200 dark:border-gray-700 my-2"></div>

		<!-- Next Actions section -->
		<a
			href="/actions"
			class="block px-4 py-2 rounded-md text-sm font-medium transition-colors
				{$page.url.pathname.startsWith('/actions')
					? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
					: 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}"
		>
			Next Actions
		</a>

		<!-- Context List (indented) -->
		<div class="pl-2">
			<ContextList />
		</div>

		<!-- Separator -->
		<div class="border-t border-gray-200 dark:border-gray-700 my-2"></div>

		<a
			href="/projects"
			class="flex items-center justify-between px-4 py-2 rounded-md text-sm font-medium transition-colors
				{$page.url.pathname.startsWith('/projects')
					? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
					: 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}"
		>
			<span>Projects</span>
			{#if projectState.stalledCount > 0}
				<span class="bg-yellow-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
					{projectState.stalledCount}
				</span>
			{/if}
		</a>

		<!-- Separator -->
		<div class="border-t border-gray-200 dark:border-gray-700 my-2"></div>

		<a
			href="/waiting"
			class="block px-4 py-2 rounded-md text-sm font-medium transition-colors
				{$page.url.pathname.startsWith('/waiting')
					? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
					: 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}"
		>
			Waiting For
		</a>

		<a
			href="/someday"
			class="block px-4 py-2 rounded-md text-sm font-medium transition-colors
				{$page.url.pathname.startsWith('/someday')
					? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
					: 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}"
		>
			Someday/Maybe
		</a>

		<!-- Separator -->
		<div class="border-t border-gray-200 dark:border-gray-700 my-2"></div>

		<a
			href="/review"
			class="flex items-center justify-between px-4 py-2 rounded-md text-sm font-medium transition-colors
				{$page.url.pathname.startsWith('/review')
					? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
					: 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}"
		>
			<span>Weekly Review</span>
			{#if isOverdue()}
				<span class="bg-red-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
					Overdue
				</span>
			{/if}
		</a>

		<!-- Separator -->
		<div class="border-t border-gray-200 dark:border-gray-700 my-2"></div>

		<a
			href="/settings"
			class="block px-4 py-2 rounded-md text-sm font-medium transition-colors
				{$page.url.pathname === '/settings'
					? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
					: 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}"
		>
			Settings
		</a>
	</nav>

	<!-- Theme Toggle Footer -->
	<div class="p-4 border-t border-gray-200 dark:border-gray-800">
		<ThemeToggle />
	</div>
</aside>
