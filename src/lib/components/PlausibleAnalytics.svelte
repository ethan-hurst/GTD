<script lang="ts">
	import { onMount } from 'svelte';
	import { beforeNavigate, afterNavigate } from '$app/navigation';

	interface Props {
		domain: string;
		apiHost?: string;
	}

	const { domain, apiHost }: Props = $props();

	let previousPath = $state('');

	onMount(() => {
		// Inject Plausible script
		const script = document.createElement('script');
		script.defer = true;
		script.dataset.domain = domain;

		if (apiHost) {
			script.dataset.apiHost = apiHost;
			script.src = `${apiHost}/js/script.js`;
		} else {
			script.src = 'https://plausible.io/js/script.js';
		}

		document.head.appendChild(script);

		return () => {
			// Cleanup script on unmount
			if (script.parentNode) {
				script.parentNode.removeChild(script);
			}
		};
	});

	// Track SPA route changes as pageviews
	afterNavigate((navigation) => {
		const currentPath = navigation.to?.url.pathname;
		if (currentPath && currentPath !== previousPath) {
			previousPath = currentPath;

			// Wait for Plausible script to load
			if (typeof window !== 'undefined' && window.plausible) {
				window.plausible('pageview');
			}
		}
	});
</script>
