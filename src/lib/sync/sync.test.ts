import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from '$lib/db/schema';
import { generateUUID } from '$lib/utils/uuid';
import {
	exportForSync,
	importFromSync,
	computeContentHash,
	pullFromCloud,
	checkForUpdates,
	pushToCloud,
	SyncDebouncer
} from './sync';

// Fresh database before each test
beforeEach(async () => {
	if (db.isOpen()) {
		db.close();
	}
	await db.delete();
	await db.open();
	vi.restoreAllMocks();
});

// ------------------------------------------------------------------
// exportForSync
// ------------------------------------------------------------------
describe('exportForSync', () => {
	it('returns SyncPayload with version 1, timestamp, and schemaVersion', async () => {
		const payload = await exportForSync();

		expect(payload.version).toBe(1);
		expect(typeof payload.timestamp).toBe('string');
		// ISO 8601 timestamp
		expect(new Date(payload.timestamp).toISOString()).toBe(payload.timestamp);
		expect(payload.schemaVersion).toBe(db.verno);
	});

	it('includes all database table names as keys in data', async () => {
		const payload = await exportForSync();
		const tableNames = db.tables.map((t) => t.name).sort();
		const payloadKeys = Object.keys(payload.data).sort();

		expect(payloadKeys).toEqual(tableNames);
	});

	it('exports items added to database', async () => {
		const itemId = generateUUID();
		await db.items.add({
			id: itemId,
			title: 'Test item',
			type: 'inbox',
			notes: '',
			created: new Date(),
			modified: new Date()
		});

		const payload = await exportForSync();
		const items = payload.data.items;

		expect(items.length).toBeGreaterThanOrEqual(1);
		const found = items.find((i: any) => i.id === itemId);
		expect(found).toBeDefined();
		expect(found.title).toBe('Test item');
	});

	it('exports settings added to database', async () => {
		await db.settings.add({
			key: 'test-setting',
			value: { foo: 'bar' },
			updatedAt: new Date()
		} as any);

		const payload = await exportForSync();
		const settings = payload.data.settings;

		expect(settings.length).toBeGreaterThanOrEqual(1);
		const found = settings.find((s: any) => s.key === 'test-setting');
		expect(found).toBeDefined();
		expect(found.value).toEqual({ foo: 'bar' });
	});

	it('handles empty database (returns payload with empty arrays)', async () => {
		// Clear all default data (contexts are seeded by populate hook)
		await db.contexts.clear();

		const payload = await exportForSync();

		for (const tableName of Object.keys(payload.data)) {
			expect(Array.isArray(payload.data[tableName])).toBe(true);
		}
	});
});

// ------------------------------------------------------------------
// importFromSync
// ------------------------------------------------------------------
describe('importFromSync', () => {
	it('replaces existing items with imported data', async () => {
		// Add an existing item
		await db.items.add({
			id: generateUUID(),
			title: 'Existing item',
			type: 'inbox',
			notes: '',
			created: new Date(),
			modified: new Date()
		});

		const newId = generateUUID();
		await importFromSync({
			items: [
				{
					id: newId,
					title: 'Imported item',
					type: 'next-action',
					notes: '',
					created: new Date(),
					modified: new Date()
				}
			]
		});

		const allItems = await db.items.toArray();
		expect(allItems).toHaveLength(1);
		expect(allItems[0].id).toBe(newId);
		expect(allItems[0].title).toBe('Imported item');
	});

	it('clears tables before importing (full-replace strategy)', async () => {
		// Add multiple items
		await db.items.add({
			id: generateUUID(),
			title: 'Item A',
			type: 'inbox',
			notes: '',
			created: new Date(),
			modified: new Date()
		});
		await db.items.add({
			id: generateUUID(),
			title: 'Item B',
			type: 'inbox',
			notes: '',
			created: new Date(),
			modified: new Date()
		});

		// Import single item -- should replace both existing
		await importFromSync({
			items: [
				{
					id: generateUUID(),
					title: 'Only Item',
					type: 'inbox',
					notes: '',
					created: new Date(),
					modified: new Date()
				}
			]
		});

		const allItems = await db.items.toArray();
		expect(allItems).toHaveLength(1);
		expect(allItems[0].title).toBe('Only Item');
	});

	it('handles empty arrays (clears table)', async () => {
		await db.items.add({
			id: generateUUID(),
			title: 'Existing',
			type: 'inbox',
			notes: '',
			created: new Date(),
			modified: new Date()
		});

		await importFromSync({ items: [] });

		const allItems = await db.items.toArray();
		expect(allItems).toHaveLength(0);
	});

	it('handles multiple tables in single transaction', async () => {
		const itemId = generateUUID();
		const eventId = generateUUID();

		await importFromSync({
			items: [
				{
					id: itemId,
					title: 'Imported item',
					type: 'inbox',
					notes: '',
					created: new Date(),
					modified: new Date()
				}
			],
			events: [
				{
					id: eventId,
					title: 'Imported event',
					startTime: new Date(),
					endTime: new Date(),
					created: new Date(),
					modified: new Date()
				}
			]
		});

		const items = await db.items.toArray();
		const events = await db.events.toArray();

		expect(items).toHaveLength(1);
		expect(items[0].id).toBe(itemId);
		expect(events).toHaveLength(1);
		expect(events[0].id).toBe(eventId);
	});

	it('throws on unknown table names (Dexie rejects invalid tables)', async () => {
		// db.table() throws InvalidTableError for tables not in the schema
		await expect(
			importFromSync({
				nonexistent_table: [{ id: '1', data: 'test' }]
			})
		).rejects.toThrow();
	});
});

