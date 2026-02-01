import { render } from 'vitest-browser-svelte';
import { expect, test, describe, beforeEach } from 'vitest';
import ThemeToggle from './ThemeToggle.svelte';

describe('ThemeToggle', () => {
	test('renders theme toggle buttons', async () => {
		const screen = render(ThemeToggle);

		// Should render all three theme option buttons
		const buttons = screen.container.querySelectorAll('button');
		expect(buttons.length).toBe(3);
	});

	test('renders with light, dark, and system options', async () => {
		const screen = render(ThemeToggle);

		// Check that buttons have proper title attributes
		const lightButton = screen.container.querySelector('[title="Light"]');
		const darkButton = screen.container.querySelector('[title="Dark"]');
		const systemButton = screen.container.querySelector('[title="System"]');

		expect(lightButton).not.toBeNull();
		expect(darkButton).not.toBeNull();
		expect(systemButton).not.toBeNull();
	});

	test('buttons are clickable', async () => {
		const screen = render(ThemeToggle);

		const buttons = screen.container.querySelectorAll('button');
		buttons.forEach(button => {
			expect(button).toBeInstanceOf(HTMLButtonElement);
			// Verify button is not disabled
			expect(button.hasAttribute('disabled')).toBe(false);
		});
	});

	test('renders theme label', async () => {
		const screen = render(ThemeToggle);

		// Check for the "Theme" label
		const label = screen.container.querySelector('label');
		expect(label).not.toBeNull();
		expect(label?.textContent?.trim()).toBe('Theme');
	});
});
