<script lang="ts">
	import { onMount } from 'svelte';
	import { adminStore } from '$lib/stores/admin.svelte';

	let loading = $state(false);
	let error = $state('');
	let items = $state<any[]>([]);
	let total = $state(0);
	let selectedItem = $state<any>(null);
	let screenshot = $state<string | null>(null);
	let loadingScreenshot = $state(false);
	let statusFilter = $state('');
	let typeFilter = $state('');
	let updatingStatus = $state('');

	async function fetchFeedback() {
		loading = true;
		error = '';
		try {
			const params = new URLSearchParams();
			if (statusFilter) params.set('status', statusFilter);
			if (typeFilter) params.set('type', typeFilter);

			const response = await fetch(
				`/.netlify/functions/feedback-query?${params.toString()}`,
				{
					headers: {
						Authorization: adminStore.getAuthHeader()
					}
				}
			);

			if (response.status === 401) {
				adminStore.signOut();
				return;
			}
			if (response.status === 503) {
				error = 'Feedback admin not configured. Set ANALYTICS_PASSWORD in Netlify.';
				loading = false;
				return;
			}
			if (!response.ok) {
				error = 'Failed to load feedback data';
				loading = false;
				return;
			}

			const data = await response.json();
			items = data.items;
			total = data.total;
		} catch (err) {
			error = 'Network error. Please try again.';
		} finally {
			loading = false;
		}
	}

	async function viewDetail(item: any) {
		selectedItem = item;
		screenshot = null;

		if (item.hasScreenshot) {
			loadingScreenshot = true;
			try {
				const response = await fetch(
					`/.netlify/functions/feedback-query?id=${item.id}&screenshot=true`,
					{
						headers: {
							Authorization: adminStore.getAuthHeader()
						}
					}
				);
				if (response.ok) {
					const data = await response.json();
					screenshot = data.screenshot;
				}
			} catch (err) {
				console.error('Failed to load screenshot:', err);
			} finally {
				loadingScreenshot = false;
			}
		}
	}

	async function updateStatus(itemId: string, newStatus: string) {
		updatingStatus = itemId;
		try {
			const response = await fetch('/.netlify/functions/feedback-update', {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					Authorization: adminStore.getAuthHeader()
				},
				body: JSON.stringify({ id: itemId, status: newStatus })
			});

			if (response.status === 401) {
				adminStore.signOut();
				return;
			}

			if (response.ok) {
				items = items.map((item) =>
					item.id === itemId
						? { ...item, status: newStatus, reviewedAt: new Date().toISOString() }
						: item
				);
				if (selectedItem?.id === itemId) {
					selectedItem = {
						...selectedItem,
						status: newStatus,
						reviewedAt: new Date().toISOString()
					};
				}
			}
		} catch (err) {
			console.error('Failed to update status:', err);
		} finally {
			updatingStatus = '';
		}
	}

	function changeFilter(newStatusFilter: string, newTypeFilter: string) {
		statusFilter = newStatusFilter;
		typeFilter = newTypeFilter;
		fetchFeedback();
	}

	function backToList() {
		selectedItem = null;
		screenshot = null;
	}

	function getStatusBadgeClass(status: string): string {
		switch (status) {
			case 'new':
				return 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300';
			case 'reviewed':
				return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
			case 'resolved':
				return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
			case 'archived':
				return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
			default:
				return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
		}
	}

	function getTypeBadgeClass(type: string): string {
		return type === 'bug'
			? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
			: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
	}

	onMount(() => {
		fetchFeedback();
	});
</script>

