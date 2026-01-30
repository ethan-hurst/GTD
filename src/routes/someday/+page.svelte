<script lang="ts">
	import { onMount } from 'svelte';
	import SomedayMaybeList from '$lib/components/SomedayMaybeList.svelte';
	import { somedayMaybeState } from '$lib/stores/someday.svelte';

	onMount(async () => {
		await somedayMaybeState.loadItems();
	});
</script>

<SomedayMaybeList />
