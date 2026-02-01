/**
 * Feedback update endpoint
 * Updates feedback item status with Basic Auth protection
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
				'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type, Authorization'
			}
		});
	}

	// Only allow PATCH
	if (req.method !== 'PATCH') {
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

		// Parse request body
		const body = await req.json();
		const { id, status, notes } = body;

		// Validate status
		const validStatuses = ['new', 'reviewed', 'resolved', 'archived'];
		if (!status || !validStatuses.includes(status)) {
			return new Response(
				JSON.stringify({ error: `Invalid status - must be one of: ${validStatuses.join(', ')}` }),
				{
					status: 400,
					headers: {
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*'
					}
				}
			);
		}

		// Fetch existing item
		const store = getStore('feedback');
		const existing = await store.get(`items/${id}`, { type: 'json' }) as any;

		if (!existing) {
			return new Response(JSON.stringify({ error: 'Item not found' }), {
				status: 404,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*'
				}
			});
		}

		// Build updated item
		const updated = {
			...existing,
			status,
			notes: notes !== undefined ? notes : existing.notes,
			reviewedAt: new Date().toISOString()
		};

		// Save with updated metadata
		await store.setJSON(`items/${id}`, updated, {
			metadata: {
				type: updated.type,
				status: updated.status,
				hasScreenshot: updated.hasScreenshot ? 'true' : 'false',
				submittedAt: updated.submittedAt
			}
		});

		return new Response(JSON.stringify({ success: true, item: updated }), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*'
			}
		});
	} catch (error: any) {
		console.error('feedback-update error:', error);
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
