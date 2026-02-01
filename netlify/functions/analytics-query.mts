import { getStore } from '@netlify/blobs';
import type { Context } from '@netlify/functions';
import {
	getDailyAggregate,
	aggregateMetrics,
	cleanupOldData,
	type DailyAggregate
} from './analytics-utils.ts';

export default async (req: Request, context: Context) => {
	// Only allow GET
	if (req.method !== 'GET') {
		return new Response(JSON.stringify({ error: 'Method not allowed' }), {
			status: 405,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		// Check if analytics password is configured
		const analyticsPassword = process.env.ANALYTICS_PASSWORD || context.env.get?.('ANALYTICS_PASSWORD');
		if (!analyticsPassword) {
			return new Response(JSON.stringify({ error: 'Analytics not configured' }), {
				status: 503,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Verify Basic Auth
		const authHeader = req.headers.get('Authorization');
		if (!authHeader || !authHeader.startsWith('Basic ')) {
			return new Response(JSON.stringify({ error: 'Authentication required' }), {
				status: 401,
				headers: {
					'Content-Type': 'application/json',
					'WWW-Authenticate': 'Basic realm="Analytics"'
				}
			});
		}

		// Decode and verify password
		const base64Credentials = authHeader.slice(6); // Remove 'Basic '
		const credentials = atob(base64Credentials);
		const [username, password] = credentials.split(':');

		if (password !== analyticsPassword) {
			return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
				status: 401,
				headers: {
					'Content-Type': 'application/json',
					'WWW-Authenticate': 'Basic realm="Analytics"'
				}
			});
		}

		// Parse query parameters for date range
		const url = new URL(req.url);
		const daysParam = url.searchParams.get('days');
		const days = Math.min(parseInt(daysParam || '30', 10), 395); // Default 30, max 395 (~13 months)

		// Generate date array for the requested range
		const dates: string[] = [];
		const today = new Date();
		for (let i = 0; i < days; i++) {
			const date = new Date(today);
			date.setDate(date.getDate() - i);
			dates.push(date.toISOString().split('T')[0]); // YYYY-MM-DD
		}

		// Fetch daily aggregates in parallel
		const store = getStore('analytics');
		const dailyDataPromises = dates.map((date) => getDailyAggregate(store, date));
		const dailyData: DailyAggregate[] = await Promise.all(dailyDataPromises);

		// Run cleanup opportunistically (fire and forget)
		cleanupOldData(store).catch((err) => {
			console.error('Analytics cleanup failed:', err);
		});

		// Aggregate metrics
		const summary = aggregateMetrics(dailyData);

		// Prepare response
		const firstDate = dates[dates.length - 1]; // Oldest date
		const lastDate = dates[0]; // Most recent date

		const response = {
			period: {
				start: firstDate,
				end: lastDate,
				days: days
			},
			summary,
			generatedAt: new Date().toISOString()
		};

		return new Response(JSON.stringify(response), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*'
			}
		});
	} catch (error: any) {
		console.error('analytics-query error:', error);
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
