<script lang="ts">
	import { onMount } from 'svelte';
	import ProjectList from '$lib/components/ProjectList.svelte';
	import { projectState } from '$lib/stores/projects.svelte';

	onMount(async () => {
		await projectState.loadProjects();
	});
</script>

<ProjectList />
