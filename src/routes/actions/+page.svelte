<script lang="ts">
	import { onMount } from 'svelte';
	import ActionList from '$lib/components/ActionList.svelte';
	import { actionState } from '$lib/stores/actions.svelte';

	onMount(async () => {
		await actionState.loadContexts();
		await actionState.loadActions();
	});
</script>

<ActionList />
