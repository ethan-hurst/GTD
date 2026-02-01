/**
 * Reactive sync state store (Svelte 5 runes)
 * Manages device pairing and sync orchestration
 */

import type { SyncState } from '$lib/sync/types';
import { DEFAULT_SYNC_CONFIG } from '$lib/sync/types';
import { performSync, checkForUpdates, syncDebouncer } from '$lib/sync/sync';
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

	// Polling state
	private lastKnownHash: string | null = null;
	private pollIntervalId: ReturnType<typeof setInterval> | null = null;

	// Init guard - prevents concurrent/duplicate init calls
	private initPromise: Promise<void> | null = null;

	constructor() {
		// Initialization happens in init()
	}

	/**
	 * Extract a readable error message from potentially minified errors.
	 * Dexie errors have .name and .message even when constructor is minified.
	 */
	private static formatError(err: unknown): string {
		if (err instanceof Error) {
			// Use name + message for better debugging (works even with minified constructors)
			const name = err.name || err.constructor?.name || 'Error';
			return err.message ? `${name}: ${err.message}` : name;
		}
		return String(err);
	}

	/**
	 * Initialize sync store from IndexedDB.
	 * Safe to call multiple times - subsequent calls return the same promise.
	 */
	async init(): Promise<void> {
		// Return existing init promise if already initializing/initialized
		if (this.initPromise) return this.initPromise;

		this.initPromise = this.doInit();
		return this.initPromise;
	}

	/**
	 * Internal init implementation (called once)
	 */
	private async doInit(): Promise<void> {
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

			// Start polling if already paired
			if (this.isPaired) {
				this.startPolling();
			}
		} catch (err) {
			console.error('Sync init failed:', SyncStore.formatError(err));
			this.lastError = SyncStore.formatError(err);
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

			// Start polling for remote changes
			this.startPolling();

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
		// Stop polling
		this.stopPolling();

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
		this.lastKnownHash = null;

		// Cancel any pending syncs
		syncDebouncer.cancel();
	}

	/**
	 * Set pairing code (for continued use after page refresh)
	 * Also re-initializes IV counter needed for encryption
	 */
	async setPairingCode(code: string): Promise<void> {
		try {
			const normalized = normalizePairingCode(code);
			this.pairingCode = normalized;
			this.lastError = null;

			// Re-initialize IV counter (needed for encryption during sync)
			if (this.deviceId) {
				await initIVCounter(this.deviceId);
			}
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

				// Track content hash for polling change detection
				if (result.contentHash) {
					this.lastKnownHash = result.contentHash;
				}
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

	/**
	 * Start periodic polling for remote changes
	 */
	private startPolling(): void {
		// Don't start if already polling
		if (this.pollIntervalId) return;

		this.pollIntervalId = setInterval(
			() => {
				this.pollForChanges().catch(err => {
					console.warn('Poll for changes failed:', SyncStore.formatError(err));
				});
			},
			DEFAULT_SYNC_CONFIG.pollIntervalMs
		);
	}

	/**
	 * Stop periodic polling
	 */
	private stopPolling(): void {
		if (this.pollIntervalId) {
			clearInterval(this.pollIntervalId);
			this.pollIntervalId = null;
		}
	}

	/**
	 * Poll for remote changes via lightweight hash check.
	 * Only triggers a full sync if the remote hash differs from lastKnownHash.
	 */
	private async pollForChanges(): Promise<void> {
		// Guard: must be paired with code available
		if (!this.isPaired || !this.deviceId || !this.pairingCode) return;

		// Guard: don't poll while already syncing
		if (this.syncState !== 'idle' && this.syncState !== 'error') return;

		// Guard: skip if tab is hidden (save bandwidth)
		if (typeof document !== 'undefined' && document.hidden) return;

		const remoteHash = await checkForUpdates(this.deviceId);

		// No hash available (endpoint error or no data yet) — skip
		if (!remoteHash) return;

		// Hash matches — no changes
		if (remoteHash === this.lastKnownHash) return;

		// Remote has changed — trigger full sync
		await this.sync();
	}
}

export const syncState = new SyncStore();
