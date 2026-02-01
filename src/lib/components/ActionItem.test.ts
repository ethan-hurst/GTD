import { render } from 'vitest-browser-svelte';
import { expect, test, describe, vi, beforeEach } from 'vitest';
import ActionItem from './ActionItem.svelte';
import type { GTDItem } from '$lib/db/schema';

// Mock dependencies
vi.mock('$lib/db/operations', () => ({
	updateItem: vi.fn().mockResolvedValue(undefined),
	deleteItem: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('$lib/stores/mobile.svelte', () => ({
	mobileState: {
		isMobile: false,
	},
}));

vi.mock('svelte-gestures', () => ({
	usePan: vi.fn(() => ({})),
}));

describe('ActionItem', () => {
	let mockItem: GTDItem;
	const mockOnComplete = vi.fn();
	const mockOnExpand = vi.fn();
	const mockOnToggleSelect = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();

		// Create a minimal mock item
		mockItem = {
			id: 'test-123',
			title: 'Test Action Item',
			type: 'action',
			created: new Date(),
			modified: new Date(),
			notes: '',
		};
	});

	test('renders action title', async () => {
		const screen = render(ActionItem, {
			props: {
				item: mockItem,
				onComplete: mockOnComplete,
				onExpand: mockOnExpand,
				isExpanded: false,
				isSelected: false,
				onToggleSelect: mockOnToggleSelect,
			}
		});

		// Check that the title is rendered
		const titleElement = screen.container.querySelector('h3');
		expect(titleElement).not.toBeNull();
		expect(titleElement?.textContent?.trim()).toBe('Test Action Item');
	});

	test('renders context badge if context provided', async () => {
		const itemWithContext = {
			...mockItem,
			context: '@office',
		};

		const screen = render(ActionItem, {
			props: {
				item: itemWithContext,
				onComplete: mockOnComplete,
				onExpand: mockOnExpand,
				isExpanded: false,
				isSelected: false,
				onToggleSelect: mockOnToggleSelect,
			}
		});

		// Check for context badge
		const badges = screen.container.querySelectorAll('.text-xs');
		const contextBadge = Array.from(badges).find(el => el.textContent?.includes('@office'));
		expect(contextBadge).not.toBeNull();
	});

	test('renders project badge if project assigned', async () => {
		const itemWithProject = {
			...mockItem,
			projectId: 'project-123',
		};

		const screen = render(ActionItem, {
			props: {
				item: itemWithProject,
				onComplete: mockOnComplete,
				onExpand: mockOnExpand,
				isExpanded: false,
				isSelected: false,
				onToggleSelect: mockOnToggleSelect,
			}
		});

		// Check for project badge
		const projectBadge = screen.container.querySelector('.bg-purple-100');
		expect(projectBadge).not.toBeNull();
		expect(projectBadge?.textContent?.trim()).toBe('Project');
	});

	test('renders without errors with minimal props', async () => {
		// Should not throw an error
		const screen = render(ActionItem, {
			props: {
				item: mockItem,
				onComplete: mockOnComplete,
				onExpand: mockOnExpand,
				isExpanded: false,
				isSelected: false,
				onToggleSelect: mockOnToggleSelect,
			}
		});

		// Verify basic structure exists
		expect(screen.container.querySelector('h3')).not.toBeNull();
		expect(screen.container.querySelector('[role="button"]')).not.toBeNull();
	});

	test('renders completion button', async () => {
		const screen = render(ActionItem, {
			props: {
				item: mockItem,
				onComplete: mockOnComplete,
				onExpand: mockOnExpand,
				isExpanded: false,
				isSelected: false,
				onToggleSelect: mockOnToggleSelect,
			}
		});

		// Check for completion button with circle
		const completionButton = screen.container.querySelector('[title="Complete action"]');
		expect(completionButton).not.toBeNull();
		expect(completionButton).toBeInstanceOf(HTMLButtonElement);
	});

	test('renders selection checkbox', async () => {
		const screen = render(ActionItem, {
			props: {
				item: mockItem,
				onComplete: mockOnComplete,
				onExpand: mockOnExpand,
				isExpanded: false,
				isSelected: false,
				onToggleSelect: mockOnToggleSelect,
			}
		});

		// Check for selection checkbox
		const checkbox = screen.container.querySelector('input[type="checkbox"]');
		expect(checkbox).not.toBeNull();
		expect(checkbox).toBeInstanceOf(HTMLInputElement);
	});
});
