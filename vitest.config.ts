import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
	plugins: [svelte()],

	// Ensure browser conditions for Svelte imports
	resolve: process.env.VITEST
		? { conditions: ['browser'] }
		: undefined,

	test: {
		// Global test setup
		setupFiles: ['./src/tests/setup.ts'],

		// Browser mode for Svelte 5 runes support
		browser: {
			enabled: true,
			provider: playwright(),
			instances: [
				{ browser: 'chromium' }
			],
			// Headless for CI
			headless: true,
		},

		// Coverage configuration
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html', 'json'],
			exclude: [
				'node_modules/**',
				'src/tests/**',
				'**/*.test.ts',
				'**/*.config.*',
			]
		},

		// Globals for describe/it/expect
		globals: true,

		// Include pattern for tests
		include: ['**/*.test.ts'],
	}
});