// ------------------------------------------------------------------
// computeContentHash
// ------------------------------------------------------------------
describe('computeContentHash', () => {
	it('returns 64-character hex string', async () => {
		const hash = await computeContentHash({
			items: [{ id: '1', title: 'Test' }]
		});

		expect(hash).toMatch(/^[0-9a-f]{64}$/);
	});

	it('same data produces same hash (deterministic)', async () => {
		const data = { items: [{ id: '1', title: 'Test' }] };

		const hash1 = await computeContentHash(data);
		const hash2 = await computeContentHash(data);

		expect(hash1).toBe(hash2);
	});

	it('different data produces different hashes', async () => {
		const hash1 = await computeContentHash({
			items: [{ id: '1', title: 'Test A' }]
		});
		const hash2 = await computeContentHash({
			items: [{ id: '1', title: 'Test B' }]
		});

		expect(hash1).not.toBe(hash2);
	});

	it('is order-independent for records within a table (sorted by id)', async () => {
		const hash1 = await computeContentHash({
			items: [
				{ id: 'a', title: 'First' },
				{ id: 'b', title: 'Second' }
			]
		});
		const hash2 = await computeContentHash({
			items: [
				{ id: 'b', title: 'Second' },
				{ id: 'a', title: 'First' }
			]
		});

		expect(hash1).toBe(hash2);
	});

	it('is order-independent for table names (sorted alphabetically)', async () => {
		const hash1 = await computeContentHash({
			items: [{ id: 'a', title: 'Item' }],
			events: [{ id: 'e', title: 'Event' }]
		});
		const hash2 = await computeContentHash({
			events: [{ id: 'e', title: 'Event' }],
			items: [{ id: 'a', title: 'Item' }]
		});

		expect(hash1).toBe(hash2);
	});
});

// ------------------------------------------------------------------
// pullFromCloud
// ------------------------------------------------------------------
describe('pullFromCloud', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('returns encryptedBlob when server returns found data', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ found: true, encryptedBlob: 'encrypted-data-here' })
			})
		);

		const result = await pullFromCloud('test-device-id');
		expect(result).toBe('encrypted-data-here');
	});

	it('returns null when server returns found=false', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ found: false })
			})
		);

		const result = await pullFromCloud('test-device-id');
		expect(result).toBeNull();
	});

	it('throws on HTTP error (non-200 status)', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: false,
				status: 500,
				statusText: 'Internal Server Error'
			})
		);

		await expect(pullFromCloud('test-device-id')).rejects.toThrow('Pull failed');
	});

	it('throws on network error (fetch rejects)', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));

		await expect(pullFromCloud('test-device-id')).rejects.toThrow('Pull failed');
	});
});

// ------------------------------------------------------------------
// checkForUpdates
// ------------------------------------------------------------------
describe('checkForUpdates', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('returns hash string when server returns found=true with hash', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ found: true, hash: 'abc123hash' })
			})
		);

		const result = await checkForUpdates('test-device-id');
		expect(result).toBe('abc123hash');
	});

	it('returns null when server returns found=false', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ found: false })
			})
		);

		const result = await checkForUpdates('test-device-id');
		expect(result).toBeNull();
	});

	it('returns null on HTTP error (non-throwing)', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: false,
				status: 500,
				statusText: 'Internal Server Error'
			})
		);

		const result = await checkForUpdates('test-device-id');
		expect(result).toBeNull();
	});

	it('returns null on network error (non-throwing)', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));

		const result = await checkForUpdates('test-device-id');
		expect(result).toBeNull();
	});
});

