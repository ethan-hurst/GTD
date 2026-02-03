<script lang="ts">
	import { onMount } from 'svelte';
	import { changelog, getCategoryStyle, STORAGE_KEY } from '$lib/data/changelog';

	let lastSeenId = $state('');
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	// Category order for rendering
	const categoryOrder = ['added', 'improved', 'fixed', 'changed', 'deprecated', 'removed', 'security'];

	// Category labels for display
	const categoryLabels: Record<string, string> = {
		added: 'Added',
		improved: 'Improved',
		fixed: 'Fixed',
		changed: 'Changed',
		deprecated: 'Deprecated',
		removed: 'Removed',
		security: 'Security'
	};

	/**
	 * Format ISO date string for display
	 */
	function formatDate(dateStr: string): string {
		// Add T00:00:00 to avoid timezone offset issues with date-only strings
		const date = new Date(dateStr + 'T00:00:00');
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	/**
	 * Check if entry is newer than last seen
	 */
	function isNewEntry(entryId: string): boolean {
		if (!lastSeenId) return true;

		const entryIndex = changelog.findIndex(e => e.id === entryId);
		const lastSeenIndex = changelog.findIndex(e => e.id === lastSeenId);

		// If lastSeenId not found, treat all entries as new
		if (lastSeenIndex === -1) return true;

		// Entry is new if it appears before (lower index) the last seen entry
		return entryIndex < lastSeenIndex;
	}

	onMount(() => {
		// Load last seen ID from localStorage
		if (typeof localStorage !== 'undefined') {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				lastSeenId = stored;
			}
		}

		// Mark the latest entry as seen after 2 seconds
		if (changelog.length > 0) {
			timeoutId = setTimeout(() => {
				if (typeof localStorage !== 'undefined') {
					localStorage.setItem(STORAGE_KEY, changelog[0].id);
					lastSeenId = changelog[0].id;
				}
			}, 2000);
		}

		// Cleanup timeout on unmount
		return () => {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
		};
	});
</script>

<div class="max-w-4xl mx-auto p-4 tablet:p-6">
	<!-- Header -->
	<h1 class="text-2xl tablet:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
		What's New
	</h1>
	<p class="text-sm tablet:text-base text-gray-600 dark:text-gray-400 mb-8">
		Recent improvements and updates to your GTD app.
	</p>

	<!-- Changelog entries -->
	{#if changelog.length === 0}
		<!-- Empty state -->
		<div class="text-center text-gray-500 dark:text-gray-400 py-12">
			No updates yet.
		</div>
	{:else}
		<div class="space-y-8">
			{#each changelog as entry (entry.id)}
				<article class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-4 tablet:p-6">
					<!-- Date + Version Header -->
					<div class="flex items-center gap-2 mb-3">
						<time
							datetime={entry.date}
							class="text-sm tablet:text-base font-semibold text-gray-900 dark:text-gray-100"
						>
							{formatDate(entry.date)}
						</time>

						{#if entry.version}
							<span class="text-xs px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium">
								{entry.version}
							</span>
						{/if}

						{#if isNewEntry(entry.id)}
							<span
								class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"
								title="New update"
							></span>
						{/if}
					</div>

					<!-- Categories -->
					<div class="space-y-3 mt-3">
						{#each categoryOrder as category}
							{#if entry.categories[category as keyof typeof entry.categories]?.length}
								{@const items = entry.categories[category as keyof typeof entry.categories]}
								{@const style = getCategoryStyle(category)}

								<div>
									<!-- Category label with colored dot -->
									<div class="flex items-center gap-1.5 mb-1.5">
										<span class="w-1.5 h-1.5 rounded-full {style.dot}"></span>
										<span class="text-xs tablet:text-sm font-semibold uppercase tracking-wide {style.text}">
											{categoryLabels[category]}
										</span>
									</div>

									<!-- Items list -->
									<ul class="list-disc list-inside text-sm tablet:text-base text-gray-700 dark:text-gray-300 space-y-1 ml-3">
										{#each items as item}
											<li>{item}</li>
										{/each}
									</ul>
								</div>
							{/if}
						{/each}
					</div>
				</article>
			{/each}
		</div>
	{/if}
</div>
