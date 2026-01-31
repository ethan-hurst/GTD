/**
 * Sync orchestration engine
 * Handles pull-decrypt-merge-encrypt-push cycle
 */

import { encrypt, decrypt, initIVCounter } from './crypto';
import { loadPairingInfo } from './pair';
import { mergeData } from './merge';
import { db } from '$lib/db/schema';
import { getSetting, setSetting } from '$lib/db/operations';
import type { SyncPayload } from './types';
import { DEFAULT_SYNC_CONFIG } from './types';

/**
 * Export all database tables for sync
 * Includes ALL records (even deleted tombstones)
 */
export async function exportForSync(): Promise<SyncPayload> {
	const data: Record<string, any[]> = {};

	// Export all tables
	for (const table of db.tables) {
		data[table.name] = await table.toArray();
	}

	return {
		version: 1,
		timestamp: new Date().toISOString(),
		schemaVersion: db.verno,
		data
	};
}

/**
 * Import merged data into IndexedDB
 * Full-replace strategy: clear existing data, bulk insert merged result
 */
export async function importFromSync(mergedData: Record<string, any[]>): Promise<void> {
	await db.transaction('rw', db.tables, async () => {
		for (const tableName of Object.keys(mergedData)) {
			const table = db.table(tableName);
			if (table) {
				// Clear existing data
				await table.clear();
				// Bulk insert merged records
				if (mergedData[tableName].length > 0) {
					await table.bulkPut(mergedData[tableName]);
				}
			}
		}
	});
}

/**
 * Pull encrypted blob from Netlify Functions
 * Returns null if no data exists on server
 */
export async function pullFromCloud(deviceId: string): Promise<string | null> {
	try {
		const response = await fetch(`/.netlify/functions/sync-pull?deviceId=${encodeURIComponent(deviceId)}`);

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const json = await response.json();

		if (json.found === false) {
			return null;
		}

		return json.encryptedBlob;
	} catch (err) {
		throw new Error(`Pull failed: ${err instanceof Error ? err.message : String(err)}`);
	}
}

/**
 * Push encrypted blob to Netlify Functions
 */
export async function pushToCloud(deviceId: string, encryptedBlob: string): Promise<boolean> {
	try {
		const response = await fetch('/.netlify/functions/sync-push', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				deviceId,
				encryptedBlob
			})
		});

		return response.ok;
	} catch (err) {
		throw new Error(`Push failed: ${err instanceof Error ? err.message : String(err)}`);
	}
}

/**
 * Full sync cycle: pull -> decrypt -> merge -> encrypt -> push
 */
export async function performSync(
	pairingCode: string,
	deviceId: string
): Promise<{ success: boolean; error?: string }> {
	try {
		// Step 1: Pull from cloud
		const encryptedRemote = await pullFromCloud(deviceId);

		let remoteData: Record<string, any[]> | null = null;

		// Step 2: If remote data exists, decrypt it
		if (encryptedRemote) {
			const decryptedJson = await decrypt(encryptedRemote, pairingCode);
			const remotePayload: SyncPayload = JSON.parse(decryptedJson);
			remoteData = remotePayload.data;
		}

		// Step 3: Export local data
		const localPayload = await exportForSync();
		const localData = localPayload.data;

		// Step 4: Merge (or use local only if no remote)
		const mergedData = remoteData ? mergeData(localData, remoteData) : localData;

		// Step 5: Encrypt merged data
		const mergedPayload: SyncPayload = {
			version: 1,
			timestamp: new Date().toISOString(),
			schemaVersion: db.verno,
			data: mergedData
		};
		const encryptedMerged = await encrypt(JSON.stringify(mergedPayload), pairingCode);

		// Step 6: Push to cloud
		const pushSuccess = await pushToCloud(deviceId, encryptedMerged);
		if (!pushSuccess) {
			throw new Error('Push to cloud failed');
		}

		// Step 7: Import merged data into local DB
		// Always import to ensure local DB matches what was pushed
		// and to trigger UI refresh even on first sync
		await importFromSync(mergedData);

		// Step 8: Notify page stores to refresh their data
		// Always dispatch event to ensure UI updates even on first sync
		if (typeof window !== 'undefined') {
			window.dispatchEvent(new CustomEvent('sync-data-imported'));
		}

		// Step 9: Save lastSyncTime
		await setSetting('sync-last-sync-time', new Date().toISOString());

		return { success: true };
	} catch (err) {
		return {
			success: false,
			error: err instanceof Error ? err.message : String(err)
		};
	}
}

/**
 * Debounced sync triggering
 * Batches changes to prevent excessive API calls
 */
export class SyncDebouncer {
	private changeCount = 0;
	private timeoutId: ReturnType<typeof setTimeout> | null = null;
	private readonly maxChanges = DEFAULT_SYNC_CONFIG.maxChangesBeforeSync;
	private readonly maxDelayMs = DEFAULT_SYNC_CONFIG.debounceMs;

	/**
	 * Queue a sync operation
	 * Executes immediately if changeCount >= maxChanges
	 * Otherwise debounces with maxDelayMs timeout
	 */
	queueSync(syncFn: () => Promise<void>): void {
		this.changeCount++;

		if (this.changeCount >= this.maxChanges) {
			// Execute immediately
			this.cancel();
			this.changeCount = 0;
			syncFn().catch(err => {
				console.error('Debounced sync failed:', err);
			});
		} else {
			// Debounce
			if (this.timeoutId) {
				clearTimeout(this.timeoutId);
			}

			this.timeoutId = setTimeout(() => {
				this.changeCount = 0;
				this.timeoutId = null;
				syncFn().catch(err => {
					console.error('Debounced sync failed:', err);
				});
			}, this.maxDelayMs);
		}
	}

	/**
	 * Cancel pending sync and reset counter
	 */
	cancel(): void {
		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
			this.timeoutId = null;
		}
		this.changeCount = 0;
	}
}

/**
 * Global sync debouncer instance
 */
export const syncDebouncer = new SyncDebouncer();

/**
 * Register a callback to run when sync imports new data
 * Used by page stores to refresh their state after a sync
 */
export function onSyncDataImported(callback: () => void): void {
	if (typeof window !== 'undefined') {
		window.addEventListener('sync-data-imported', () => callback());
	}
}