// ------------------------------------------------------------------
// pushToCloud
// ------------------------------------------------------------------
describe('pushToCloud', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('returns true on successful push (200 response)', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({ ok: true })
		);

		const result = await pushToCloud('device-id', 'encrypted-blob');
		expect(result).toBe(true);
	});

	it('returns false on failed push (non-200 response)', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({ ok: false, status: 500 })
		);

		const result = await pushToCloud('device-id', 'encrypted-blob');
		expect(result).toBe(false);
	});

	it('sends deviceId, encryptedBlob, and optional contentHash in body', async () => {
		const mockFetch = vi.fn().mockResolvedValue({ ok: true });
		vi.stubGlobal('fetch', mockFetch);

		await pushToCloud('my-device', 'my-blob', 'my-hash');

		expect(mockFetch).toHaveBeenCalledWith(
			'/.netlify/functions/sync-push',
			expect.objectContaining({
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					deviceId: 'my-device',
					encryptedBlob: 'my-blob',
					contentHash: 'my-hash'
				})
			})
		);
	});

	it('omits contentHash from body when not provided', async () => {
		const mockFetch = vi.fn().mockResolvedValue({ ok: true });
		vi.stubGlobal('fetch', mockFetch);

		await pushToCloud('my-device', 'my-blob');

		expect(mockFetch).toHaveBeenCalledWith(
			'/.netlify/functions/sync-push',
			expect.objectContaining({
				body: JSON.stringify({
					deviceId: 'my-device',
					encryptedBlob: 'my-blob'
				})
			})
		);
	});

	it('throws on network error', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));

		await expect(pushToCloud('device-id', 'blob')).rejects.toThrow('Push failed');
	});
});

// ------------------------------------------------------------------
// SyncDebouncer
// ------------------------------------------------------------------
describe('SyncDebouncer', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('debounces calls (call twice rapidly, only one sync after delay)', async () => {
		const debouncer = new SyncDebouncer();
		const syncFn = vi.fn().mockResolvedValue(undefined);

		debouncer.queueSync(syncFn);
		debouncer.queueSync(syncFn);

		expect(syncFn).not.toHaveBeenCalled();

		// Advance past debounce delay (DEFAULT_SYNC_CONFIG.debounceMs = 2000)
		await vi.advanceTimersByTimeAsync(2000);

		expect(syncFn).toHaveBeenCalledOnce();

		debouncer.cancel();
	});

	it('triggers immediately at maxChanges threshold (5)', async () => {
		const debouncer = new SyncDebouncer();
		const syncFn = vi.fn().mockResolvedValue(undefined);

		// Queue 5 changes (maxChangesBeforeSync = 5)
		for (let i = 0; i < 5; i++) {
			debouncer.queueSync(syncFn);
		}

		// Should have been called immediately on the 5th call, no timer needed
		// But the call is async (syncFn().catch(...)), so flush microtasks
		await vi.advanceTimersByTimeAsync(0);

		expect(syncFn).toHaveBeenCalledOnce();

		debouncer.cancel();
	});

	it('resets counter after execution via threshold', async () => {
		const debouncer = new SyncDebouncer();
		const syncFn = vi.fn().mockResolvedValue(undefined);

		// Trigger at threshold
		for (let i = 0; i < 5; i++) {
			debouncer.queueSync(syncFn);
		}
		await vi.advanceTimersByTimeAsync(0);
		expect(syncFn).toHaveBeenCalledTimes(1);

		// Queue again -- should debounce anew (not trigger immediately)
		debouncer.queueSync(syncFn);
		expect(syncFn).toHaveBeenCalledTimes(1); // Still 1

		await vi.advanceTimersByTimeAsync(2000);
		expect(syncFn).toHaveBeenCalledTimes(2);

		debouncer.cancel();
	});

	it('cancel() clears pending timeout and resets counter', async () => {
		const debouncer = new SyncDebouncer();
		const syncFn = vi.fn().mockResolvedValue(undefined);

		debouncer.queueSync(syncFn);
		debouncer.cancel();

		// Advance past debounce delay -- should NOT fire
		await vi.advanceTimersByTimeAsync(2000);

		expect(syncFn).not.toHaveBeenCalled();
	});

	it('does not call syncFn if cancelled before timeout fires', async () => {
		const debouncer = new SyncDebouncer();
		const syncFn = vi.fn().mockResolvedValue(undefined);

		// Queue 3 changes (below threshold)
		debouncer.queueSync(syncFn);
		debouncer.queueSync(syncFn);
		debouncer.queueSync(syncFn);

		// Cancel before timeout
		debouncer.cancel();

		// Advance well past debounce delay
		await vi.advanceTimersByTimeAsync(5000);

		expect(syncFn).not.toHaveBeenCalled();
	});
});
