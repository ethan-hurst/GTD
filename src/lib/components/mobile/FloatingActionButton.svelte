<script lang="ts">
	import { goto } from '$app/navigation';

	function handleClick() {
		goto('/').then(() => {
			// Dispatch custom event for inbox to focus the capture input
			window.dispatchEvent(new CustomEvent('focus-inbox-capture'));
		});
	}
</script>

<!-- FAB - visible only on mobile, hidden on tablet+ -->
<button
	onclick={handleClick}
	class="tablet:hidden fixed w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg z-50 flex items-center justify-center active:scale-95 active:bg-blue-800 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2"
	style="bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px)); right: calc(1.5rem + env(safe-area-inset-right, 0px));"
	aria-label="Quick capture to inbox"
>
	<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
	</svg>
</button>
