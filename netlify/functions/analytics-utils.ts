/**
 * Shared analytics utilities for visitor hashing and daily aggregation
 */

import { getStore } from '@netlify/blobs';

export interface DailyAggregate {
	date: string; // YYYY-MM-DD
	pageviews: Record<string, number>; // path -> count
	events: Record<string, number>; // event name -> count
	visitors: string[]; // Array of hashed visitor IDs (Sets don't serialize to JSON)
	uniqueVisitors: number; // Derived from visitors.length
	referrers: Record<string, number>; // referrer -> count
}

/**
 * Generate privacy-preserving visitor ID using Plausible's approach:
 * Hash IP + User-Agent + Site Domain with daily-rotating salt
 * @param request - The incoming request
 * @param siteDomain - Site identifier for the hash
 * @returns Hex-encoded SHA-256 hash
 */
export async function generateVisitorId(request: Request, siteDomain: string): Promise<string> {
	// Extract IP address from Netlify headers
	let ip =
		request.headers.get('x-nf-client-connection-ip') ||
		request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
		'unknown';

	// Extract User-Agent
	const userAgent = request.headers.get('user-agent') || 'unknown';

	// Get today's date for salt rotation
	const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

	// Get or create daily salt
	const store = getStore('analytics');
	const saltKey = `salt/${today}`;
	let salt: string | null = await store.get(saltKey, { type: 'text' });

	if (!salt) {
		// Generate new salt: 32 random bytes as hex
		const saltBytes = new Uint8Array(32);
		crypto.getRandomValues(saltBytes);
		salt = Array.from(saltBytes)
			.map((b) => b.toString(16).padStart(2, '0'))
			.join('');

		// Store with metadata
		await store.set(saltKey, salt, {
			metadata: { createdAt: Date.now() }
		});
	}

	// Hash: salt + siteDomain + ip + userAgent
	// CRITICAL: Never persist raw IP or User-Agent
	const encoder = new TextEncoder();
	const data = encoder.encode(salt + siteDomain + ip + userAgent);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = new Uint8Array(hashBuffer);
	const hashHex = Array.from(hashArray)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');

	return hashHex;
}

/**
 * Get daily aggregate for a specific date
 * @param store - Netlify Blobs store
 * @param date - Date in YYYY-MM-DD format
 * @returns DailyAggregate object
 */
export async function getDailyAggregate(
	store: ReturnType<typeof getStore>,
	date: string
): Promise<DailyAggregate> {
	const key = `daily/${date}`;
	const existing = await store.get(key, { type: 'text' });

	if (existing) {
		return JSON.parse(existing);
	}

	// Return default aggregate
	return {
		date,
		pageviews: {},
		events: {},
		visitors: [],
		uniqueVisitors: 0,
		referrers: {}
	};
}

/**
 * Update daily aggregate in storage
 * @param store - Netlify Blobs store
 * @param date - Date in YYYY-MM-DD format
 * @param aggregate - Updated aggregate object
 */
export async function updateDailyAggregate(
	store: ReturnType<typeof getStore>,
	date: string,
	aggregate: DailyAggregate
): Promise<void> {
	const key = `daily/${date}`;
	await store.set(key, JSON.stringify(aggregate), {
		metadata: { lastUpdated: Date.now() }
	});
}

/**
 * Aggregated metrics for dashboard display
 */
export interface AggregatedMetrics {
	totalPageviews: number;
	totalUniqueVisitors: number;
	dailyMetrics: { date: string; pageviews: number; uniqueVisitors: number; events: number }[];
	topPages: { path: string; views: number }[];
	topEvents: { event: string; count: number }[];
	referrers: { source: string; count: number }[];
}

/**
 * Clean up analytics data older than 13 months (GDPR retention policy)
 * @param store - Netlify Blobs store
 * @returns Count of deleted entries
 */
export async function cleanupOldData(store: ReturnType<typeof getStore>): Promise<number> {
	// Calculate cutoff date: 13 months ago
	const cutoffDate = new Date();
	cutoffDate.setMonth(cutoffDate.getMonth() - 13);
	const cutoff = cutoffDate.toISOString().split('T')[0]; // YYYY-MM-DD

	let deletedCount = 0;

	// Clean up old daily aggregates
	const dailyBlobs = await store.list({ prefix: 'daily/' });
	for (const blob of dailyBlobs.blobs) {
		// Extract date from key: daily/YYYY-MM-DD
		const dateStr = blob.key.replace('daily/', '');
		if (dateStr < cutoff) {
			await store.delete(blob.key);
			deletedCount++;
		}
	}

	// Clean up old salts
	const saltBlobs = await store.list({ prefix: 'salt/' });
	for (const blob of saltBlobs.blobs) {
		// Extract date from key: salt/YYYY-MM-DD
		const dateStr = blob.key.replace('salt/', '');
		if (dateStr < cutoff) {
			await store.delete(blob.key);
			deletedCount++;
		}
	}

	console.log(`Analytics cleanup: deleted ${deletedCount} old entries`);
	return deletedCount;
}

/**
 * Aggregate daily metrics into dashboard-ready summary
 * @param dailyData - Array of daily aggregates
 * @returns Aggregated metrics
 */
export function aggregateMetrics(dailyData: DailyAggregate[]): AggregatedMetrics {
	let totalPageviews = 0;
	let totalUniqueVisitors = 0;
	const dailyMetrics: { date: string; pageviews: number; uniqueVisitors: number; events: number }[] =
		[];
	const allPages: Record<string, number> = {};
	const allEvents: Record<string, number> = {};
	const allReferrers: Record<string, number> = {};

	// Aggregate across all days
	for (const day of dailyData) {
		// Calculate pageviews for this day
		const dayPageviews = Object.values(day.pageviews).reduce((sum, count) => sum + count, 0);
		totalPageviews += dayPageviews;

		// Sum unique visitors (note: not deduplicated across days, by design with daily hash rotation)
		totalUniqueVisitors += day.uniqueVisitors;

		// Calculate events for this day
		const dayEvents = Object.values(day.events).reduce((sum, count) => sum + count, 0);

		// Add to daily metrics
		dailyMetrics.push({
			date: day.date,
			pageviews: dayPageviews,
			uniqueVisitors: day.uniqueVisitors,
			events: dayEvents
		});

		// Merge pages
		for (const [path, count] of Object.entries(day.pageviews)) {
			allPages[path] = (allPages[path] || 0) + count;
		}

		// Merge events
		for (const [event, count] of Object.entries(day.events)) {
			allEvents[event] = (allEvents[event] || 0) + count;
		}

		// Merge referrers
		for (const [referrer, count] of Object.entries(day.referrers)) {
			allReferrers[referrer] = (allReferrers[referrer] || 0) + count;
		}
	}

	// Sort daily metrics by date ascending
	dailyMetrics.sort((a, b) => a.date.localeCompare(b.date));

	// Get top 10 pages
	const topPages = Object.entries(allPages)
		.map(([path, views]) => ({ path, views }))
		.sort((a, b) => b.views - a.views)
		.slice(0, 10);

	// Get top 10 events
	const topEvents = Object.entries(allEvents)
		.map(([event, count]) => ({ event, count }))
		.sort((a, b) => b.count - a.count)
		.slice(0, 10);

	// Get top 10 referrers
	const referrers = Object.entries(allReferrers)
		.map(([source, count]) => ({ source, count }))
		.sort((a, b) => b.count - a.count)
		.slice(0, 10);

	return {
		totalPageviews,
		totalUniqueVisitors,
		dailyMetrics,
		topPages,
		topEvents,
		referrers
	};
}