{#if selectedItem}
	<!-- Detail view -->
	<div class="p-6 max-w-4xl mx-auto">
		<button
			onclick={backToList}
			class="mb-6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors duration-150"
		>
			← Back to list
		</button>

		<div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
			<!-- Header with badges -->
			<div class="flex flex-wrap gap-2 mb-4">
				<span
					class="px-3 py-1 text-xs font-medium rounded-full {getTypeBadgeClass(
						selectedItem.type
					)}"
				>
					{selectedItem.type === 'bug' ? 'Bug' : 'Feature'}
				</span>
				<span
					class="px-3 py-1 text-xs font-medium rounded-full {getStatusBadgeClass(
						selectedItem.status
					)}"
				>
					{selectedItem.status}
				</span>
			</div>

			<!-- Description -->
			<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Description</h2>
			<p class="text-gray-700 dark:text-gray-300 mb-6 whitespace-pre-wrap">
				{selectedItem.description}
			</p>

			<!-- Contact info -->
			{#if selectedItem.email}
				<div class="mb-6">
					<h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Contact</h3>
					<a
						href="mailto:{selectedItem.email}"
						class="text-blue-600 dark:text-blue-400 hover:underline"
					>
						{selectedItem.email}
					</a>
				</div>
			{/if}

			<!-- User agent -->
			<div class="mb-6">
				<h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">User Agent</h3>
				<p class="text-xs text-gray-600 dark:text-gray-400 font-mono">
					{selectedItem.userAgent || 'Not available'}
				</p>
			</div>

			<!-- Timestamps -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
				<div>
					<h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Submitted</h3>
					<p class="text-sm text-gray-700 dark:text-gray-300">
						{new Date(selectedItem.submittedAt).toLocaleString()}
					</p>
				</div>
				{#if selectedItem.reviewedAt}
					<div>
						<h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Reviewed</h3>
						<p class="text-sm text-gray-700 dark:text-gray-300">
							{new Date(selectedItem.reviewedAt).toLocaleString()}
						</p>
					</div>
				{/if}
			</div>

			<!-- Screenshot -->
			{#if selectedItem.hasScreenshot}
				<div class="mb-6">
					<h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Screenshot</h3>
					{#if loadingScreenshot}
						<div class="flex items-center justify-center h-48 bg-gray-100 dark:bg-gray-700 rounded">
							<p class="text-gray-500 dark:text-gray-400">Loading screenshot...</p>
						</div>
					{:else if screenshot}
						<img
							src={screenshot}
							alt="Feedback screenshot"
							class="max-w-full h-auto rounded border border-gray-300 dark:border-gray-600"
						/>
					{:else}
						<p class="text-gray-500 dark:text-gray-400 text-sm">Screenshot not available</p>
					{/if}
				</div>
			{/if}

			<!-- Status actions -->
			<div class="flex flex-wrap gap-3">
				{#if selectedItem.status === 'new'}
					<button
						onclick={() => updateStatus(selectedItem.id, 'reviewed')}
						disabled={updatingStatus === selectedItem.id}
						class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-150"
					>
						{updatingStatus === selectedItem.id ? 'Updating...' : 'Mark Reviewed'}
					</button>
				{/if}
				{#if selectedItem.status === 'reviewed'}
					<button
						onclick={() => updateStatus(selectedItem.id, 'resolved')}
						disabled={updatingStatus === selectedItem.id}
						class="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-150"
					>
						{updatingStatus === selectedItem.id ? 'Updating...' : 'Mark Resolved'}
					</button>
				{/if}
				{#if selectedItem.status !== 'archived'}
					<button
						onclick={() => updateStatus(selectedItem.id, 'archived')}
						disabled={updatingStatus === selectedItem.id}
						class="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-150"
					>
						{updatingStatus === selectedItem.id ? 'Updating...' : 'Archive'}
					</button>
				{/if}
			</div>
		</div>
	</div>
{:else}
	<!-- Dashboard -->
	<div class="p-6 max-w-7xl mx-auto">
		<!-- Header -->
		<div class="mb-6">
			<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Feedback Dashboard</h1>
			<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
				{total} {total === 1 ? 'item' : 'items'} total
			</p>
		</div>

		{#if loading && items.length === 0}
			<div class="flex items-center justify-center py-12">
				<p class="text-gray-500 dark:text-gray-400">Loading feedback...</p>
			</div>
		{:else if error}
			<div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
				<p class="text-red-600 dark:text-red-400">{error}</p>
			</div>
		{:else}
			<!-- Filters -->
			<div class="mb-6 space-y-3">
				<!-- Status filter -->
				<div>
					<p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</p>
					<div class="flex flex-wrap gap-2">
						<button
							onclick={() => changeFilter('', typeFilter)}
							class="px-4 py-2 rounded-lg font-medium transition-colors duration-150 {statusFilter ===
							''
								? 'bg-blue-600 text-white'
								: 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}"
						>
							All
						</button>
						<button
							onclick={() => changeFilter('new', typeFilter)}
							class="px-4 py-2 rounded-lg font-medium transition-colors duration-150 {statusFilter ===
							'new'
								? 'bg-blue-600 text-white'
								: 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}"
						>
							New
						</button>
						<button
							onclick={() => changeFilter('reviewed', typeFilter)}
							class="px-4 py-2 rounded-lg font-medium transition-colors duration-150 {statusFilter ===
							'reviewed'
								? 'bg-blue-600 text-white'
								: 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}"
						>
							Reviewed
						</button>
						<button
							onclick={() => changeFilter('resolved', typeFilter)}
							class="px-4 py-2 rounded-lg font-medium transition-colors duration-150 {statusFilter ===
							'resolved'
								? 'bg-blue-600 text-white'
								: 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}"
						>
							Resolved
						</button>
						<button
							onclick={() => changeFilter('archived', typeFilter)}
							class="px-4 py-2 rounded-lg font-medium transition-colors duration-150 {statusFilter ===
							'archived'
								? 'bg-blue-600 text-white'
								: 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}"
						>
							Archived
						</button>
					</div>
				</div>

				<!-- Type filter -->
				<div>
					<p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</p>
					<div class="flex flex-wrap gap-2">
						<button
							onclick={() => changeFilter(statusFilter, '')}
							class="px-4 py-2 rounded-lg font-medium transition-colors duration-150 {typeFilter ===
							''
								? 'bg-blue-600 text-white'
								: 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}"
						>
							All
						</button>
						<button
							onclick={() => changeFilter(statusFilter, 'bug')}
							class="px-4 py-2 rounded-lg font-medium transition-colors duration-150 {typeFilter ===
							'bug'
								? 'bg-blue-600 text-white'
								: 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}"
						>
							Bugs
						</button>
						<button
							onclick={() => changeFilter(statusFilter, 'feature')}
							class="px-4 py-2 rounded-lg font-medium transition-colors duration-150 {typeFilter ===
							'feature'
								? 'bg-blue-600 text-white'
								: 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}"
						>
							Features
						</button>
					</div>
				</div>
			</div>

			<!-- Summary cards -->
			<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
				<div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
					<h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Total</h3>
					<p class="text-3xl font-bold text-gray-900 dark:text-gray-100">{items.length}</p>
				</div>

				<div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
					<h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">New</h3>
					<p class="text-3xl font-bold text-gray-900 dark:text-gray-100">
						{items.filter((i) => i.status === 'new').length}
					</p>
				</div>

				<div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
					<h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Bugs</h3>
					<p class="text-3xl font-bold text-gray-900 dark:text-gray-100">
						{items.filter((i) => i.type === 'bug').length}
					</p>
				</div>

				<div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
					<h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Features</h3>
					<p class="text-3xl font-bold text-gray-900 dark:text-gray-100">
						{items.filter((i) => i.type === 'feature').length}
					</p>
				</div>
			</div>

			<!-- Items list -->
			{#if items.length > 0}
				<div class="space-y-4">
					{#each items as item (item.id)}
						<button
							onclick={() => viewDetail(item)}
							class="w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 text-left hover:shadow-md transition-shadow duration-150"
						>
							<div class="flex flex-wrap gap-2 mb-3">
								<span class="px-3 py-1 text-xs font-medium rounded-full {getTypeBadgeClass(item.type)}">
									{item.type === 'bug' ? 'Bug' : 'Feature'}
								</span>
								<span
									class="px-3 py-1 text-xs font-medium rounded-full {getStatusBadgeClass(item.status)}"
								>
									{item.status}
								</span>
								{#if item.hasScreenshot}
									<span
										class="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
									>
										Screenshot
									</span>
								{/if}
							</div>

							<p class="text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
								{item.description}
							</p>

							<div class="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
								{#if item.email}
									<span>{item.email}</span>
								{/if}
								<span>{new Date(item.submittedAt).toLocaleDateString()}</span>
							</div>
						</button>
					{/each}
				</div>
			{:else}
				<div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
					<p class="text-gray-500 dark:text-gray-400">No feedback items found</p>
				</div>
			{/if}
		{/if}
	</div>
{/if}
