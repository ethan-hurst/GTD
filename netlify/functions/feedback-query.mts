/**
 * Feedback query endpoint
 * Lists and queries feedback items with Basic Auth protection
 */

import { getStore } from '@netlify/blobs';
import type { Context } from '@netlify/functions';

export default async (req: Request, context: Context) => {
	// Handle CORS preflight
	if (req.method === 'OPTIONS') {
		return new Response(null, {
			status: 204,
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type, Authorization'
			}
		});
	}

	// Only allow GET
	if (req.method !== 'GET') {
		return new Response(JSON.stringify({ error: 'Method not allowed' }), {
			status: 405,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*'
			}
		});
	}

	try {
		// Check if analytics password is configured
		const analyticsPassword = process.env.ANALYTICS_PASSWORD;
		if (!analyticsPassword) {
			return new Response(JSON.stringify({ error: 'Analytics not configured' }), {
				status: 503,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*'
				}
			});
		}

		// Verify Basic Auth
		const authHeader = req.headers.get('Authorization');
		if (!authHeader || !authHeader.startsWith('Basic ')) {
			return new Response(JSON.stringify({ error: 'Authentication required' }), {
				status: 401,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
					'WWW-Authenticate': 'Basic realm="Admin"'
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
					'Access-Control-Allow-Origin': '*',
					'WWW-Authenticate': 'Basic realm="Admin"'
				}
			});
		}

		// Parse query parameters
		const url = new URL(req.url);
		const id = url.searchParams.get('id');
		const status = url.searchParams.get('status');
		const type = url.searchParams.get('type');
		const includeScreenshot = url.searchParams.get('screenshot') === 'true';

		const store = getStore('feedback');

		// Single item mode
		if (id) {
			const item = await store.get(`items/${id}`, { type: 'json' });

			if (!item) {
				return new Response(JSON.stringify({ error: 'Item not found' }), {
					status: 404,
					headers: {
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*'
					}
				});
			}

			let screenshot = null;
			if (includeScreenshot && (item as any).hasScreenshot) {
				screenshot = await store.get(`screenshots/${id}`, { type: 'text' });
			}

			return new Response(JSON.stringify({ item, screenshot }), {
				status: 200,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*'
				}
			});
		}

		// List mode
		const result = await store.list({ prefix: 'items/' });

		// Fetch all items in parallel
		const items = await Promise.all(
			result.blobs.map((blob) => store.get(blob.key, { type: 'json' }))
		);

		// Filter by status if provided
		let filteredItems = items;
		if (status) {
			filteredItems = filteredItems.filter((item: any) => item.status === status);
		}

		// Filter by type if provided
		if (type) {
			filteredItems = filteredItems.filter((item: any) => item.type === type);
		}

		// Sort by submittedAt descending (newest first)
		filteredItems.sort((a: any, b: any) => {
			return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
		});

		return new Response(
			JSON.stringify({
				items: filteredItems,
				total: filteredItems.length,
				generatedAt: new Date().toISOString()
			}),
			{
				status: 200,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*'
				}
			}
		);
	} catch (error: any) {
		console.error('feedback-query error:', error);
		return new Response(
			JSON.stringify({
				error: 'Internal server error'
			}),
			{
				status: 500,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*'
				}
			}
		);
	}
};
