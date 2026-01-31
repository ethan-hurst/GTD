/**
 * Per-record Last-Write-Wins merge logic for device sync
 * Uses modified timestamps to resolve conflicts
 */

import type { GTDItem, CalendarEvent, Context } from '$lib/db/schema';

/**
 * Generic sync record with required fields for LWW merge
 */
export type SyncRecord = {
	id: number;
	modified: Date;
	deleted?: boolean;
	[key: string]: any;
};

/**
 * Date fields that need deserialization from JSON
 */
const DATE_FIELDS = [
	'created',
	'modified',
	'deletedAt',
	'startTime',
	'endTime',
	'followUpDate',
	'completedAt',
	'pairedAt',
	'updatedAt'
];

/**
 * Deserialize date fields from ISO strings to Date objects
 */
function deserializeDates(record: any): any {
	if (!record || typeof record !== 'object') {
		return record;
	}

	const deserialized = { ...record };

	for (const field of DATE_FIELDS) {
		if (deserialized[field] && typeof deserialized[field] === 'string') {
			deserialized[field] = new Date(deserialized[field]);
		}
	}

	return deserialized;
}

/**
 * Get the best available timestamp from a record
 * Falls back through: modified → updatedAt → created
 */
function getTimestamp(record: any): Date | string | null {
	return record.modified || record.updatedAt || record.created || null;
}

/**
 * Compare two Date objects (handles both Date instances and ISO strings)
 */
function compareDates(a: Date | string, b: Date | string): number {
	const dateA = typeof a === 'string' ? new Date(a) : a;
	const dateB = typeof b === 'string' ? new Date(b) : b;
	return dateA.getTime() - dateB.getTime();
}

/**
 * Merge two arrays of records using Last-Write-Wins strategy
 * Preserves tombstones (deleted=true) for propagation
 */
export function mergeTable<T extends SyncRecord>(local: T[], remote: T[]): T[] {
	const merged = new Map<number, T>();

	// Add all local records
	for (const record of local) {
		merged.set(record.id, deserializeDates(record));
	}

	// Merge remote records
	for (const remoteRecord of remote) {
		const deserialized = deserializeDates(remoteRecord);
		const localRecord = merged.get(deserialized.id);

		if (!localRecord) {
			// New record from remote device
			merged.set(deserialized.id, deserialized);
		} else {
			// Conflict - use Last-Write-Wins based on best available timestamp
			const remoteTime = getTimestamp(deserialized);
			const localTime = getTimestamp(localRecord);

			if (remoteTime && localTime) {
				const comparison = compareDates(remoteTime, localTime);
				if (comparison > 0) {
					// Remote is newer
					merged.set(deserialized.id, deserialized);
				}
				// If comparison <= 0, keep local (already in map)
			} else if (remoteTime && !localTime) {
				// Only remote has a timestamp — prefer it
				merged.set(deserialized.id, deserialized);
			}
			// If neither has timestamps or only local does, keep local
		}
	}

	return Array.from(merged.values());
}

/**
 * Merge entire sync payloads table-by-table
 */
export function mergePayloads(
	localData: Record<string, any[]>,
	remoteData: Record<string, any[]>
): Record<string, any[]> {
	const result: Record<string, any[]> = {};

	// Get all table names from both payloads
	const allTables = new Set([
		...Object.keys(localData),
		...Object.keys(remoteData)
	]);

	for (const tableName of allTables) {
		const localTable = localData[tableName] || [];
		const remoteTable = remoteData[tableName] || [];

		if (localTable.length === 0 && remoteTable.length === 0) {
			// Both empty - skip
			result[tableName] = [];
		} else if (localTable.length === 0) {
			// Only remote has data
			result[tableName] = remoteTable.map(deserializeDates);
		} else if (remoteTable.length === 0) {
			// Only local has data
			result[tableName] = localTable;
		} else {
			// Both have data - merge
			result[tableName] = mergeTable(localTable, remoteTable);
		}
	}

	return result;
}

/**
 * Main entry point for merging sync data
 * Handles per-record LWW with tombstone preservation
 */
export function mergeData(
	localData: Record<string, any[]>,
	remoteData: Record<string, any[]>
): Record<string, any[]> {
	return mergePayloads(localData, remoteData);
}
