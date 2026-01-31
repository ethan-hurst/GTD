<script lang="ts">
	import { page } from '$app/stores';

	// Event dispatcher for toggle
	let { onToggle } = $props<{ onToggle: () => void }>();

	// Derive page title from current route
	const pageTitle = $derived(() => {
		const pathname = $page.url.pathname;
		if (pathname === '/') return 'Inbox';
		if (pathname.startsWith('/actions')) return 'Next Actions';
		if (pathname.startsWith('/projects')) return 'Projects';
		if (pathname.startsWith('/waiting')) return 'Waiting For';
		if (pathname.startsWith('/someday')) return 'Someday/Maybe';
		if (pathname.startsWith('/calendar')) return 'Calendar';
		if (pathname.startsWith('/review')) return 'Weekly Review';
		if (pathname === '/settings') return 'Settings';
		return 'GTD';
	});

	let isExpanded = $state(false);

	function handleToggle() {
		isExpanded = !isExpanded;
		onToggle();
	}
</script>

<!-- Fixed mobile header - visible only below tablet breakpoint -->
<header class="fixed top-0 left-0 right-0 z-30 tablet:hidden bg-white dark:bg-gray-900 shadow-sm pt-[env(safe-area-inset-top)]">
	<div class="flex items-center justify-between px-4 py-3">
		<!-- Hamburger button -->
		<button
			onclick={handleToggle}
			class="p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
			aria-expanded={isExpanded}
			aria-label="Toggle navigation menu"
		>
			<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
			</svg>
		</button>

		<!-- Page title -->
		<h1 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
			{pageTitle()}
		</h1>

		<!-- Spacer for symmetry -->
		<div class="w-10"></div>
	</div>
</header>
