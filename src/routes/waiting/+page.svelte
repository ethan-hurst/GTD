<script lang="ts">
	import { onMount } from 'svelte';
	import WaitingForList from '$lib/components/WaitingForList.svelte';
	import { waitingForState } from '$lib/stores/waiting.svelte';

	onMount(async () => {
		await waitingForState.loadItems();
	});
</script>

<WaitingForList />
