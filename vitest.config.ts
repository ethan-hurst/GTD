import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { playwright } from '@vitest/browser-playwright';
import path from 'path';

export default defineConfig({
	plugins: [svelte()],

	// Ensure browser conditions for Svelte imports
	resolve: process.env.VITEST
		? {
			conditions: ['browser'],
			alias: {
				'$lib': path.resolve('./src/lib'),
				'$app': path.resolve('./src/tests/mocks/$app'),
			}
		}
		: undefined,

	// Optimize deps - exclude playwright from bundling
	optimizeDeps: {
		exclude: ['playwright', 'playwright-core']
	},

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
