import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './tests/e2e',
	timeout: 30000, // 30 seconds per test
	retries: 0, // no retries in dev, CI can override
	reporter: 'html',

	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],

	webServer: {
		command: 'npm run dev',
		url: 'http://localhost:5173',
		reuseExistingServer: true, // don't start new server if one is running
		timeout: 120000, // 2 min for dev server startup
	},

	use: {
		baseURL: 'http://localhost:5173',
		trace: 'on-first-retry', // capture trace on first retry for debugging
	},
});
