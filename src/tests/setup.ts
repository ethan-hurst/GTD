import { beforeEach } from 'vitest';

// Reset IndexedDB between all tests to ensure test isolation
// Without this reset, data from one test can leak into another
// Note: Using real browser IndexedDB in browser mode, not fake-indexeddb
beforeEach(async () => {
	// In browser mode, delete all databases to reset state
	if (typeof indexedDB !== 'undefined' && indexedDB.databases) {
		const databases = await indexedDB.databases();
		await Promise.all(
			databases.map((db) => {
				if (db.name) {
					return new Promise<void>((resolve, reject) => {
						const request = indexedDB.deleteDatabase(db.name!);
						request.onsuccess = () => resolve();
						request.onerror = () => reject(request.error);
					});
				}
			})
		);
	}
});
