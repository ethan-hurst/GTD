/**
 * Client-side cryptography for device sync
 * Uses Web Crypto API for AES-GCM encryption and PBKDF2 key derivation
 */

import { getSetting, setSetting } from '$lib/db/operations';

const SALT_LENGTH = 16; // 128 bits
const IV_LENGTH = 12; // 96 bits for AES-GCM
const PBKDF2_ITERATIONS = 100000;
const AES_KEY_LENGTH = 256;

// Global counter state
let ivCounter: bigint | null = null;
let devicePrefix: Uint8Array | null = null;

/**
 * Initialize IV counter with device-specific prefix
 * Must be called before any encryption operations
 */
export async function initIVCounter(deviceId: string): Promise<void> {
	// Generate device prefix from hashed device ID (first 4 bytes)
	const encoder = new TextEncoder();
	const deviceIdHash = await crypto.subtle.digest('SHA-256', encoder.encode(deviceId));
	devicePrefix = new Uint8Array(deviceIdHash.slice(0, 4));

	// Load counter from IndexedDB or initialize to 0
	const storedCounter = await getSetting('sync-iv-counter');
	ivCounter = storedCounter !== null ? BigInt(storedCounter) : BigInt(0);
}

/**
 * Generate random salt for key derivation
 */
export function generateSalt(): Uint8Array {
	const buffer = new ArrayBuffer(SALT_LENGTH);
	return crypto.getRandomValues(new Uint8Array(buffer));
}

/**
 * Derive AES-GCM key from pairing code using PBKDF2
 */
export async function deriveKey(pairingCode: string, salt: Uint8Array): Promise<CryptoKey> {
	const encoder = new TextEncoder();
	const keyMaterial = await crypto.subtle.importKey(
		'raw',
		encoder.encode(pairingCode),
		'PBKDF2',
		false,
		['deriveKey']
	);

	return await crypto.subtle.deriveKey(
		{
			name: 'PBKDF2',
			salt: salt as BufferSource,
			iterations: PBKDF2_ITERATIONS,
			hash: 'SHA-256'
		},
		keyMaterial,
		{
			name: 'AES-GCM',
			length: AES_KEY_LENGTH
		},
		false,
		['encrypt', 'decrypt']
	);
}

/**
 * Get next IV using counter-based generation
 * Counter is persisted to IndexedDB to prevent reuse
 */
export function getNextIV(): Uint8Array {
	if (ivCounter === null || devicePrefix === null) {
		throw new Error('IV counter not initialized. Call initIVCounter() first.');
	}

	// Increment counter
	ivCounter = ivCounter + BigInt(1);

	// Persist counter to IndexedDB (fire and forget - performance optimization)
	setSetting('sync-iv-counter', ivCounter.toString()).catch(err => {
		console.error('Failed to persist IV counter:', err);
	});

	// Create 12-byte IV: [4 bytes device prefix][8 bytes counter]
	const buffer = new ArrayBuffer(IV_LENGTH);
	const iv = new Uint8Array(buffer);
	iv.set(devicePrefix, 0);

	// Convert counter to 8-byte big-endian
	const view = new DataView(buffer);
	view.setBigUint64(4, ivCounter, false); // false = big-endian

	return iv;
}

/**
 * Convert Uint8Array to base64 string
 */
function arrayToBase64(array: Uint8Array): string {
	return btoa(String.fromCharCode(...array));
}

/**
 * Convert base64 string to Uint8Array
 */
function base64ToArray(base64: string): Uint8Array {
	const binary = atob(base64);
	const length = binary.length;
	const buffer = new ArrayBuffer(length);
	const array = new Uint8Array(buffer);
	for (let i = 0; i < length; i++) {
		array[i] = binary.charCodeAt(i);
	}
	return array;
}

/**
 * Encrypt data with AES-GCM
 * Returns JSON string with salt, iv, and ciphertext (all base64-encoded)
 */
export async function encrypt(data: string, pairingCode: string): Promise<string> {
	try {
		// Generate salt and derive key
		const salt = generateSalt();
		const key = await deriveKey(pairingCode, salt);

		// Get next IV
		const iv = getNextIV();

		// Encode and encrypt data
		const encoder = new TextEncoder();
		const encodedData = encoder.encode(data);
		const ciphertext = await crypto.subtle.encrypt(
			{ name: 'AES-GCM', iv: iv as BufferSource },
			key,
			encodedData
		);

		// Return encrypted blob as JSON
		return JSON.stringify({
			salt: arrayToBase64(salt),
			iv: arrayToBase64(iv),
			ciphertext: arrayToBase64(new Uint8Array(ciphertext))
		});
	} catch (err) {
		throw new Error(`Encryption failed: ${err instanceof Error ? err.message : String(err)}`);
	}
}

/**
 * Decrypt data with AES-GCM
 * Takes JSON string with salt, iv, and ciphertext (all base64-encoded)
 */
export async function decrypt(encryptedBlob: string, pairingCode: string): Promise<string> {
	try {
		// Parse encrypted blob
		const { salt: saltB64, iv: ivB64, ciphertext: ciphertextB64 } = JSON.parse(encryptedBlob);

		// Decode base64
		const salt = base64ToArray(saltB64);
		const iv = base64ToArray(ivB64);
		const ciphertext = base64ToArray(ciphertextB64);

		// Derive key
		const key = await deriveKey(pairingCode, salt);

		// Decrypt
		const decrypted = await crypto.subtle.decrypt(
			{ name: 'AES-GCM', iv: iv as BufferSource },
			key,
			ciphertext as BufferSource
		);

		// Decode plaintext
		const decoder = new TextDecoder();
		return decoder.decode(decrypted);
	} catch (err) {
		throw new Error(`Decryption failed - wrong pairing code? ${err instanceof Error ? err.message : String(err)}`);
	}
}
