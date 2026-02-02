<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { theme } from '$lib/stores/theme.svelte';
	import { adminStore } from '$lib/stores/admin.svelte';
	import '../../app.css';

	const { children } = $props();

	let password = $state('');
	let loading = $state(false);
	let error = $state('');

	const pathname = $derived($page.url.pathname);

	const navItems = [
		{ href: '/admin', label: 'Hub' },
		{ href: '/admin/analytics', label: 'Analytics' },
		{ href: '/admin/feedback', label: 'Feedback' }
	];

	function isActive(href: string): boolean {
		if (href === '/admin') return pathname === '/admin';
		return pathname.startsWith(href);
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		loading = true;
		error = '';

		const result = await adminStore.authenticate(password);
		if (!result.ok) {
			error = result.error!;
		}
		loading = false;
	}

	onMount(() => {
		theme.apply();
		adminStore.restoreSession();
	});
</script>

{#if !adminStore.authenticated}
	<div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
		<div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 w-full max-w-md">
			<h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
				Admin Dashboard
			</h1>
			<p class="text-gray-600 dark:text-gray-400 mb-6">
				Enter the admin password to continue.
			</p>

			<form onsubmit={handleSubmit}>
				<input
					type="password"
					bind:value={password}
					placeholder="Admin password"
					class="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-40 mb-4"
					disabled={loading}
				/>

				{#if error}
					<p class="text-red-600 dark:text-red-400 text-sm mb-4">{error}</p>
				{/if}

				<button
					type="submit"
					disabled={loading || !password}
					class="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-150"
				>
					{loading ? 'Authenticating...' : 'Sign In'}
				</button>
			</form>
		</div>
	</div>
{:else}
	<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
		<!-- Admin nav bar -->
		<nav class="bg-white dark:bg-gray-800 shadow-sm">
			<div class="max-w-7xl mx-auto px-6 flex items-center justify-between h-14">
				<div class="flex items-center gap-1">
					{#each navItems as item}
						<a
							href={item.href}
							class="px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 {isActive(item.href)
								? 'bg-blue-600 text-white'
								: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}"
						>
							{item.label}
						</a>
					{/each}
				</div>

				<button
					onclick={() => adminStore.signOut()}
					class="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
				>
					Sign out
				</button>
			</div>
		</nav>

		<!-- Page content -->
		{@render children()}
	</div>
{/if}
