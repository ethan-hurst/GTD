/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

// Create a unique cache name for this deployment
const CACHE = `cache-${version}`;

// Assets to cache on install (both build files and static files)
const ASSETS = [
	...build, // SvelteKit-built pages and assets
	...files  // static files from /static directory
];

// Analytics queue configuration
const ANALYTICS_DB_NAME = 'analytics-offline';
const ANALYTICS_STORE_NAME = 'analytics-queue';
const ANALYTICS_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Open IndexedDB for analytics queue
 */
async function openAnalyticsDB() {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(ANALYTICS_DB_NAME, 1);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);

		request.onupgradeneeded = (event) => {
			const db = event.target.result;
			if (!db.objectStoreNames.contains(ANALYTICS_STORE_NAME)) {
				db.createObjectStore(ANALYTICS_STORE_NAME, { autoIncrement: true });
			}
		};
	});
}

/**
 * Queue analytics request for later replay
 */
async function queueAnalyticsRequest(url, body, headers) {
	try {
		const db = await openAnalyticsDB();
		const transaction = db.transaction([ANALYTICS_STORE_NAME], 'readwrite');
		const store = transaction.objectStore(ANALYTICS_STORE_NAME);

		await new Promise((resolve, reject) => {
			const request = store.add({
				url: url,
				body: body,
				headers: headers,
				timestamp: Date.now()
			});
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});

		db.close();
	} catch (err) {
		console.warn('Failed to queue analytics request:', err);
	}
}

/**
 * Replay all queued analytics requests
 */
async function replayAnalyticsQueue() {
	try {
		const db = await openAnalyticsDB();
		const transaction = db.transaction([ANALYTICS_STORE_NAME], 'readwrite');
		const store = transaction.objectStore(ANALYTICS_STORE_NAME);

		const getAllRequest = store.getAll();
		const getAllKeysRequest = store.getAllKeys();

		await new Promise((resolve, reject) => {
			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error);
		});

		const items = getAllRequest.result;
		const keys = getAllKeysRequest.result;

		db.close();

		// Process each queued request
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			const key = keys[i];

			// Skip requests older than 24 hours
			if (Date.now() - item.timestamp > ANALYTICS_MAX_AGE) {
				await deleteQueuedRequest(key);
				continue;
			}

			// Try to send the request
			try {
				const response = await fetch(item.url, {
					method: 'POST',
					headers: item.headers,
					body: item.body
				});

				// If successful, remove from queue
				if (response.ok) {
					await deleteQueuedRequest(key);
				}
			} catch (err) {
				// Still offline or network error - leave in queue for next retry
				console.warn('Failed to replay analytics request:', err);
			}
		}
	} catch (err) {
		console.warn('Failed to replay analytics queue:', err);
	}
}

/**
 * Delete a queued request by key
 */
async function deleteQueuedRequest(key) {
	try {
		const db = await openAnalyticsDB();
		const transaction = db.transaction([ANALYTICS_STORE_NAME], 'readwrite');
		const store = transaction.objectStore(ANALYTICS_STORE_NAME);

		await new Promise((resolve, reject) => {
			const request = store.delete(key);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});

		db.close();
	} catch (err) {
		console.warn('Failed to delete queued request:', err);
	}
}

/**
 * Handle analytics POST request with offline queuing
 */
async function handleAnalyticsRequest(request) {
	try {
		// Try to send normally
		const response = await fetch(request);
		return response;
	} catch (err) {
		// Network failed - queue for later
		const url = request.url;
		const body = await request.text();
		const headers = {};
		for (const [key, value] of request.headers.entries()) {
			headers[key] = value;
		}

		await queueAnalyticsRequest(url, body, headers);

		// Return 202 Accepted so client doesn't retry
		return new Response(null, { status: 202 });
	}
}

// Install event - cache all assets
self.addEventListener('install', (event) => {
	async function addFilesToCache() {
		const cache = await caches.open(CACHE);
		await cache.addAll(ASSETS);
	}

	event.waitUntil(addFilesToCache());
	self.skipWaiting(); // Activate immediately
});

// Activate event - delete old caches and replay queued analytics
self.addEventListener('activate', (event) => {
	async function deleteOldCaches() {
		const keys = await caches.keys();
		for (const key of keys) {
			if (key !== CACHE) {
				await caches.delete(key);
			}
		}

		// Replay queued analytics when service worker activates
		await replayAnalyticsQueue().catch(() => {});
	}

	event.waitUntil(deleteOldCaches());
	self.clients.claim(); // Take control of all pages immediately
});

// Message event - handle replay-analytics command
self.addEventListener('message', (event) => {
	if (event.data === 'replay-analytics') {
		replayAnalyticsQueue().catch(() => {});
	}
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
	// Intercept analytics POST requests for offline queuing
	if (event.request.method === 'POST') {
		const url = new URL(event.request.url);
		if (url.hostname === 'plausible.io' && url.pathname === '/api/event') {
			event.respondWith(handleAnalyticsRequest(event.request));
			return;
		}
	}

	// Ignore non-GET requests
	if (event.request.method !== 'GET') return;

	async function respond() {
		const url = new URL(event.request.url);
		const cache = await caches.open(CACHE);

		// For build assets, try cache first (cache-first strategy)
		if (ASSETS.includes(url.pathname)) {
			const cachedResponse = await cache.match(event.request);
			if (cachedResponse) {
				return cachedResponse;
			}
		}

		// For all other requests, try network first, then cache
		try {
			const response = await fetch(event.request);

			// Cache successful responses for same-origin requests
			if (response.status === 200 && url.origin === location.origin) {
				cache.put(event.request, response.clone());
			}

			return response;
		} catch {
			// Network failed, try cache
			const cachedResponse = await cache.match(event.request);
			if (cachedResponse) {
				return cachedResponse;
			}

			// If not in cache either, return a basic error response
			return new Response('Network error happened', {
				status: 408,
				headers: { 'Content-Type': 'text/plain' },
			});
		}
	}

	event.respondWith(respond());
});
