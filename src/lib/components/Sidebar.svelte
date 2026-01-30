<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import ThemeToggle from './ThemeToggle.svelte';
	import { inboxState } from '$lib/stores/inbox.svelte';

	onMount(async () => {
		await inboxState.loadItems();
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
