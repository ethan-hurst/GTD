/**
 * Client-side analytics tracker
 * Sends events via sendBeacon to Netlify Function endpoint
 */

import type { AnalyticsPayload } from './events';

/**
 * Track an analytics event
 * @param event - Event name (use AnalyticsEvents constants)
 * @param properties - Optional event properties
 */
export function trackEvent(
	event: string,
	properties?: Record<string, string | number | boolean>
): void {
	try {
		// Respect Do Not Track
		if (typeof navigator !== 'undefined' && navigator.doNotTrack === '1') {
			return;
		}

		// SSR safety check
		if (typeof window === 'undefined') {
			return;
		}

		// Build payload
		const payload: AnalyticsPayload = {
			event,
			url: window.location.pathname,
			timestamp: new Date().toISOString(),
			...(properties && { properties })
		};

		const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });

		// Use sendBeacon if available (preferred - survives page unload)
		if (navigator.sendBeacon) {
			navigator.sendBeacon('/.netlify/functions/analytics-track', blob);
		} else {
			// Fallback to fetch with keepalive
			fetch('/.netlify/functions/analytics-track', {
				method: 'POST',
				body: blob,
				keepalive: true,
				headers: {
					'Content-Type': 'application/json'
				}
			}).catch(() => {
				// Silent fail - analytics should never block user
			});
		}
	} catch (error) {
		// Analytics must never throw or block the user
		// Silent fail
	}
}

/**
 * Track a page view
 * @param path - Page path (defaults to current pathname)
 */
export function trackPageView(path?: string): void {
	const pagePath = path || (typeof window !== 'undefined' ? window.location.pathname : '/');
	trackEvent('pageview', { path: pagePath });
}
