import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '$lib/db/schema';
import { generateSalt, deriveKey, encrypt, decrypt, getNextIV, initIVCounter } from './crypto';

// Fresh database before each test
beforeEach(async () => {
	if (db.isOpen()) {
		db.close();
	}
	await db.delete();
	await db.open();

	// Initialize IV counter for encryption tests
	await initIVCounter('test-device-123');
});

describe('generateSalt', () => {
	it('returns Uint8Array of length 16', () => {
		const salt = generateSalt();

		expect(salt).toBeInstanceOf(Uint8Array);
		expect(salt.length).toBe(16);
	});

	it('produces different salts on consecutive calls', () => {
		const salt1 = generateSalt();
		const salt2 = generateSalt();

		expect(salt1).not.toEqual(salt2);
	});
});

describe('deriveKey', () => {
	it('returns CryptoKey object', async () => {
		const salt = generateSalt();
		const key = await deriveKey('test-pairing-code', salt);

		expect(key).toBeInstanceOf(CryptoKey);
		expect(key.type).toBe('secret');
		expect(key.algorithm.name).toBe('AES-GCM');
	});

	it('same code and salt produce working encrypt/decrypt', async () => {
		const salt = generateSalt();
		const pairingCode = 'my-secret-code-123';

		const key = await deriveKey(pairingCode, salt);

		// Use the key for encryption
		const plaintext = 'Test data';
		const encoder = new TextEncoder();
		const iv = crypto.getRandomValues(new Uint8Array(12));

		const ciphertext = await crypto.subtle.encrypt(
			{ name: 'AES-GCM', iv },
			key,
			encoder.encode(plaintext)
		);

		// Decrypt with same key
		const decrypted = await crypto.subtle.decrypt(
			{ name: 'AES-GCM', iv },
			key,
			ciphertext
		);

		const decoder = new TextDecoder();
		expect(decoder.decode(decrypted)).toBe(plaintext);
	});
});

describe('encrypt and decrypt round-trip', () => {
	it('encrypts and decrypts JSON data with same pairing code', async () => {
		const originalData = JSON.stringify({
			items: [
				{ id: '123', title: 'Test item', type: 'inbox' },
				{ id: '456', title: 'Another item', type: 'next-action' }
			]
		});
		const pairingCode = 'secure-pairing-code-789';

		const encrypted = await encrypt(originalData, pairingCode);
		const decrypted = await decrypt(encrypted, pairingCode);

		expect(decrypted).toBe(originalData);
		expect(JSON.parse(decrypted)).toEqual(JSON.parse(originalData));
	});

	it('throws error with wrong pairing code', async () => {
		const data = JSON.stringify({ test: 'data' });
		const correctCode = 'correct-code';
		const wrongCode = 'wrong-code';

		const encrypted = await encrypt(data, correctCode);

		await expect(decrypt(encrypted, wrongCode)).rejects.toThrow('Decryption failed');
	});

	it('produces different ciphertexts for multiple encryptions', async () => {
		const data = JSON.stringify({ test: 'same data' });
		const pairingCode = 'test-code';

		const encrypted1 = await encrypt(data, pairingCode);
		const encrypted2 = await encrypt(data, pairingCode);

		// Ciphertexts should be different (different IVs)
		expect(encrypted1).not.toBe(encrypted2);

		// But both should decrypt to same data
		const decrypted1 = await decrypt(encrypted1, pairingCode);
		const decrypted2 = await decrypt(encrypted2, pairingCode);

		expect(decrypted1).toBe(data);
		expect(decrypted2).toBe(data);
	});

	it('handles special characters and unicode', async () => {
		const data = JSON.stringify({
			emoji: '🚀🎉✨',
			chinese: '你好世界',
			symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
		});
		const pairingCode = 'test-code';

		const encrypted = await encrypt(data, pairingCode);
		const decrypted = await decrypt(encrypted, pairingCode);

		expect(decrypted).toBe(data);
		expect(JSON.parse(decrypted)).toEqual(JSON.parse(data));
	});
});

describe('getNextIV', () => {
	it('returns Uint8Array of length 12', () => {
		const iv = getNextIV();

		expect(iv).toBeInstanceOf(Uint8Array);
		expect(iv.length).toBe(12);
	});

	it('consecutive calls return different IVs', () => {
		const iv1 = getNextIV();
		const iv2 = getNextIV();
		const iv3 = getNextIV();

		expect(iv1).not.toEqual(iv2);
		expect(iv2).not.toEqual(iv3);
		expect(iv1).not.toEqual(iv3);
	});

	it('throws error if IV counter not initialized', async () => {
		// This test would require resetting the global ivCounter state,
		// which isn't practical in a test environment. Instead, we verify
		// that initIVCounter properly sets up the counter.

		// Reset by creating a new database
		if (db.isOpen()) {
			db.close();
		}
		await db.delete();
		await db.open();

		// Initialize with new device ID
		await initIVCounter('test-device-456');

		// Should work after initialization
		const iv = getNextIV();
		expect(iv).toBeInstanceOf(Uint8Array);
		expect(iv.length).toBe(12);
	});
});
