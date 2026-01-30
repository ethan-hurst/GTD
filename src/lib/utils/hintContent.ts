import type { Feature } from './featureTracking';

export type HintContent = {
	title: string;
	description: string;
};

// Full hints for users who completed walkthrough - GTD term in bold + plain language explanation
export const fullHints: Record<Feature, HintContent> = {
	inbox: {
		title: 'Inbox',
		description:
			'Your capture point for everything on your mind. Process items here to zero.'
	},
	'next-actions': {
		title: 'Next Actions',
		description:
			'Tasks you can do right now, filtered by context — where you are or what tools you have.'
	},
	projects: {
		title: 'Projects',
		description:
			'Any outcome requiring more than one action step. Every active project should have at least one next action.'
	},
	waiting: {
		title: 'Waiting For',
		description:
			"Items you've delegated or are waiting on someone else. Track who and when you followed up."
	},
	someday: {
		title: 'Someday/Maybe',
		description: 'Ideas and possibilities for the future. Not forgotten, just not now.'
	},
	review: {
		title: 'Weekly Review',
		description:
			'The secret to GTD success. Review everything weekly to keep your system current and trustworthy.'
	},
	calendar: {
		title: 'Calendar',
		description:
			'Your hard landscape — see time-specific commitments alongside your next actions to plan your day.'
	},
	search: {
		title: 'Search',
		description: 'Find anything across all your lists. Use Cmd+K (Mac) or Ctrl+K to open quickly.'
	},
	'keyboard-shortcuts': {
		title: 'Keyboard Shortcuts',
		description:
			'Navigate fast: n=Next Actions, p=Projects, w=Waiting, s=Someday, r=Review, c=Calendar, /=Capture.'
	},
	settings: {
		title: 'Settings',
		description:
			'Export your data for backup, import from a file, or reset your onboarding experience.'
	}
};

// Reduced hints for users who skipped - assumes GTD knowledge, UI-only
export const reducedHints: Record<Feature, HintContent> = {
	inbox: {
		title: 'Inbox',
		description: 'Capture input and unprocessed items list.'
	},
	'next-actions': {
		title: 'Next Actions',
		description: 'Filter by context. Drag to reorder.'
	},
	projects: {
		title: 'Projects',
		description: 'Stalled projects show a yellow warning badge.'
	},
	waiting: {
		title: 'Waiting For',
		description: 'Add follow-up dates. Overdue items highlighted in red.'
	},
	someday: {
		title: 'Someday/Maybe',
		description: 'Categorize items. Promote to active project anytime.'
	},
	review: {
		title: 'Weekly Review',
		description: '8-step guided checklist. Badge shows when overdue.'
	},
	calendar: {
		title: 'Calendar',
		description: 'View events by day/week/month. Import .ics files. Drag to reschedule.'
	},
	search: {
		title: 'Search',
		description: 'Cmd+K / Ctrl+K to focus. Searches all active items.'
	},
	'keyboard-shortcuts': {
		title: 'Keyboard Shortcuts',
		description: 'n/p/w/s/r/c for navigation, / for capture, Cmd+K for search.'
	},
	settings: {
		title: 'Settings',
		description: 'Data export/import and onboarding reset.'
	}
};

export function getHintContent(feature: Feature, hasSkipped: boolean): HintContent {
	return hasSkipped ? reducedHints[feature] : fullHints[feature];
}
