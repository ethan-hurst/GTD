<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import ThemeToggle from './ThemeToggle.svelte';
	import ContextList from './ContextList.svelte';
	import FeatureHint from './FeatureHint.svelte';
	import { inboxState } from '$lib/stores/inbox.svelte';
	import { projectState } from '$lib/stores/projects.svelte';
	import { weeklyReviewState } from '$lib/stores/review.svelte';
	import { sidebarState } from '$lib/stores/sidebar.svelte';
	import { theme } from '$lib/stores/theme.svelte';
	import { syncState } from '$lib/stores/sync.svelte';
	import { changelog, STORAGE_KEY } from '$lib/data/changelog';

	let lastSeenChangelogId = $state('');

	onMount(async () => {
		sidebarState.init();
		await inboxState.loadItems();
		await projectState.loadProjects();
		await weeklyReviewState.loadLastReview();
		lastSeenChangelogId = localStorage.getItem(STORAGE_KEY) || '';
	});

	// Derive overdue status
	let isOverdue = $derived(() => {
		if (!weeklyReviewState.lastReviewDate) return true;
		const daysSince = Math.floor(
			(Date.now() - weeklyReviewState.lastReviewDate.getTime()) / (1000 * 60 * 60 * 24)
		);
		return daysSince > 7;
	});

	// Check for unseen changelog entries
	function hasUnseenChangelog() {
		if (changelog.length === 0) return false;
		if (!lastSeenChangelogId) return true;
		return changelog[0].id !== lastSeenChangelogId;
	}

	// React to changelog-seen events
	$effect(() => {
		if (typeof window === 'undefined') return;
		const handler = () => {
			lastSeenChangelogId = localStorage.getItem(STORAGE_KEY) || '';
		};
		window.addEventListener('changelog-seen', handler);
		return () => window.removeEventListener('changelog-seen', handler);
	});

	// Theme cycling for collapsed mode
	function cycleTheme() {
		const modes = ['light', 'dark', 'system'];
		const currentIndex = modes.indexOf(theme.current);
		const nextMode = modes[(currentIndex + 1) % modes.length];
		theme.set(nextMode);
	}

	// Keyboard shortcut for sidebar toggle
	function handleSidebarKeydown(event) {
		const target = event.target;
		if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

		if (event.key === '[') {
			event.preventDefault();
			sidebarState.toggle();
		}
	}

	// Format sync time for tooltip
	function formatSyncTime() {
		if (!syncState.lastSyncTime) return 'Never synced';
		const now = Date.now();
		const then = syncState.lastSyncTime.getTime();
		const seconds = Math.floor((now - then) / 1000);

		if (seconds < 60) return `Synced ${seconds}s ago`;
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `Synced ${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `Synced ${hours}h ago`;
		const days = Math.floor(hours / 24);
		return `Synced ${days}d ago`;
	}
</script>

<svelte:window onkeydown={handleSidebarKeydown} />

<aside class="{sidebarState.isCollapsed ? 'w-16' : 'w-60'} hidden tablet:flex border-r border-gray-200/70 dark:border-gray-800/50 bg-gray-50/80 dark:bg-gray-900/95 backdrop-blur-sm flex-col transition-all duration-150 z-20">
	<!-- Header with toggle -->
	<div class="px-3 py-3 border-b border-gray-200/50 dark:border-gray-800/50 flex items-center {sidebarState.isCollapsed ? 'justify-center' : 'justify-between'}">
		{#if !sidebarState.isCollapsed}
			<h1 class="gtd-logo text-xl font-bold text-gray-900 dark:text-gray-100">
				<span class="gtd-word">G<span class="gtd-expand gtd-expand-1">et</span></span>
				<span class="gtd-word">T<span class="gtd-expand gtd-expand-2">hings</span></span>
				<span class="gtd-word">D<span class="gtd-expand gtd-expand-3">one</span></span>
			</h1>
		{/if}
		<button
			onclick={() => sidebarState.toggle()}
			class="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-200/70 dark:hover:bg-gray-800/70 hover:text-gray-700 dark:hover:text-gray-200 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
			title={sidebarState.isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				{#if sidebarState.isCollapsed}
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
				{:else}
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
				{/if}
			</svg>
		</button>
	</div>

	<!-- Navigation -->
	<nav class="flex-1 overflow-y-auto px-3 py-3 {sidebarState.isCollapsed ? 'space-y-1' : 'space-y-1'}">
		{#if sidebarState.isCollapsed}
			<!-- Collapsed mode: icon-only -->
			<a href="/" class="relative flex items-center justify-center p-2 rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40 {$page.url.pathname === '/' ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/70 hover:text-gray-700 dark:hover:text-gray-200'}" title="Inbox">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-2.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
				</svg>
				{#if inboxState.itemCount > 0}
					<span class="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
				{/if}
			</a>

			<div class="mt-3">
			<a href="/actions" class="flex items-center justify-center p-2 rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40 {$page.url.pathname.startsWith('/actions') ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/70 hover:text-gray-700 dark:hover:text-gray-200'}" title="Next Actions">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
				</svg>
			</a>
			</div>

			<div class="mt-3">
			<a href="/projects" class="relative flex items-center justify-center p-2 rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40 {$page.url.pathname.startsWith('/projects') ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/70 hover:text-gray-700 dark:hover:text-gray-200'}" title="Projects">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
				</svg>
				{#if projectState.stalledCount > 0}
					<span class="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full"></span>
				{/if}
			</a>

			<a href="/waiting" class="flex items-center justify-center p-2 rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40 {$page.url.pathname.startsWith('/waiting') ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/70 hover:text-gray-700 dark:hover:text-gray-200'}" title="Waiting For">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
			</a>

			<a href="/someday" class="flex items-center justify-center p-2 rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40 {$page.url.pathname.startsWith('/someday') ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/70 hover:text-gray-700 dark:hover:text-gray-200'}" title="Someday/Maybe">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
				</svg>
			</a>
			</div>

			<div class="mt-3">
			<a href="/review" class="relative flex items-center justify-center p-2 rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40 {$page.url.pathname.startsWith('/review') ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/70 hover:text-gray-700 dark:hover:text-gray-200'}" title="Weekly Review">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
				</svg>
				{#if isOverdue()}
					<span class="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
				{/if}
			</a>

			<a href="/calendar" class="flex items-center justify-center p-2 rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40 {$page.url.pathname.startsWith('/calendar') ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/70 hover:text-gray-700 dark:hover:text-gray-200'}" title="Calendar">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
				</svg>
			</a>
			</div>

			<div class="mt-3">
			<a href="/settings" class="flex items-center justify-center p-2 rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40 {$page.url.pathname === '/settings' ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/70 hover:text-gray-700 dark:hover:text-gray-200'}" title="Settings">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
				</svg>
			</a>

			<a href="/changelog" class="relative flex items-center justify-center p-2 rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40 {$page.url.pathname === '/changelog' ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/70 hover:text-gray-700 dark:hover:text-gray-200'}" title="What's New">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
				</svg>
				{#if hasUnseenChangelog()}
					<span class="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
				{/if}
			</a>
			</div>
		{:else}
			<!-- Expanded mode: icons + text -->
			<FeatureHint feature="inbox" position="right">
				<a href="/" class="flex items-center justify-between px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-1 {$page.url.pathname === '/' ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100 font-semibold' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/70'}">
					<div class="flex items-center gap-2">
						<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-2.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
						</svg>
						<span>Inbox</span>
					</div>
					{#if inboxState.itemCount > 0}
						<span class="bg-blue-500 text-white text-xs font-medium px-2 py-0.5 rounded-full shadow-sm">{inboxState.itemCount}</span>
					{/if}
				</a>
			</FeatureHint>

			<div class="mt-3">
			<FeatureHint feature="next-actions" position="right">
				<a href="/actions" class="flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-1 {$page.url.pathname.startsWith('/actions') ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100 font-semibold' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/70'}">
					<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
					</svg>
					<span>Next Actions</span>
				</a>
			</FeatureHint>
			<div class="pl-2">
				<ContextList />
			</div>
			</div>

			<div class="mt-3">
			<FeatureHint feature="projects" position="right">
				<a href="/projects" class="flex items-center justify-between px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-1 {$page.url.pathname.startsWith('/projects') ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100 font-semibold' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/70'}">
					<div class="flex items-center gap-2">
						<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
						</svg>
						<span>Projects</span>
					</div>
					{#if projectState.stalledCount > 0}
						<span class="bg-yellow-500 text-white text-xs font-medium px-2 py-0.5 rounded-full shadow-sm">{projectState.stalledCount}</span>
					{/if}
				</a>
			</FeatureHint>

			<FeatureHint feature="waiting" position="right">
				<a href="/waiting" class="flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-1 {$page.url.pathname.startsWith('/waiting') ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100 font-semibold' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/70'}">
					<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<span>Waiting For</span>
				</a>
			</FeatureHint>

			<FeatureHint feature="someday" position="right">
				<a href="/someday" class="flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-1 {$page.url.pathname.startsWith('/someday') ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100 font-semibold' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/70'}">
					<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
					</svg>
					<span>Someday/Maybe</span>
				</a>
			</FeatureHint>
			</div>

			<div class="mt-3">
			<FeatureHint feature="review" position="right">
				<a href="/review" class="flex items-center justify-between px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-1 {$page.url.pathname.startsWith('/review') ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100 font-semibold' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/70'}">
					<div class="flex items-center gap-2">
						<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
						</svg>
						<span>Weekly Review</span>
					</div>
					{#if isOverdue()}
						<span class="bg-red-500 text-white text-xs font-medium px-2 py-0.5 rounded-full shadow-sm animate-pulse">Overdue</span>
					{/if}
				</a>
			</FeatureHint>

			<FeatureHint feature="calendar" position="right">
				<a href="/calendar" class="flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-1 {$page.url.pathname.startsWith('/calendar') ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100 font-semibold' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/70'}">
					<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
					</svg>
					<span>Calendar</span>
				</a>
			</FeatureHint>
			</div>

			<div class="mt-3">
			<FeatureHint feature="settings" position="right">
				<a href="/settings" class="flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-1 {$page.url.pathname === '/settings' ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100 font-semibold' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/70'}">
					<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
					</svg>
					<span>Settings</span>
				</a>
			</FeatureHint>
			</div>
		{/if}
	</nav>

	<!-- Footer: Feedback Button + Sync Status + Theme Toggle -->
	<div class="px-3 py-2 border-t border-gray-200/50 dark:border-gray-800/50">
		{#if sidebarState.isCollapsed}
			<!-- Collapsed mode: icon-only -->
			<div class="flex flex-col gap-2">
				<!-- Feedback button -->
				<button
					onclick={() => window.dispatchEvent(new CustomEvent('open-feedback-modal'))}
					class="w-full p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/70 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40 flex items-center justify-center"
					title="Send Feedback"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
					</svg>
				</button>

				<!-- Sync indicator (if paired) -->
				{#if syncState.isPaired}
					<div class="w-full p-2 rounded-md flex items-center justify-center relative" title={syncState.syncState === 'error' && syncState.lastError ? syncState.lastError : formatSyncTime()}>
						<!-- Cloud icon -->
						<svg class="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
						</svg>
						<!-- Status dot -->
						{#if syncState.syncState === 'idle'}
							<span class="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-green-500"></span>
						{:else if syncState.syncState === 'error'}
							<span class="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-red-500"></span>
						{:else}
							<!-- Syncing spinner -->
							<svg class="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
						{/if}
					</div>
				{/if}

				<!-- Theme toggle -->
				<button onclick={cycleTheme} class="w-full p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/70 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40 flex items-center justify-center" title="Toggle theme ({theme.current})">
					{#if theme.current === 'light'}
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
						</svg>
					{:else if theme.current === 'dark'}
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
						</svg>
					{:else}
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
						</svg>
					{/if}
				</button>
			</div>
		{:else}
			<!-- Expanded mode: icon + text -->
			<div class="flex flex-col gap-2">
				<!-- What's New link -->
				<a
					href="/changelog"
					class="w-full flex items-center justify-between px-2 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/70 rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40 {$page.url.pathname === '/changelog' ? 'bg-gray-100/70 dark:bg-gray-800/70 font-medium' : ''}"
				>
					<div class="flex items-center gap-2">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
						</svg>
						<span>What's New</span>
					</div>
					{#if hasUnseenChangelog()}
						<span class="w-2 h-2 bg-blue-500 rounded-full"></span>
					{/if}
				</a>

				<!-- Feedback button -->
				<button
					onclick={() => window.dispatchEvent(new CustomEvent('open-feedback-modal'))}
					class="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/70 rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
					</svg>
					<span>Send Feedback</span>
				</button>

				<!-- Sync indicator (if paired) -->
				{#if syncState.isPaired}
					<div class="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-600 dark:text-gray-400">
						<div class="relative">
							<!-- Cloud icon -->
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
							</svg>
							<!-- Status dot -->
							{#if syncState.syncState === 'idle'}
								<span class="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500"></span>
							{:else if syncState.syncState === 'error'}
								<span class="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500"></span>
							{/if}
						</div>
						{#if syncState.syncState === 'idle'}
							<span class="text-xs">Synced</span>
						{:else if syncState.syncState === 'error'}
							<span class="text-xs text-red-600 dark:text-red-400">Sync error</span>
						{:else}
							<div class="flex items-center gap-1">
								<svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								<span class="text-xs capitalize">{syncState.syncState}...</span>
							</div>
						{/if}
					</div>
				{/if}

				<!-- Theme toggle -->
				<ThemeToggle />
			</div>
		{/if}
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
