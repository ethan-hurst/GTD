/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

// Create a unique cache name for this deployment
const CACHE = `cache-${version}`;

// Assets to cache on install (both build files and static files)
const ASSETS = [
	...build, // SvelteKit-built pages and assets
	...files  // static files from /static directory
];

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
