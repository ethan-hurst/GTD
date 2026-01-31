<script lang="ts">
	import { theme } from '$lib/stores/theme.svelte';

	const options: Array<{ value: 'light' | 'dark' | 'system'; label: string; icon: string }> = [
		{ value: 'light', label: 'Light', icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z' },
		{ value: 'dark', label: 'Dark', icon: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z' },
		{ value: 'system', label: 'System', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' }
	];

	function handleChange(value: 'light' | 'dark' | 'system') {
		theme.set(value);
	}
</script>

<div class="space-y-2">
	<label class="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
		Theme
	</label>
	<div class="flex gap-1 bg-gray-200 dark:bg-gray-800 rounded-lg p-1">
		{#each options as option}
			<button
				onclick={() => handleChange(option.value)}
				class="flex-1 px-2 py-2 rounded-lg text-xs font-medium transition-all
					focus:outline-none focus:ring-2 focus:ring-blue-500/40
					{theme.current === option.value
						? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
						: 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'}"
				title={option.label}
			>
				<svg class="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={option.icon} />
				</svg>
			</button>
		{/each}
	</div>
</div>
