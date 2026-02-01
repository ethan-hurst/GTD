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
