/**
 * Analytics event names and payload types
 */

export const AnalyticsEvents = {
	// Page views
	pageview: 'pageview',

	// Activation funnel
	onboardingStarted: 'onboarding.started',
	onboardingCompleted: 'onboarding.completed',
	onboardingSkipped: 'onboarding.skipped',

	// Feature usage
	taskCreated: 'task.created',
	taskCompleted: 'task.completed',
	syncInitiated: 'sync.initiated',
	syncCompleted: 'sync.completed',
	reviewStarted: 'review.started',
	reviewCompleted: 'review.completed',

	// Engagement
	featureVisited: 'feature.visited'
} as const;

export type AnalyticsEvent = (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

export interface AnalyticsPayload {
	event: string;
	url: string;
	timestamp: string;
	properties?: Record<string, string | number | boolean>;
}
