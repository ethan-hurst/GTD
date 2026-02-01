/**
 * Analytics event ingestion endpoint
 * Receives event beacons, generates privacy-first visitor IDs, stores daily aggregates
 */

import { getStore } from '@netlify/blobs';
import type { Context } from '@netlify/functions';
import { generateVisitorId, getDailyAggregate, updateDailyAggregate } from './analytics-utils';

export default async (req: Request, context: Context) => {
	// Only allow POST
	if (req.method !== 'POST') {
		return new Response(JSON.stringify({ error: 'Method not allowed' }), {
			status: 405,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		// Respect Do Not Track header server-side
		if (req.headers.get('dnt') === '1') {
			return new Response(JSON.stringify({ tracked: false }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Parse request body
		const body = await req.json();
		const { event, url, timestamp, properties } = body;

		// Validate required fields
		if (!event || typeof event !== 'string') {
			return new Response(JSON.stringify({ error: 'Missing or invalid event' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		if (!url || typeof url !== 'string') {
			return new Response(JSON.stringify({ error: 'Missing or invalid url' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Generate privacy-preserving visitor ID
		const visitorId = await generateVisitorId(req, 'gtd-app');

		// Get today's date
		const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

		// Get existing daily aggregate
		const store = getStore('analytics');
		const aggregate = await getDailyAggregate(store, today);

		// Update aggregate
		// 1. Track pageviews
		if (event === 'pageview') {
			aggregate.pageviews[url] = (aggregate.pageviews[url] || 0) + 1;
		}

		// 2. Track all events
		aggregate.events[event] = (aggregate.events[event] || 0) + 1;

		// 3. Track unique visitors (use array since Sets don't serialize to JSON)
		if (!aggregate.visitors.includes(visitorId)) {
			aggregate.visitors.push(visitorId);
			aggregate.uniqueVisitors = aggregate.visitors.length;
		}

		// 4. Track referrer if present
		if (properties && typeof properties === 'object' && 'referrer' in properties) {
			const referrer = String(properties.referrer);
			if (referrer && referrer !== '') {
				aggregate.referrers[referrer] = (aggregate.referrers[referrer] || 0) + 1;
			}
		}

		// Save updated aggregate
		await updateDailyAggregate(store, today, aggregate);

		return new Response(JSON.stringify({ tracked: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error: any) {
		console.error('analytics-track error:', error);
		return new Response(
			JSON.stringify({
				error: 'Internal server error'
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
};
