import { render } from 'vitest-browser-svelte';
import { expect, test, describe, vi, beforeEach } from 'vitest';
import InboxCapture from './InboxCapture.svelte';

// Mock dependencies
vi.mock('svelte-5-french-toast', () => ({
	default: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

vi.mock('../db/operations', () => ({
	addItem: vi.fn().mockResolvedValue('mock-id'),
}));

vi.mock('../stores/inbox.svelte', () => ({
	inboxState: {
		loadItems: vi.fn().mockResolvedValue(undefined),
	},
}));

vi.mock('../stores/storage.svelte', () => ({
	storageStatus: {
		recordSave: vi.fn(),
	},
}));

describe('InboxCapture', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test('renders input field', async () => {
		const screen = render(InboxCapture);

		// Check for the input element
		const input = screen.container.querySelector('input[type="text"]');
		expect(input).not.toBeNull();
		expect(input).toBeInstanceOf(HTMLInputElement);
	});

	test('renders with placeholder text', async () => {
		const screen = render(InboxCapture);

		const input = screen.container.querySelector('input[type="text"]') as HTMLInputElement;
		expect(input?.placeholder).toBe("What's on your mind?");
	});

	test('input has autofocus attribute', async () => {
		const screen = render(InboxCapture);

		const input = screen.container.querySelector('input[type="text"]');
		expect(input?.hasAttribute('autofocus')).toBe(true);
	});

	test('renders help text with keyboard shortcut', async () => {
		const screen = render(InboxCapture);

		// Check for help text
		const helpText = screen.container.querySelector('.text-xs.text-gray-400');
		expect(helpText).not.toBeNull();
		expect(helpText?.textContent).toContain('Press Enter to capture');
	});

	test('renders form element', async () => {
		const screen = render(InboxCapture);

		const form = screen.container.querySelector('form');
		expect(form).not.toBeNull();
		expect(form).toBeInstanceOf(HTMLFormElement);
	});
});
