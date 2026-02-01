// Sync state machine
export type SyncState = 'idle' | 'pulling' | 'pushing' | 'merging' | 'error';

// Overall sync status
export interface SyncStatus {
	state: SyncState;
	lastSyncTime: Date | null;
	lastError: string | null;
	isPaired: boolean;
}

// Encrypted data blob structure
export interface EncryptedBlob {
	salt: string;
	iv: string;
	ciphertext: string;
}

// Payload structure for sync operations
export interface SyncPayload {
	version: number;
	timestamp: string;
	schemaVersion: number;
	data: Record<string, any[]>;
}

// Device pairing information
export interface PairingInfo {
	pairingCode: string;
	deviceId: string;
	pairedAt: Date;
}

// Sync configuration
export interface SyncConfig {
	debounceMs: number;
	maxChangesBeforeSync: number;
	tombstoneMaxAgeDays: number;
	pollIntervalMs: number;
}

// Default sync configuration
export const DEFAULT_SYNC_CONFIG: SyncConfig = {
	debounceMs: 2000,
	maxChangesBeforeSync: 5,
	tombstoneMaxAgeDays: 30,
	pollIntervalMs: 30000
};
