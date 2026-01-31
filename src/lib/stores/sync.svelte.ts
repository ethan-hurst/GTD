/**
 * Reactive sync state store (Svelte 5 runes)
 * Manages device pairing and sync orchestration
 */

import type { SyncState } from '$lib/sync/types';
import { performSync, syncDebouncer } from '$lib/sync/sync';
import {
	loadPairingInfo,
	savePairingInfo,
	clearPairingInfo,
	validatePairingCode,
	normalizePairingCode,
	hashPairingCode
} from '$lib/sync/pair';
import { initIVCounter } from '$lib/sync/crypto';
import { getSetting, setSetting, setSyncNotifier } from '$lib/db/operations';

class SyncStore {
	isPaired = $state(false);
	syncState = $state<SyncState>('idle');
	lastSyncTime = $state<Date | null>(null);
	lastError = $state<string | null>(null);
	deviceId = $state<string | null>(null);

	// Private - pairing code held in memory only (not persisted)
	private pairingCode: string | null = null;

	constructor() {
		// Initialization happens in init()
	}

	/**
	 * Initialize sync store from IndexedDB
	 */
	async init(): Promise<void> {
		try {
			// Load pairing info
			const pairingInfo = await loadPairingInfo();
			if (pairingInfo) {
				this.isPaired = true;
				this.deviceId = pairingInfo.deviceId;
			}

			// Load last sync time
			const lastSyncStr = await getSetting('sync-last-sync-time');
			if (lastSyncStr) {
				this.lastSyncTime = new Date(lastSyncStr);
			}

			// Wire up sync notifier for database changes
			setSyncNotifier(() => this.queueSync());
		} catch (err) {
			console.error('Sync init failed:', err);
			this.lastError = err instanceof Error ? err.message : String(err);
		}
	}

	/**
	 * Pair this device using a pairing code
	 * Validates code, hashes for deviceId, initializes IV counter
	 */
	async pair(pairingCode: string): Promise<boolean> {
		try {
			// Check for required browser APIs
			if (typeof indexedDB === 'undefined') {
				this.lastError = 'IndexedDB is not available. Please open this app in your regular browser (Chrome, Safari, Firefox) — not an in-app browser.';
				return false;
			}
			if (typeof crypto === 'undefined' || !crypto.subtle) {
				this.lastError = 'Web Crypto API is not available. Please make sure you are accessing this site over HTTPS.';
				return false;
			}

			// Validate code format
			if (!validatePairingCode(pairingCode)) {
				this.lastError = 'Invalid pairing code format';
				return false;
			}

			// Normalize and store in memory
			const normalized = normalizePairingCode(pairingCode);
			this.pairingCode = normalized;

			// Generate deviceId from hash
			const deviceId = await hashPairingCode(normalized);

			// Initialize IV counter with device prefix
			await initIVCounter(deviceId);

			// Save pairing info to IndexedDB
			await savePairingInfo(normalized);

			// Update state
			this.isPaired = true;
			this.deviceId = deviceId;
			this.lastError = null;

			// Trigger initial sync
			await this.sync();

			return true;
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			// Provide user-friendly message for common errors
			if (message.includes('MissingAPI') || message.includes('indexedDB') || message.includes('IndexDB')) {
				this.lastError = 'Database not available. Please open this app in your regular browser (Chrome, Safari, Firefox) — in-app browsers and some private/incognito modes may not support this feature.';
			} else {
				this.lastError = message;
			}
			return false;
		}
	}

	/**
	 * Unpair this device
	 * Clears all pairing info and resets state
	 */
	async unpair(): Promise<void> {
		// Clear pairing info from IndexedDB
		await clearPairingInfo();

		// Clear IV counter
		await setSetting('sync-iv-counter', null);

		// Reset all state
		this.isPaired = false;
		this.deviceId = null;
		this.pairingCode = null;
		this.lastSyncTime = null;
		this.lastError = null;
		this.syncState = 'idle';

		// Cancel any pending syncs
		syncDebouncer.cancel();
	}

	/**
	 * Set pairing code (for continued use after page refresh)
	 */
	setPairingCode(code: string): void {
		try {
			const normalized = normalizePairingCode(code);
			this.pairingCode = normalized;
			this.lastError = null;
		} catch (err) {
			this.lastError = err instanceof Error ? err.message : String(err);
		}
	}

	/**
	 * Check if pairing code is available in memory
	 */
	hasPairingCode(): boolean {
		return this.pairingCode !== null;
	}

	/**
	 * Perform sync operation
	 * Guards: must be paired, must have pairing code, must not already be syncing
	 */
	async sync(): Promise<void> {
		// Guard: not paired
		if (!this.isPaired || !this.deviceId) {
			this.lastError = 'Device not paired';
			return;
		}

		// Guard: no pairing code in memory
		if (!this.pairingCode) {
			this.lastError = 'Pairing code not available - please re-enter';
			return;
		}

		// Guard: already syncing
		if (this.syncState !== 'idle' && this.syncState !== 'error') {
			return;
		}

		try {
			// Update state to pulling
			this.syncState = 'pulling';
			this.lastError = null;

			// Perform sync
			const result = await performSync(this.pairingCode, this.deviceId);

			if (result.success) {
				this.syncState = 'idle';
				this.lastSyncTime = new Date();
				this.lastError = null;
			} else {
				this.syncState = 'error';
				this.lastError = result.error || 'Sync failed';
			}
		} catch (err) {
			this.syncState = 'error';
			this.lastError = err instanceof Error ? err.message : String(err);
		}
	}

	/**
	 * Force immediate sync (bypasses debounce)
	 */
	async forceSync(): Promise<void> {
		// Cancel any pending debounced sync
		syncDebouncer.cancel();

		// Execute sync immediately
		await this.sync();
	}

	/**
	 * Queue debounced sync
	 * Called after DB modifications to batch changes
	 */
	queueSync(): void {
		if (!this.isPaired || !this.hasPairingCode()) {
			return;
		}

		syncDebouncer.queueSync(async () => {
			await this.sync();
		});
	}
}

export const syncState = new SyncStore();
