/**
 * GTD App Changelog
 *
 * Changelog entries for the "What's New" page.
 *
 * Category Definitions:
 * - Added: Wholly new feature
 * - Improved: Enhancement to existing feature
 * - Fixed: Bug correction
 * - Changed: Modification to existing behavior
 * - Deprecated: Feature marked for removal
 * - Removed: Feature deleted from codebase
 * - Security: Security-related updates
 */

export interface ChangelogEntry {
	id: string;
	date: string;
	version?: string;
	categories: {
		added?: string[];
		improved?: string[];
		fixed?: string[];
		changed?: string[];
		deprecated?: string[];
		removed?: string[];
		security?: string[];
	};
}

export const changelog: ChangelogEntry[] = [
	{
		id: '2026-02-02',
		date: '2026-02-02',
		version: 'v1.2.0',
		categories: {
			added: [
				'Outlook Calendar integration - connect your Microsoft account to see events',
				'Calendar picker to select which Outlook calendars to sync',
				'What\'s New page to track app updates'
			],
			improved: [
				'Calendar page now shows read-only Outlook events alongside local events',
				'Settings page reorganized with Outlook section'
			]
		}
	},
	{
		id: '2026-01-31',
		date: '2026-01-31',
		version: 'v1.1.0',
		categories: {
			added: [
				'Device sync - pair devices with encrypted end-to-end sync via Netlify Blobs',
				'User feedback system - submit bugs and feature requests from within the app',
				'Site analytics - privacy-respecting usage metrics using Netlify Blobs',
				'Comprehensive test suite - browser and Node.js tests for frontend, backend, and integration'
			],
			improved: [
				'Mobile responsiveness across all pages and components',
				'Left navigation redesigned with collapsible context list and improved UX',
				'Storage persistence detection and user prompts'
			],
			fixed: [
				'Storage persistence not requesting correctly on initial load',
				'Sidebar scrollbar overflow on laptop screens'
			]
		}
	},
	{
		id: '2026-01-30',
		date: '2026-01-30',
		version: 'v1.0.1',
		categories: {
			improved: [
				'UI polish pass - consistent focus rings, shadows, and transitions',
				'Dark mode improvements - gray-950 background for reduced eye strain',
				'Button sizing standardized for better touch targets'
			],
			fixed: [
				'Empty state styling inconsistencies',
				'Weekly Review overdue indicator not showing correctly'
			]
		}
	},
	{
		id: '2026-01-29',
		date: '2026-01-29',
		version: 'v1.0.0',
		categories: {
			added: [
				'Inbox - capture and process everything in one place',
				'Next Actions - view by context, energy, and time',
				'Projects - track multi-step outcomes with next action indicators',
				'Waiting For - track delegated items with follow-up dates',
				'Someday/Maybe - store ideas for later review',
				'Calendar - local event management with all-day and recurring event support',
				'Weekly Review wizard - guided process for staying current',
				'Onboarding walkthrough - contextual hints and guided setup',
				'ICS import - bring in events from external calendars',
				'Dark mode with system theme detection',
				'Offline-first storage with persistent IndexedDB'
			]
		}
	}
];

/**
 * Returns count of entries newer than lastSeenId
 */
export function getUnseenCount(lastSeenId: string): number {
	if (!lastSeenId) return changelog.length;

	const lastSeenIndex = changelog.findIndex(entry => entry.id === lastSeenId);
	if (lastSeenIndex === -1) return changelog.length;

	return lastSeenIndex;
}

/**
 * Returns Tailwind classes for category styling
 */
export function getCategoryStyle(category: string): { dot: string; text: string } {
	const styles: Record<string, { dot: string; text: string }> = {
		added: {
			dot: 'bg-green-500',
			text: 'text-green-700 dark:text-green-400'
		},
		improved: {
			dot: 'bg-blue-500',
			text: 'text-blue-700 dark:text-blue-400'
		},
		fixed: {
			dot: 'bg-orange-500',
			text: 'text-orange-700 dark:text-orange-400'
		},
		changed: {
			dot: 'bg-purple-500',
			text: 'text-purple-700 dark:text-purple-400'
		},
		deprecated: {
			dot: 'bg-yellow-500',
			text: 'text-yellow-700 dark:text-yellow-400'
		},
		removed: {
			dot: 'bg-red-500',
			text: 'text-red-700 dark:text-red-400'
		},
		security: {
			dot: 'bg-red-600',
			text: 'text-red-800 dark:text-red-300'
		}
	};

	return styles[category] || { dot: 'bg-gray-500', text: 'text-gray-700 dark:text-gray-400' };
}

/**
 * LocalStorage key for last-seen tracking
 */
export const STORAGE_KEY = 'gtd-changelog-last-seen';
