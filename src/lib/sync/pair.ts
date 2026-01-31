/**
 * Pairing code generation and validation for device sync
 * Pairing codes are 6-character alphanumeric codes used as shared secrets
 */

import { getSetting, setSetting } from '$lib/db/operations';

// Unambiguous character set (no 0/O, 1/I/L)
const PAIRING_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PAIRING_LENGTH = 6;

/**
 * Generate random 6-character pairing code
 * Returns formatted as XXX-XXX for display
 */
export function generatePairingCode(): string {
	const buffer = new ArrayBuffer(PAIRING_LENGTH);
	const random = crypto.getRandomValues(new Uint8Array(buffer));

	let code = '';
	for (let i = 0; i < PAIRING_LENGTH; i++) {
		const index = random[i] % PAIRING_CHARS.length;
		code += PAIRING_CHARS[index];
	}

	return formatPairingCode(code);
}

/**
 * Validate pairing code format
 */
export function validatePairingCode(code: string): boolean {
	try {
		const normalized = normalizePairingCode(code);
		return normalized.length === PAIRING_LENGTH &&
			[...normalized].every(char => PAIRING_CHARS.includes(char));
	} catch {
		return false;
	}
}

/**
 * Normalize pairing code (strip dashes, whitespace, uppercase)
 */
export function normalizePairingCode(code: string): string {
	const cleaned = code.replace(/[-\s]/g, '').toUpperCase();

	if (cleaned.length !== PAIRING_LENGTH) {
		throw new Error(`Pairing code must be ${PAIRING_LENGTH} characters`);
	}

	if (![...cleaned].every(char => PAIRING_CHARS.includes(char))) {
		throw new Error('Pairing code contains invalid characters');
	}

	return cleaned;
}

/**
 * Format pairing code for display (XXX-XXX)
 */
export function formatPairingCode(code: string): string {
	const cleaned = code.replace(/[-\s]/g, '').toUpperCase();
	if (cleaned.length !== PAIRING_LENGTH) {
		return cleaned;
	}
	return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
}

/**
 * Hash pairing code to generate device ID for blob storage
 * Returns hex string (64 chars)
 */
export async function hashPairingCode(pairingCode: string): Promise<string> {
	const normalized = normalizePairingCode(pairingCode);
	const encoder = new TextEncoder();
	const data = encoder.encode(normalized);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);

	// Convert to hex string
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Store pairing info in IndexedDB
 * Does NOT store raw pairing code (security: avoid plaintext exposure)
 */
export async function savePairingInfo(pairingCode: string): Promise<void> {
	const deviceId = await hashPairingCode(pairingCode);
	await setSetting('sync-pairing', {
		deviceId,
		pairedAt: new Date().toISOString()
	});
}

/**
 * Load pairing info from IndexedDB
 */
export async function loadPairingInfo(): Promise<{ deviceId: string; pairedAt: Date } | null> {
	const info = await getSetting('sync-pairing');
	if (!info) {
		return null;
	}

	return {
		deviceId: info.deviceId,
		pairedAt: new Date(info.pairedAt)
	};
}

/**
 * Clear pairing info (unpair device)
 */
export async function clearPairingInfo(): Promise<void> {
	await setSetting('sync-pairing', null);
}
