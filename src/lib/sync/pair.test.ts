import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '$lib/db/schema';
import {
	generatePairingCode,
	validatePairingCode,
	normalizePairingCode,
	formatPairingCode,
	hashPairingCode,
	savePairingInfo,
	loadPairingInfo,
	clearPairingInfo
} from './pair';

// Fresh database before each test
beforeEach(async () => {
	if (db.isOpen()) {
		db.close();
	}
	await db.delete();
	await db.open();
});

describe('generatePairingCode', () => {
	it('returns string in XXX-XXX format', () => {
		const code = generatePairingCode();
		expect(code).toMatch(/^[A-Z2-9]{3}-[A-Z2-9]{3}$/);
	});

	it('does NOT contain ambiguous characters (0, O, 1, I)', () => {
		// Generate multiple codes to increase confidence
		// Charset is ABCDEFGHJKLMNPQRSTUVWXYZ23456789 (excludes 0, O, 1, I)
		for (let i = 0; i < 20; i++) {
			const code = generatePairingCode();
			expect(code).not.toMatch(/[01OI]/);
		}
	});

	it('produces different codes on consecutive calls', () => {
		const code1 = generatePairingCode();
		const code2 = generatePairingCode();
		// Extremely unlikely (1 in ~900M) that two random codes match
		expect(code1).not.toBe(code2);
	});
});

describe('validatePairingCode', () => {
	it('returns true for valid formatted code', () => {
		expect(validatePairingCode('ABC-DEF')).toBe(true);
	});

	it('returns true for valid unformatted code', () => {
		expect(validatePairingCode('ABCDEF')).toBe(true);
	});

	it('returns true for lowercase input (normalizes internally)', () => {
		expect(validatePairingCode('abc-def')).toBe(true);
	});

	it('returns true for mixed-case code with digits from charset', () => {
		expect(validatePairingCode('ab2-3ef')).toBe(true);
	});

	it('returns false for too-short code', () => {
		expect(validatePairingCode('ABC')).toBe(false);
	});

	it('returns false for too-long code', () => {
		expect(validatePairingCode('ABCDEFGH')).toBe(false);
	});

	it('returns false for code with ambiguous char zero', () => {
		expect(validatePairingCode('ABC-0EF')).toBe(false);
	});

	it('returns false for code with ambiguous char I', () => {
		expect(validatePairingCode('ABC-IEF')).toBe(false);
	});

	it('returns false for empty string', () => {
		expect(validatePairingCode('')).toBe(false);
	});

	it('returns false for non-alphanumeric chars', () => {
		expect(validatePairingCode('ABC-!@#')).toBe(false);
	});
});

describe('normalizePairingCode', () => {
	it('strips dashes and uppercases', () => {
		expect(normalizePairingCode('abc-def')).toBe('ABCDEF');
	});

	it('strips whitespace', () => {
		expect(normalizePairingCode('ABC DEF')).toBe('ABCDEF');
	});

	it('throws for wrong length', () => {
		expect(() => normalizePairingCode('ABC')).toThrow('Pairing code must be 6 characters');
	});

	it('throws for invalid characters (zero not in charset)', () => {
		expect(() => normalizePairingCode('ABC0EF')).toThrow('Pairing code contains invalid characters');
	});

	it('throws for invalid characters (I not in charset)', () => {
		expect(() => normalizePairingCode('ABCIEF')).toThrow('Pairing code contains invalid characters');
	});
});

describe('formatPairingCode', () => {
	it('formats 6-char string as XXX-XXX', () => {
		expect(formatPairingCode('ABCDEF')).toBe('ABC-DEF');
	});

	it('returns unformatted if not exactly 6 chars', () => {
		expect(formatPairingCode('ABC')).toBe('ABC');
		expect(formatPairingCode('ABCDEFGH')).toBe('ABCDEFGH');
	});

	it('handles already-formatted input (strips dash, re-formats)', () => {
		expect(formatPairingCode('ABC-DEF')).toBe('ABC-DEF');
	});

	it('uppercases during formatting', () => {
		expect(formatPairingCode('abcdef')).toBe('ABC-DEF');
	});
});

describe('hashPairingCode', () => {
	it('returns 64-character hex string (SHA-256)', async () => {
		const hash = await hashPairingCode('ABC-DEF');
		expect(hash).toMatch(/^[0-9a-f]{64}$/);
	});

	it('same input produces same hash (deterministic)', async () => {
		const hash1 = await hashPairingCode('ABC-DEF');
		const hash2 = await hashPairingCode('ABC-DEF');
		expect(hash1).toBe(hash2);
	});

	it('different inputs produce different hashes', async () => {
		const hash1 = await hashPairingCode('ABC-DEF');
		const hash2 = await hashPairingCode('GHJ-KMN');
		expect(hash1).not.toBe(hash2);
	});

	it('normalizes input before hashing (case-insensitive)', async () => {
		const hash1 = await hashPairingCode('abc-def');
		const hash2 = await hashPairingCode('ABCDEF');
		expect(hash1).toBe(hash2);
	});
});

describe('savePairingInfo / loadPairingInfo / clearPairingInfo', () => {
	it('savePairingInfo stores deviceId (hash) and pairedAt in settings', async () => {
		await savePairingInfo('ABC-DEF');
		const info = await loadPairingInfo();
		expect(info).not.toBeNull();
		expect(info!.deviceId).toMatch(/^[0-9a-f]{64}$/);
		expect(info!.pairedAt).toBeInstanceOf(Date);
	});

	it('loadPairingInfo returns stored pairing info with correct types', async () => {
		await savePairingInfo('GHJ-KMN');
		const info = await loadPairingInfo();
		expect(info).not.toBeNull();
		expect(typeof info!.deviceId).toBe('string');
		expect(info!.deviceId.length).toBe(64);
		expect(info!.pairedAt).toBeInstanceOf(Date);
		// pairedAt should be a recent date (within last minute)
		const now = Date.now();
		expect(now - info!.pairedAt.getTime()).toBeLessThan(60000);
	});

	it('loadPairingInfo returns null when no pairing info stored', async () => {
		const info = await loadPairingInfo();
		expect(info).toBeNull();
	});

	it('clearPairingInfo removes pairing info', async () => {
		await savePairingInfo('ABC-DEF');
		const before = await loadPairingInfo();
		expect(before).not.toBeNull();

		await clearPairingInfo();
		const after = await loadPairingInfo();
		expect(after).toBeNull();
	});

	it('round-trip: save then load returns matching deviceId', async () => {
		const expectedHash = await hashPairingCode('ABC-DEF');
		await savePairingInfo('ABC-DEF');
		const info = await loadPairingInfo();
		expect(info!.deviceId).toBe(expectedHash);
	});
});
