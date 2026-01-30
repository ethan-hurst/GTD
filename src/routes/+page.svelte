<script>
	let itemCount = $state(0);
</script>

<div class="max-w-4xl mx-auto p-8">
	<!-- Header -->
	<div class="flex items-center justify-between mb-8">
		<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Inbox</h1>
		<span class="text-sm text-gray-500 dark:text-gray-400">{itemCount} items</span>
	</div>

	<!-- Empty State -->
	<div class="text-center py-16">
		<div class="mb-6">
			<svg class="w-16 h-16 mx-auto text-gray-300 dark:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
			</svg>
		</div>
		<h2 class="text-xl font-medium text-gray-600 dark:text-gray-400 mb-2">
			Your inbox is empty
		</h2>
		<p class="text-sm text-gray-500 dark:text-gray-500 mb-8">
			Capture will be available in Phase 2
		</p>

		<!-- Placeholder Capture Input -->
		<div class="max-w-xl mx-auto">
			<input
				type="text"
				placeholder="Quick capture..."
				disabled
				class="w-full px-4 py-3 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-600 text-sm cursor-not-allowed"
			/>
		</div>
	</div>
</div>
