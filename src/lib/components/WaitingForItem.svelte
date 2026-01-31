<script lang="ts">
	import { slide } from 'svelte/transition';
	import toast from 'svelte-5-french-toast';
	import { resolveWaitingFor, updateItem } from '$lib/db/operations';
	import type { GTDItem } from '$lib/db/schema';

	interface Props {
		item: GTDItem;
		isOverdue: boolean;
		isExpanded: boolean;
		onToggleExpand: () => void;
		onResolved: () => void;
	}

	let { item, isOverdue, isExpanded, onToggleExpand, onResolved }: Props = $props();

	let isResolving = $state(false);

	// Local state for editable fields
	let notesValue = $state(item.notes || '');
	let followUpDateValue = $state(item.followUpDate ? formatDateForInput(item.followUpDate) : '');
	let personValue = $state(item.delegatedTo || '');

	// Keep values in sync with item
	$effect(() => {
		notesValue = item.notes || '';
		followUpDateValue = item.followUpDate ? formatDateForInput(item.followUpDate) : '';
		personValue = item.delegatedTo || '';
	});

	function formatDateForInput(date: Date): string {
		// Format as YYYY-MM-DD for native date input
		const d = new Date(date);
		const year = d.getFullYear();
		const month = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	function formatDate(date: Date): string {
		return new Date(date).toLocaleDateString();
	}

	let undoFn: (() => Promise<void>) | null = $state(null);

	let resolveTimeoutId: ReturnType<typeof setTimeout> | null = null;

	async function handleResolve() {
		isResolving = true;

		// Call resolveWaitingFor and get undo function
		const undo = await resolveWaitingFor(item.id);
		undoFn = undo;

		toast.success(`"${item.title}" resolved`);

		// Delay list reload so the inline undo button stays visible
		resolveTimeoutId = setTimeout(async () => {
			resolveTimeoutId = null;
			onResolved();
		}, 7000);
	}

	async function handleUndo() {
		if (!undoFn) return;
		if (resolveTimeoutId) {
			clearTimeout(resolveTimeoutId);
			resolveTimeoutId = null;
		}
		await undoFn();
		undoFn = null;
		isResolving = false;
		toast.dismiss();
		toast.success('Restored');
		onResolved();
	}

	async function handleNotesBlur() {
		if (notesValue !== (item.notes || '')) {
			await updateItem(item.id, { notes: notesValue });
		}
	}

	async function handleFollowUpDateChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const newDate = input.value ? new Date(input.value) : undefined;
		await updateItem(item.id, { followUpDate: newDate });
		onResolved(); // Reload to update overdue status
	}

	async function handlePersonBlur() {
		if (personValue !== (item.delegatedTo || '')) {
			await updateItem(item.id, { delegatedTo: personValue });
		}
	}

	function handleResolveClick(e: MouseEvent) {
		e.stopPropagation();
		handleResolve();
	}
</script>

{#if !isResolving}
	<div
		class={`rounded-lg border transition-shadow ${
			isOverdue
				? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 border-l-2 border-l-red-400'
				: 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
		}`}
	>
		<!-- Main row -->
		<div
			class="min-h-11 px-4 py-3 cursor-pointer active:bg-gray-50 dark:active:bg-gray-800 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset rounded-lg"
			onclick={onToggleExpand}
			role="button"
			tabindex="0"
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					onToggleExpand();
				}
			}}
		>
			<div class="flex items-start justify-between gap-2">
				<div class="flex-1 min-w-0">
					<!-- Title -->
					<h3 class="font-bold text-gray-900 dark:text-gray-100 text-base truncate">
						{item.title}
					</h3>

					<!-- Delegated to -->
					<p class="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
						Delegated to: {item.delegatedTo || 'Unknown'}
					</p>

					<!-- Metadata - stack on mobile -->
					<div class="flex flex-col phablet:flex-row phablet:items-center gap-1 phablet:gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
						<span>Delegated: {formatDate(item.created)}</span>
						{#if item.followUpDate}
							<span
								class={isOverdue
									? 'text-red-700 dark:text-red-300 font-medium'
									: ''}
							>
								Follow up: {formatDate(item.followUpDate)}
							</span>
						{/if}
					</div>
				</div>

				<!-- Resolve button -->
				<button
					onclick={handleResolveClick}
					class="min-h-11 min-w-11 px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 rounded-md transition-colors flex-shrink-0"
					title="Resolve waiting-for item"
				>
					Resolve
				</button>
			</div>
		</div>

		<!-- Expand panel -->
		{#if isExpanded}
			<div class="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4" transition:slide={{ duration: 200 }}>
				<!-- Notes field -->
				<div>
					<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
						Notes
					</label>
					<textarea
						bind:value={notesValue}
						onblur={handleNotesBlur}
						onclick={(e) => e.stopPropagation()}
						placeholder="Add notes about this waiting-for item..."
						class="w-full px-3 py-2 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						rows="3"
					></textarea>
				</div>

				<!-- Follow-up date field -->
				<div>
					<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
						Follow-up date
					</label>
					<input
						type="date"
						value={followUpDateValue}
						onchange={handleFollowUpDateChange}
						onclick={(e) => e.stopPropagation()}
						class="w-full px-3 py-2 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					/>
				</div>

				<!-- Person field -->
				<div>
					<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
						Person
					</label>
					<input
						type="text"
						bind:value={personValue}
						onblur={handlePersonBlur}
						onclick={(e) => e.stopPropagation()}
						placeholder="Who are you waiting for?"
						class="w-full px-3 py-2 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					/>
				</div>

				<!-- Project link (if exists) -->
				{#if item.projectId}
					<div>
						<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
							Project
						</label>
						<div class="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-gray-600 dark:text-gray-400">
							Project #{item.projectId}
						</div>
					</div>
				{/if}

				<!-- Delete button -->
				<div class="flex justify-end pt-2">
					<button
						onclick={async (e) => {
							e.stopPropagation();
							if (confirm('Delete this waiting-for item?')) {
								await updateItem(item.id, { completedAt: new Date() });
								onResolved();
							}
						}}
						class="min-h-11 min-w-11 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
					>
						Delete
					</button>
				</div>
			</div>
		{/if}
	</div>
{:else}
	<!-- Resolving state: show undo option -->
	<div
		class="px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between"
	>
		<h3 class="font-bold text-gray-400 dark:text-gray-500 line-through">
			{item.title}
		</h3>
		<button
			onclick={handleUndo}
			class="ml-4 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
		>
			Undo
		</button>
	</div>
{/if}
