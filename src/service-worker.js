/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

// Create a unique cache name for this deployment
const CACHE = `cache-${version}`;

// Assets to cache on install (both build files and static files)
const ASSETS = [
	...build, // SvelteKit-built pages and assets
	...files  // static files from /static directory
];

// Feedback queue configuration
const FEEDBACK_DB_NAME = 'GTDDatabase';
const FEEDBACK_STORE_NAME = 'feedbackQueue';

async function syncFeedbackQueue() {
	try {
		const db = await new Promise((resolve, reject) => {
			const request = indexedDB.open(FEEDBACK_DB_NAME);
			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(request.result);
		});

		const transaction = db.transaction([FEEDBACK_STORE_NAME], 'readwrite');
		const store = transaction.objectStore(FEEDBACK_STORE_NAME);

		const items = await new Promise((resolve, reject) => {
			const request = store.getAll();
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});

		const keys = await new Promise((resolve, reject) => {
			const request = store.getAllKeys();
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});

		db.close();

		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			const key = keys[i];

			if (item.retryCount > 5) {
				await deleteFeedbackItem(key);
				continue;
			}

			try {
				const params = new URLSearchParams();
				params.append('form-name', 'feedback');
				params.append('bot-field', '');
				params.append('type', item.type);
				params.append('description', item.description);
				if (item.email) params.append('email', item.email);
				if (item.screenshot) params.append('screenshot', item.screenshot);

				const response = await fetch('/feedback', {
					method: 'POST',
					headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
					body: params.toString()
				});

				if (response.ok || response.status === 302) {
					await deleteFeedbackItem(key);
				}
			} catch (err) {
				console.warn('SW: Failed to sync feedback:', err);
			}
		}
	} catch (err) {
		console.warn('SW: Failed to access feedback queue:', err);
	}
}

async function deleteFeedbackItem(key) {
	try {
		const db = await new Promise((resolve, reject) => {
			const request = indexedDB.open(FEEDBACK_DB_NAME);
			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(request.result);
		});
		const transaction = db.transaction([FEEDBACK_STORE_NAME], 'readwrite');
		const store = transaction.objectStore(FEEDBACK_STORE_NAME);
		await new Promise((resolve, reject) => {
			const request = store.delete(key);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
		db.close();
	} catch (err) {
		console.warn('SW: Failed to delete feedback item:', err);
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

// Activate event - delete old caches
self.addEventListener('activate', (event) => {
	async function deleteOldCaches() {
		const keys = await caches.keys();
		for (const key of keys) {
			if (key !== CACHE) {
				await caches.delete(key);
			}
		}
	}

	event.waitUntil(deleteOldCaches());
	self.clients.claim(); // Take control of all pages immediately
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
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

// Sync event - background sync for feedback queue
self.addEventListener('sync', (event) => {
	if (event.tag === 'sync-feedback') {
		event.waitUntil(syncFeedbackQueue());
	}
});

// Message event - replay feedback queue on demand
self.addEventListener('message', (event) => {
	if (event.data === 'replay-feedback') {
		syncFeedbackQueue().catch(() => {});
	}
});
