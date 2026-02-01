/**
 * Unit tests for Last-Write-Wins merge logic
 */

import { describe, it, expect } from 'vitest';
import { mergeTable, mergePayloads, mergeData } from './merge';
import type { SyncRecord } from './merge';

describe('mergeTable', () => {
	describe('Basic merging', () => {
		it('merges empty local + empty remote to empty result', () => {
			const result = mergeTable([], []);
			expect(result).toEqual([]);
		});

		it('preserves items only in local', () => {
			const local = [
				{ id: '1', title: 'Local Item', modified: new Date('2026-01-01T00:00:00Z') }
			];
			const result = mergeTable(local, []);
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('1');
			expect(result[0].title).toBe('Local Item');
		});

		it('adds items only in remote', () => {
			const remote = [
				{ id: '2', title: 'Remote Item', modified: new Date('2026-01-01T00:00:00Z') }
			];
			const result = mergeTable([], remote);
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('2');
			expect(result[0].title).toBe('Remote Item');
		});

		it('combines non-overlapping items from both sides', () => {
			const local = [
				{ id: '1', title: 'Local Item', modified: new Date('2026-01-01T00:00:00Z') }
			];
			const remote = [
				{ id: '2', title: 'Remote Item', modified: new Date('2026-01-01T00:00:00Z') }
			];
			const result = mergeTable(local, remote);
			expect(result).toHaveLength(2);
			const ids = result.map(r => r.id).sort();
			expect(ids).toEqual(['1', '2']);
		});
	});

	describe('LWW conflict resolution', () => {
		it('uses remote when remote is newer', () => {
			const older = new Date('2026-01-01T00:00:00Z');
			const newer = new Date('2026-01-15T00:00:00Z');

			const local = [
				{ id: '1', title: 'Local Version', modified: older }
			];
			const remote = [
				{ id: '1', title: 'Remote Version', modified: newer }
			];

			const result = mergeTable(local, remote);
			expect(result).toHaveLength(1);
			expect(result[0].title).toBe('Remote Version');
			expect(result[0].modified.getTime()).toBe(newer.getTime());
		});

		it('uses local when local is newer', () => {
			const older = new Date('2026-01-01T00:00:00Z');
			const newer = new Date('2026-01-15T00:00:00Z');

			const local = [
				{ id: '1', title: 'Local Version', modified: newer }
			];
			const remote = [
				{ id: '1', title: 'Remote Version', modified: older }
			];

			const result = mergeTable(local, remote);
			expect(result).toHaveLength(1);
			expect(result[0].title).toBe('Local Version');
			expect(result[0].modified.getTime()).toBe(newer.getTime());
		});

		it('uses local when timestamps are equal (tie-breaker)', () => {
			const timestamp = new Date('2026-01-15T00:00:00Z');

			const local = [
				{ id: '1', title: 'Local Version', modified: timestamp }
			];
			const remote = [
				{ id: '1', title: 'Remote Version', modified: timestamp }
			];

			const result = mergeTable(local, remote);
			expect(result).toHaveLength(1);
			expect(result[0].title).toBe('Local Version');
		});

		it('handles remote with ISO string dates (deserialization)', () => {
			const older = new Date('2026-01-01T00:00:00Z');
			const newer = new Date('2026-01-15T00:00:00Z');

			const local = [
				{ id: '1', title: 'Local Version', modified: older }
			];
			const remote = [
				{ id: '1', title: 'Remote Version', modified: newer.toISOString() as any }
			];

			const result = mergeTable(local, remote);
			expect(result).toHaveLength(1);
			expect(result[0].title).toBe('Remote Version');
			expect(result[0].modified).toBeInstanceOf(Date);
			expect(result[0].modified.getTime()).toBe(newer.getTime());
		});
	});

	describe('Tombstone handling', () => {
		it('preserves remote tombstone when remote is newer', () => {
			const older = new Date('2026-01-01T00:00:00Z');
			const newer = new Date('2026-01-15T00:00:00Z');

			const local = [
				{ id: '1', title: 'Active Item', modified: older, deleted: false }
			];
			const remote = [
				{ id: '1', title: 'Active Item', modified: newer, deleted: true }
			];

			const result = mergeTable(local, remote);
			expect(result).toHaveLength(1);
			expect(result[0].deleted).toBe(true);
			expect(result[0].modified.getTime()).toBe(newer.getTime());
		});

		it('preserves local tombstone when local is newer', () => {
			const older = new Date('2026-01-01T00:00:00Z');
			const newer = new Date('2026-01-15T00:00:00Z');

			const local = [
				{ id: '1', title: 'Active Item', modified: newer, deleted: true }
			];
			const remote = [
				{ id: '1', title: 'Active Item', modified: older, deleted: false }
			];

			const result = mergeTable(local, remote);
			expect(result).toHaveLength(1);
			expect(result[0].deleted).toBe(true);
			expect(result[0].modified.getTime()).toBe(newer.getTime());
		});

		it('uses newer tombstone when both are tombstones', () => {
			const older = new Date('2026-01-01T00:00:00Z');
			const newer = new Date('2026-01-15T00:00:00Z');

			const local = [
				{ id: '1', title: 'Item', modified: older, deleted: true, deletedAt: older }
			];
			const remote = [
				{ id: '1', title: 'Item', modified: newer, deleted: true, deletedAt: newer }
			];

			const result = mergeTable(local, remote);
			expect(result).toHaveLength(1);
			expect(result[0].deleted).toBe(true);
			expect(result[0].modified.getTime()).toBe(newer.getTime());
		});
	});

	describe('Date deserialization', () => {
		it('deserializes remote ISO string dates to Date objects', () => {
			const remote = [
				{
					id: '1',
					title: 'Item',
					modified: '2026-01-15T00:00:00Z',
					created: '2026-01-01T00:00:00Z',
					deletedAt: '2026-01-10T00:00:00Z'
				}
			];

			const result = mergeTable([], remote);
			expect(result).toHaveLength(1);
			expect(result[0].modified).toBeInstanceOf(Date);
			expect(result[0].created).toBeInstanceOf(Date);
			expect(result[0].deletedAt).toBeInstanceOf(Date);
		});

		it('deserializes all DATE_FIELDS (modified, created, deletedAt, startTime, endTime, followUpDate, completedAt)', () => {
			const remote = [
				{
					id: '1',
					title: 'Event Item',
					modified: '2026-01-15T00:00:00Z',
					created: '2026-01-01T00:00:00Z',
					deletedAt: '2026-01-10T00:00:00Z',
					startTime: '2026-02-01T09:00:00Z',
					endTime: '2026-02-01T10:00:00Z',
					followUpDate: '2026-02-05T00:00:00Z',
					completedAt: '2026-01-20T00:00:00Z'
				}
			];

			const result = mergeTable([], remote);
			expect(result).toHaveLength(1);
			expect(result[0].modified).toBeInstanceOf(Date);
			expect(result[0].created).toBeInstanceOf(Date);
			expect(result[0].deletedAt).toBeInstanceOf(Date);
			expect(result[0].startTime).toBeInstanceOf(Date);
			expect(result[0].endTime).toBeInstanceOf(Date);
			expect(result[0].followUpDate).toBeInstanceOf(Date);
			expect(result[0].completedAt).toBeInstanceOf(Date);
		});
	});

	describe('Custom key function', () => {
		it('uses custom keyFn for merge key', () => {
			const local = [
				{ key: 'theme', value: 'dark', modified: new Date('2026-01-01T00:00:00Z') }
			];
			const remote = [
				{ key: 'theme', value: 'light', modified: new Date('2026-01-15T00:00:00Z') }
			];

			const result = mergeTable(
				local,
				remote,
				(record: any) => record.key
			);

			expect(result).toHaveLength(1);
			expect(result[0].key).toBe('theme');
			expect(result[0].value).toBe('light'); // Remote is newer
		});
	});
});

