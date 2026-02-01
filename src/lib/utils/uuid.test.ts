import { describe, it, expect } from 'vitest';
import { generateUUID } from './uuid';

describe('generateUUID', () => {
	it('generates a valid UUID v4 format', () => {
		const uuid = generateUUID();

		// UUID v4 format: xxxxxxxx-xxxx-4xxx-[89ab]xxx-xxxxxxxxxxxx
		const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

		expect(uuid).toMatch(uuidV4Regex);
	});

	it('generates unique UUIDs', () => {
		const uuid1 = generateUUID();
		const uuid2 = generateUUID();

		expect(uuid1).not.toBe(uuid2);
	});

	it('crypto.randomUUID is available in browser mode', () => {
		// This test proves browser mode is working
		// crypto.randomUUID is only available in browsers, not Node.js < 19
		expect(typeof crypto.randomUUID).toBe('function');
	});
});
