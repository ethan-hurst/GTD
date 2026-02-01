<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { inboxState } from '$lib/stores/inbox.svelte';
	import { projectState } from '$lib/stores/projects.svelte';
	import { weeklyReviewState } from '$lib/stores/review.svelte';
	import { syncState } from '$lib/stores/sync.svelte';

	let { isOpen = $bindable(false) } = $props();

	// Derive overdue status
	let isOverdue = $derived(() => {
		if (!weeklyReviewState.lastReviewDate) return true;
		const daysSince = Math.floor(
			(Date.now() - weeklyReviewState.lastReviewDate.getTime()) / (1000 * 60 * 60 * 24)
		);
		return daysSince > 7;
	});

	// Close drawer
	function closeDrawer() {
		isOpen = false;
	}

	// Handle escape key
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && isOpen) {
			closeDrawer();
		}
	}

	// Prevent body scroll when drawer is open
	$effect(() => {
		if (typeof document !== 'undefined') {
			if (isOpen) {
				document.body.style.overflow = 'hidden';
			} else {
				document.body.style.overflow = '';
			}
		}
	});

	onMount(async () => {
		// Load states for badges
		await inboxState.loadItems();
		await projectState.loadProjects();
		await weeklyReviewState.loadLastReview();
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Backdrop overlay -->
{#if isOpen}
	<div
		class="fixed inset-0 bg-black/50 z-40"
		onclick={closeDrawer}
		aria-hidden="true"
	></div>
{/if}

<!-- Slide-out drawer -->
<nav
	class="fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-900 z-50 transform transition-transform duration-300 {isOpen ? 'translate-x-0' : '-translate-x-full'} shadow-lg"
	aria-hidden={!isOpen}
>
	<!-- Drawer header with safe area -->
	<div class="px-4 py-3 border-b border-gray-200 dark:border-gray-800 pt-[env(safe-area-inset-top)] flex items-center justify-between">
		<h2 class="text-lg font-bold text-gray-900 dark:text-gray-100">Menu</h2>
		<button
			onclick={closeDrawer}
			class="p-2 -mr-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
			aria-label="Close menu"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
	</div>

	<!-- Navigation links with safe area bottom padding -->
	<div class="overflow-y-auto h-[calc(100%-4rem)] pb-[env(safe-area-inset-bottom)]">
		<a
			href="/"
			onclick={closeDrawer}
			class="flex items-center justify-between px-4 py-3 transition-colors duration-150 {$page.url.pathname === '/' ? 'bg-white dark:bg-gray-800 shadow-sm font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}"
		>
			<div class="flex items-center gap-3">
				<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-2.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
				</svg>
				<span>Inbox</span>
			</div>
			{#if inboxState.itemCount > 0}
				<span class="bg-blue-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">{inboxState.itemCount}</span>
			{/if}
		</a>

		<a
			href="/actions"
			onclick={closeDrawer}
			class="flex items-center gap-3 px-4 py-3 transition-colors duration-150 {$page.url.pathname.startsWith('/actions') ? 'bg-white dark:bg-gray-800 shadow-sm font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}"
		>
			<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
			</svg>
			<span>Next Actions</span>
		</a>

		<a
			href="/projects"
			onclick={closeDrawer}
			class="flex items-center justify-between px-4 py-3 transition-colors duration-150 {$page.url.pathname.startsWith('/projects') ? 'bg-white dark:bg-gray-800 shadow-sm font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}"
		>
			<div class="flex items-center gap-3">
				<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
				</svg>
				<span>Projects</span>
			</div>
			{#if projectState.stalledCount > 0}
				<span class="bg-yellow-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">{projectState.stalledCount}</span>
			{/if}
		</a>

		<a
			href="/waiting"
			onclick={closeDrawer}
			class="flex items-center gap-3 px-4 py-3 transition-colors duration-150 {$page.url.pathname.startsWith('/waiting') ? 'bg-white dark:bg-gray-800 shadow-sm font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}"
		>
			<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
			<span>Waiting For</span>
		</a>

		<a
			href="/someday"
			onclick={closeDrawer}
			class="flex items-center gap-3 px-4 py-3 transition-colors duration-150 {$page.url.pathname.startsWith('/someday') ? 'bg-white dark:bg-gray-800 shadow-sm font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}"
		>
			<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
			</svg>
			<span>Someday/Maybe</span>
		</a>

		<a
			href="/review"
			onclick={closeDrawer}
			class="flex items-center justify-between px-4 py-3 transition-colors duration-150 {$page.url.pathname.startsWith('/review') ? 'bg-white dark:bg-gray-800 shadow-sm font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}"
		>
			<div class="flex items-center gap-3">
				<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
				</svg>
				<span>Weekly Review</span>
			</div>
			{#if isOverdue()}
				<span class="bg-red-500 text-white text-xs font-medium px-2 py-0.5 rounded-full animate-pulse">Overdue</span>
			{/if}
		</a>

		<a
			href="/calendar"
			onclick={closeDrawer}
			class="flex items-center gap-3 px-4 py-3 transition-colors duration-150 {$page.url.pathname.startsWith('/calendar') ? 'bg-white dark:bg-gray-800 shadow-sm font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}"
		>
			<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
			</svg>
			<span>Calendar</span>
		</a>

		<a
			href="/settings"
			onclick={closeDrawer}
			class="flex items-center justify-between px-4 py-3 transition-colors duration-150 {$page.url.pathname === '/settings' ? 'bg-white dark:bg-gray-800 shadow-sm font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}"
		>
			<div class="flex items-center gap-3">
				<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
				</svg>
				<span>Settings</span>
			</div>
			<!-- Minimal sync indicator -->
			{#if syncState.isPaired}
				{#if syncState.syncState !== 'idle' && syncState.syncState !== 'error'}
					<!-- Syncing: spinning icon -->
					<svg class="w-4 h-4 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
				{:else if syncState.syncState === 'error'}
					<!-- Error: red dot -->
					<span class="w-2 h-2 rounded-full bg-red-500"></span>
				{/if}
			{/if}
		</a>

		<!-- Feedback button (separated with border) -->
		<button
			onclick={() => {
				closeDrawer();
				window.dispatchEvent(new CustomEvent('open-feedback-modal'));
			}}
			class="flex items-center gap-3 px-4 py-3 border-t border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
		>
			<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
			</svg>
			<span>Send Feedback</span>
		</button>
	</div>
</nav>