describe('mergePayloads', () => {
	it('merges multiple tables independently', () => {
		const local = {
			items: [
				{ id: '1', title: 'Local Item', modified: new Date('2026-01-01T00:00:00Z') }
			],
			events: [
				{ id: 'e1', title: 'Local Event', modified: new Date('2026-01-01T00:00:00Z') }
			]
		};

		const remote = {
			items: [
				{ id: '2', title: 'Remote Item', modified: new Date('2026-01-01T00:00:00Z') }
			],
			events: [
				{ id: 'e2', title: 'Remote Event', modified: new Date('2026-01-01T00:00:00Z') }
			]
		};

		const result = mergePayloads(local, remote);

		expect(result.items).toHaveLength(2);
		expect(result.events).toHaveLength(2);
	});

	it('uses key field for settings table merge', () => {
		const local = {
			settings: [
				{ key: 'theme', value: 'dark', modified: new Date('2026-01-01T00:00:00Z') }
			]
		};

		const remote = {
			settings: [
				{ key: 'theme', value: 'light', modified: new Date('2026-01-15T00:00:00Z') }
			]
		};

		const result = mergePayloads(local, remote);

		expect(result.settings).toHaveLength(1);
		expect(result.settings[0].key).toBe('theme');
		expect(result.settings[0].value).toBe('light'); // Remote is newer
	});

	it('preserves tables only in local', () => {
		const local = {
			items: [
				{ id: '1', title: 'Local Item', modified: new Date('2026-01-01T00:00:00Z') }
			]
		};

		const remote = {};

		const result = mergePayloads(local, remote);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].id).toBe('1');
	});

	it('adds tables only in remote', () => {
		const local = {};

		const remote = {
			events: [
				{ id: 'e1', title: 'Remote Event', modified: new Date('2026-01-01T00:00:00Z') }
			]
		};

		const result = mergePayloads(local, remote);

		expect(result.events).toHaveLength(1);
		expect(result.events[0].id).toBe('e1');
	});

	it('handles empty tables by returning empty arrays', () => {
		const local = {
			items: []
		};

		const remote = {
			items: []
		};

		const result = mergePayloads(local, remote);

		expect(result.items).toEqual([]);
	});
});

describe('mergeData', () => {
	it('delegates to mergePayloads', () => {
		const local = {
			items: [
				{ id: '1', title: 'Local Item', modified: new Date('2026-01-01T00:00:00Z') }
			]
		};

		const remote = {
			items: [
				{ id: '2', title: 'Remote Item', modified: new Date('2026-01-01T00:00:00Z') }
			]
		};

		const result = mergeData(local, remote);

		expect(result.items).toHaveLength(2);
		const ids = result.items.map((r: any) => r.id).sort();
		expect(ids).toEqual(['1', '2']);
	});
});
