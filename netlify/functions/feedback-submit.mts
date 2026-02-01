/**
 * Feedback submission endpoint
 * Receives feedback submissions and stores them in Netlify Blobs
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
				'Access-Control-Allow-Methods': 'POST, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type'
			}
		});
	}

	// Only allow POST
	if (req.method !== 'POST') {
		return new Response(JSON.stringify({ error: 'Method not allowed' }), {
			status: 405,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*'
			}
		});
	}

	try {
		// Parse request body
		const body = await req.json();
		const { type, description, email, screenshot, botField } = body;

		// Honeypot check - if botField is filled, silently accept but don't store
		if (botField) {
			return new Response(JSON.stringify({ success: true }), {
				status: 200,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*'
				}
			});
		}

		// Validate type
		if (!type || (type !== 'bug' && type !== 'feature')) {
			return new Response(JSON.stringify({ error: 'Invalid type - must be bug or feature' }), {
				status: 400,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*'
				}
			});
		}

		// Validate description
		if (!description || typeof description !== 'string' || description.length < 10) {
			return new Response(
				JSON.stringify({ error: 'Description must be at least 10 characters' }),
				{
					status: 400,
					headers: {
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*'
					}
				}
			);
		}

		// Generate blob key
		const timestamp = new Date().toISOString();
		const random = Math.random().toString(16).slice(2, 6);
		const id = `${timestamp}_${random}`;

		// Build feedback item
		const feedbackItem = {
			id,
			type,
			description,
			email: email || undefined,
			status: 'new' as const,
			hasScreenshot: !!screenshot,
			submittedAt: timestamp,
			userAgent: req.headers.get('user-agent') || 'unknown'
		};

		// Store in Blobs
		const store = getStore('feedback');

		// Store feedback item with metadata
		await store.setJSON(`items/${id}`, feedbackItem, {
			metadata: {
				type,
				status: 'new',
				hasScreenshot: screenshot ? 'true' : 'false',
				submittedAt: timestamp
			}
		});

		// Store screenshot if provided
		if (screenshot) {
			await store.set(`screenshots/${id}`, screenshot);
		}

		return new Response(JSON.stringify({ success: true, id }), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*'
			}
		});
	} catch (error: any) {
		console.error('feedback-submit error:', error);
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
