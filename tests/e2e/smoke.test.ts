import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
	test('homepage loads successfully', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Wait for page to load - check for inbox heading in main content
		await expect(page.locator('main h1')).toContainText('Inbox');

		// Verify inbox capture input is visible
		await expect(page.locator('input[placeholder="What\'s on your mind?"]')).toBeVisible();
	});

	test('navigation links are visible', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Check sidebar nav links exist (desktop only - mobile uses drawer)
		const viewport = page.viewportSize();
		if (viewport && viewport.width >= 768) {
			// Desktop view - check sidebar
			await expect(page.locator('nav a[href="/"]')).toBeVisible();
			await expect(page.locator('nav a[href="/actions"]')).toBeVisible();
			await expect(page.locator('nav a[href="/projects"]')).toBeVisible();
			await expect(page.locator('nav a[href="/waiting"]')).toBeVisible();
			await expect(page.locator('nav a[href="/someday"]')).toBeVisible();
			await expect(page.locator('nav a[href="/review"]')).toBeVisible();
			await expect(page.locator('nav a[href="/calendar"]')).toBeVisible();
		} else {
			// Mobile view - check header exists
			await expect(page.locator('header')).toBeVisible();
		}
	});

	test('app is responsive', async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Verify page loads successfully - check main heading
		await expect(page.locator('main h1')).toContainText('Inbox');

		// Mobile nav should be present (hamburger menu or drawer)
		const header = page.locator('header');
		await expect(header).toBeVisible();
	});

	test('can navigate to different pages', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Navigate to Next Actions
		await page.locator('nav a[href="/actions"]').click();
		await expect(page).toHaveURL('/actions');

		// Navigate to Projects
		await page.locator('nav a[href="/projects"]').click();
		await expect(page).toHaveURL('/projects');

		// Navigate to Calendar
		await page.locator('nav a[href="/calendar"]').click();
		await expect(page).toHaveURL('/calendar');

		// Navigate back to Inbox
		await page.locator('nav a[href="/"]').click();
		await expect(page).toHaveURL('/');
	});
});
