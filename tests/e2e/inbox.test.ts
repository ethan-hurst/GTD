import { test, expect } from '@playwright/test';

test.describe('Inbox Page', () => {
	test('displays inbox capture input', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Verify inbox heading
		await expect(page.locator('main h1')).toContainText('Inbox');

		// Verify capture input exists
		const input = page.locator('input[placeholder="What\'s on your mind?"]');
		await expect(input).toBeVisible();
		await expect(input).toBeEnabled();

		// Verify input can receive focus and text
		await input.click();
		await input.fill('Test typing');
		await expect(input).toHaveValue('Test typing');
	});

	test('shows empty state when no items', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Check for empty state (may or may not be visible depending on data)
		const emptyState = page.locator('text=Your inbox is clear');
		const hasEmptyState = await emptyState.isVisible().catch(() => false);

		if (hasEmptyState) {
			// If empty state is visible, verify its content
			await expect(page.locator('text=Capture something with the input above')).toBeVisible();
		} else {
			// If not empty, verify item count is shown
			await expect(page.locator('span.tabular-nums')).toBeVisible();
		}
	});

	test('displays keyboard shortcuts hint', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Verify keyboard shortcut hint is displayed
		await expect(page.locator('text=Press Enter to capture')).toBeVisible();
		await expect(page.locator('kbd').filter({ hasText: '/' })).toBeVisible();
	});
});
