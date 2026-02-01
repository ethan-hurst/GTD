import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		// Run in Node.js environment (not browser)
		environment: 'node',

		// Globals for describe/it/expect
		globals: true,

		// Include pattern for Node.js tests (Netlify Functions)
		include: ['netlify/functions/**/*.test.ts'],

		// Coverage configuration
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html', 'json'],
			exclude: [
				'node_modules/**',
				'**/*.test.ts',
				'**/*.config.*',
			]
		},
	}
});
