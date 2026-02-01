<script lang="ts">
	let password = $state('');
	let authenticated = $state(false);
	let loading = $state(false);
	let error = $state('');
	let data: any = $state(null);
	let days = $state(30);
	let chartCanvas: HTMLCanvasElement;
	let chartInstance: any = null;

	async function fetchAnalytics() {
		loading = true;
		error = '';

		try {
			const response = await fetch(`/.netlify/functions/analytics-query?days=${days}`, {
				headers: {
					Authorization: `Basic ${btoa(`admin:${password}`)}`
				}
			});

			if (response.status === 401) {
				error = 'Invalid password';
				loading = false;
				return;
			}

			if (response.status === 503) {
				error = 'Analytics not configured. Set ANALYTICS_PASSWORD in Netlify.';
				loading = false;
				return;
			}

			if (!response.ok) {
				error = 'Failed to load analytics data';
				loading = false;
				return;
			}

			data = await response.json();
			authenticated = true;
		} catch (err) {
			error = 'Network error. Please try again.';
		} finally {
			loading = false;
		}
	}

	function handleSubmit(e: Event) {
		e.preventDefault();
		fetchAnalytics();
	}

	function changeDays(newDays: number) {
		days = newDays;
		fetchAnalytics();
	}

	// Chart rendering effect
	$effect(() => {
		if (data && chartCanvas) {
			(async () => {
				const ChartJS = (await import('chart.js/auto')).default;

				// Cleanup previous chart instance
				if (chartInstance) {
					chartInstance.destroy();
				}

				// Prepare data
				const labels = data.summary.dailyMetrics.map((d: any) => d.date);
				const uniqueVisitors = data.summary.dailyMetrics.map((d: any) => d.uniqueVisitors);
				const pageviews = data.summary.dailyMetrics.map((d: any) => d.pageviews);

				// Create new chart
				chartInstance = new ChartJS(chartCanvas, {
					type: 'line',
					data: {
						labels,
						datasets: [
							{
								label: 'Unique Visitors',
								data: uniqueVisitors,
								borderColor: 'rgb(59, 130, 246)',
								backgroundColor: 'rgba(59, 130, 246, 0.1)',
								tension: 0.3
							},
							{
								label: 'Pageviews',
								data: pageviews,
								borderColor: 'rgb(34, 197, 94)',
								backgroundColor: 'rgba(34, 197, 94, 0.1)',
								tension: 0.3
							}
						]
					},
					options: {
						responsive: true,
						maintainAspectRatio: false
					}
				});
			})();
		}

		// Cleanup on effect teardown
		return () => {
			if (chartInstance) {
				chartInstance.destroy();
				chartInstance = null;
			}
		};
	});

	// Calculate total events
	function getTotalEvents(): number {
		if (!data?.summary?.topEvents) return 0;
		return data.summary.topEvents.reduce((sum: number, evt: any) => sum + evt.count, 0);
	}
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
	{#if !authenticated}
		<!-- Password prompt -->
		<div class="flex items-center justify-center min-h-screen p-4">
			<div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 w-full max-w-md">
				<h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
					Analytics Dashboard
				</h1>
				<p class="text-gray-600 dark:text-gray-400 mb-6">
					Enter the admin password to view analytics.
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
						{loading ? 'Loading...' : 'View Analytics'}
					</button>
				</form>
			</div>
		</div>
	{:else}
		<!-- Dashboard -->
		<div class="p-6 max-w-7xl mx-auto">
			<!-- Header -->
			<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
				<div>
					<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Analytics Dashboard</h1>
					{#if data?.generatedAt}
						<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
							Generated {new Date(data.generatedAt).toLocaleString()}
						</p>
					{/if}
				</div>

				<!-- Date range selector -->
				<div class="flex gap-2 mt-4 sm:mt-0">
					<button
						onclick={() => changeDays(7)}
						class="px-4 py-2 rounded-lg font-medium transition-colors duration-150 {days === 7
							? 'bg-blue-600 text-white'
							: 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}"
					>
						7d
					</button>
					<button
						onclick={() => changeDays(30)}
						class="px-4 py-2 rounded-lg font-medium transition-colors duration-150 {days === 30
							? 'bg-blue-600 text-white'
							: 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}"
					>
						30d
					</button>
					<button
						onclick={() => changeDays(90)}
						class="px-4 py-2 rounded-lg font-medium transition-colors duration-150 {days === 90
							? 'bg-blue-600 text-white'
							: 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}"
					>
						90d
					</button>
				</div>
			</div>

			<!-- Summary cards -->
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
				<div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
					<h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
						Total Pageviews
					</h3>
					<p class="text-3xl font-bold text-gray-900 dark:text-gray-100">
						{data?.summary?.totalPageviews?.toLocaleString() ?? 0}
					</p>
				</div>

				<div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
					<h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
						Unique Visitors
					</h3>
					<p class="text-3xl font-bold text-gray-900 dark:text-gray-100">
						{data?.summary?.totalUniqueVisitors?.toLocaleString() ?? 0}
					</p>
				</div>

				<div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
					<h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Events Tracked</h3>
					<p class="text-3xl font-bold text-gray-900 dark:text-gray-100">
						{getTotalEvents().toLocaleString()}
					</p>
				</div>
			</div>

			<!-- Line chart -->
			<div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
				<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
					Visitors & Pageviews Over Time
				</h3>
				<div style="height: 300px;">
					<canvas bind:this={chartCanvas}></canvas>
				</div>
			</div>

			<!-- Ranked lists -->
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
				<!-- Top Pages -->
				<div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
					<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Top Pages</h3>
					{#if data?.summary?.topPages?.length > 0}
						<div class="space-y-1">
							{#each data.summary.topPages.slice(0, 10) as page, i}
								<div
									class="flex justify-between items-center py-2 px-3 rounded {i % 2 === 0
										? 'bg-gray-50 dark:bg-gray-700'
										: ''}"
								>
									<span class="text-sm text-gray-700 dark:text-gray-300 truncate">{page.path}</span>
									<span class="text-sm font-medium text-gray-900 dark:text-gray-100 ml-2"
										>{page.views.toLocaleString()}</span
									>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-gray-500 dark:text-gray-400 text-sm">No data yet</p>
					{/if}
				</div>

				<!-- Top Events -->
				<div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
					<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Top Events</h3>
					{#if data?.summary?.topEvents?.length > 0}
						<div class="space-y-1">
							{#each data.summary.topEvents.slice(0, 10) as event, i}
								<div
									class="flex justify-between items-center py-2 px-3 rounded {i % 2 === 0
										? 'bg-gray-50 dark:bg-gray-700'
										: ''}"
								>
									<span class="text-sm text-gray-700 dark:text-gray-300 truncate">{event.event}</span>
									<span class="text-sm font-medium text-gray-900 dark:text-gray-100 ml-2"
										>{event.count.toLocaleString()}</span
									>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-gray-500 dark:text-gray-400 text-sm">No data yet</p>
					{/if}
				</div>

				<!-- Referrers -->
				<div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
					<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Referrers</h3>
					{#if data?.summary?.referrers?.length > 0}
						<div class="space-y-1">
							{#each data.summary.referrers.slice(0, 10) as referrer, i}
								<div
									class="flex justify-between items-center py-2 px-3 rounded {i % 2 === 0
										? 'bg-gray-50 dark:bg-gray-700'
										: ''}"
								>
									<span class="text-sm text-gray-700 dark:text-gray-300 truncate"
										>{referrer.source}</span
									>
									<span class="text-sm font-medium text-gray-900 dark:text-gray-100 ml-2"
										>{referrer.count.toLocaleString()}</span
									>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-gray-500 dark:text-gray-400 text-sm">No data yet</p>
					{/if}
				</div>
			</div>

			<!-- Footer -->
			<div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
				<div class="text-sm text-gray-600 dark:text-gray-400 space-y-1">
					<p><strong>Data retention:</strong> 13 months</p>
					<p>
						<strong>Privacy:</strong> No cookies, no PII, daily-rotating visitor hashes
					</p>
				</div>
			</div>
		</div>
	{/if}
</div>
