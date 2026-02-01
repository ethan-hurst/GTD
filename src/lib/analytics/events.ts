/**
 * Analytics event tracking
 * Provides typed event constants and convenience methods for tracking custom events
 */

// Event name constants
export const ANALYTICS_EVENTS = {
	// Onboarding funnel
	ONBOARDING_STARTED: 'onboarding_started',
	ONBOARDING_COMPLETED: 'onboarding_completed',

	// Task lifecycle
	TASK_CREATED: 'task_created',
	TASK_COMPLETED: 'task_completed',
	TASK_DELETED: 'task_deleted',

	// Feature usage
	SYNC_INITIATED: 'sync_initiated',
	SYNC_COMPLETED: 'sync_completed',
	REVIEW_STARTED: 'review_started',
	REVIEW_COMPLETED: 'review_completed',

	// Engagement
	FEATURE_DISCOVERED: 'feature_discovered'
} as const;

export type EventName = typeof ANALYTICS_EVENTS[keyof typeof ANALYTICS_EVENTS];
export type EventProps = Record<string, string | number | boolean>;

// TypeScript declaration for Plausible global
declare global {
	interface Window {
		plausible?: (event: string, options?: { props?: EventProps }) => void;
	}
}

/**
 * Track a custom event
 * @param name - Event name from ANALYTICS_EVENTS
 * @param props - Optional event properties
 */
export function trackEvent(name: EventName, props?: EventProps): void {
	// SSR safety check
	if (typeof window === 'undefined') return;

	try {
		// Call Plausible's global function if available
		window.plausible?.(name, { props });
	} catch (err) {
		// Analytics must NEVER break the app - fail silently
		console.warn('Analytics tracking failed:', err);
	}
}

/**
 * Convenience object with named tracking methods
 */
export const analytics = {
	// Onboarding
	onboardingStarted: () => trackEvent(ANALYTICS_EVENTS.ONBOARDING_STARTED),
	onboardingCompleted: () => trackEvent(ANALYTICS_EVENTS.ONBOARDING_COMPLETED),

	// Tasks
	taskCreated: (type: string) => trackEvent(ANALYTICS_EVENTS.TASK_CREATED, { type }),
	taskCompleted: () => trackEvent(ANALYTICS_EVENTS.TASK_COMPLETED),
	taskDeleted: () => trackEvent(ANALYTICS_EVENTS.TASK_DELETED),

	// Sync
	syncInitiated: () => trackEvent(ANALYTICS_EVENTS.SYNC_INITIATED),
	syncCompleted: (itemCount: number, duration: number) =>
		trackEvent(ANALYTICS_EVENTS.SYNC_COMPLETED, { itemCount, duration }),

	// Review
	reviewStarted: () => trackEvent(ANALYTICS_EVENTS.REVIEW_STARTED),
	reviewCompleted: () => trackEvent(ANALYTICS_EVENTS.REVIEW_COMPLETED),

	// Feature discovery
	featureDiscovered: (feature: string) => trackEvent(ANALYTICS_EVENTS.FEATURE_DISCOVERED, { feature })
};
