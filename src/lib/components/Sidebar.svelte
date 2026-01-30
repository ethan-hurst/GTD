<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import ThemeToggle from './ThemeToggle.svelte';
	import ContextList from './ContextList.svelte';
	import FeatureHint from './FeatureHint.svelte';
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
		<h1 class="gtd-logo text-xl font-bold text-gray-900 dark:text-gray-100">
			<span class="gtd-word">G<span class="gtd-expand gtd-expand-1">et</span></span>
			<span class="gtd-word">T<span class="gtd-expand gtd-expand-2">hings</span></span>
			<span class="gtd-word">D<span class="gtd-expand gtd-expand-3">one</span></span>
		</h1>
	</div>

	<!-- Navigation -->
	<nav class="flex-1 p-4 space-y-1">
		<FeatureHint feature="inbox" position="right">
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
		</FeatureHint>

		<!-- Separator -->
		<div class="border-t border-gray-200 dark:border-gray-700 my-2"></div>

		<!-- Next Actions section -->
		<FeatureHint feature="next-actions" position="right">
			<a
				href="/actions"
				class="block px-4 py-2 rounded-md text-sm font-medium transition-colors
					{$page.url.pathname.startsWith('/actions')
						? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
						: 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}"
			>
				Next Actions
			</a>
		</FeatureHint>

		<!-- Context List (indented) -->
		<div class="pl-2">
			<ContextList />
		</div>

		<!-- Separator -->
		<div class="border-t border-gray-200 dark:border-gray-700 my-2"></div>

		<FeatureHint feature="projects" position="right">
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
		</FeatureHint>

		<!-- Separator -->
		<div class="border-t border-gray-200 dark:border-gray-700 my-2"></div>

		<FeatureHint feature="waiting" position="right">
			<a
				href="/waiting"
				class="block px-4 py-2 rounded-md text-sm font-medium transition-colors
					{$page.url.pathname.startsWith('/waiting')
						? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
						: 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}"
			>
				Waiting For
			</a>
		</FeatureHint>

		<FeatureHint feature="someday" position="right">
			<a
				href="/someday"
				class="block px-4 py-2 rounded-md text-sm font-medium transition-colors
					{$page.url.pathname.startsWith('/someday')
						? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
						: 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}"
			>
				Someday/Maybe
			</a>
		</FeatureHint>

		<!-- Separator -->
		<div class="border-t border-gray-200 dark:border-gray-700 my-2"></div>

		<FeatureHint feature="review" position="right">
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
		</FeatureHint>

		<!-- Separator -->
		<div class="border-t border-gray-200 dark:border-gray-700 my-2"></div>

		<FeatureHint feature="settings" position="right">
			<a
				href="/settings"
				class="block px-4 py-2 rounded-md text-sm font-medium transition-colors
					{$page.url.pathname === '/settings'
						? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
						: 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}"
			>
				Settings
			</a>
		</FeatureHint>
	</nav>

	<!-- Theme Toggle Footer -->
	<div class="p-4 border-t border-gray-200 dark:border-gray-800">
		<ThemeToggle />
	</div>
</aside>

<style>
	.gtd-logo {
		cursor: default;
		white-space: nowrap;
		display: flex;
		gap: 0;
	}

	.gtd-word {
		display: inline-flex;
	}

	.gtd-expand {
		display: inline-block;
		max-width: 0;
		overflow: hidden;
		transition: max-width 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
	}

	.gtd-logo:hover .gtd-expand {
		max-width: 4rem;
	}

	.gtd-logo:hover .gtd-word {
		margin-right: 0.3rem;
	}

	.gtd-word {
		margin-right: 0;
		transition: margin-right 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
	}

	.gtd-expand-1 {
		transition-delay: 0s;
	}

	.gtd-expand-2 {
		transition-delay: 0.06s;
	}

	.gtd-expand-3 {
		transition-delay: 0.12s;
	}
</style>
