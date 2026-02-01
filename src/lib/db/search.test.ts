/**
 * Unit tests for search tokenization
 */

import { describe, it, expect } from 'vitest';
import { tokenize } from './search';

describe('tokenize', () => {
	it('returns empty array for empty string', () => {
		expect(tokenize('')).toEqual([]);
	});

	it('returns empty array for null/undefined input', () => {
		expect(tokenize(null as any)).toEqual([]);
		expect(tokenize(undefined as any)).toEqual([]);
	});

	it('returns single word lowercased when >= 2 chars', () => {
		expect(tokenize('Hello')).toEqual(['hello']);
		expect(tokenize('Test')).toEqual(['test']);
	});

	it('filters out words < 2 chars', () => {
		expect(tokenize('a')).toEqual([]);
		expect(tokenize('I am a developer')).toEqual(['am', 'developer']);
		expect(tokenize('Go to store')).toEqual(['go', 'to', 'store']);
	});

	it('splits multiple words on whitespace', () => {
		expect(tokenize('Hello World')).toEqual(['hello', 'world']);
		expect(tokenize('Quick brown fox')).toEqual(['quick', 'brown', 'fox']);
	});

	it('deduplicates words', () => {
		expect(tokenize('hello hello world')).toEqual(['hello', 'world']);
		expect(tokenize('test test test')).toEqual(['test']);
	});

	it('lowercases mixed case input', () => {
		expect(tokenize('Hello WORLD Test')).toEqual(['hello', 'world', 'test']);
		expect(tokenize('CamelCase kebab-case')).toEqual(['camelcase', 'kebab-case']);
	});

	it('handles extra whitespace', () => {
		expect(tokenize('  hello   world  ')).toEqual(['hello', 'world']);
		expect(tokenize('test\t\ttabs\n\nnewlines')).toEqual(['test', 'tabs', 'newlines']);
	});

	it('tokenizes realistic GTD content', () => {
		const input = 'Call dentist to schedule annual checkup for next month';
		const result = tokenize(input);

		expect(result).toContain('call');
		expect(result).toContain('dentist');
		expect(result).toContain('to'); // 2 chars - included
		expect(result).toContain('schedule');
		expect(result).toContain('annual');
		expect(result).toContain('checkup');
		expect(result).toContain('for');
		expect(result).toContain('next');
		expect(result).toContain('month');

		// All words are >= 2 chars (tokenize filters < 2)
		expect(result.every(w => w.length >= 2)).toBe(true);

		// Deduplicated and lowercased
		expect(result.length).toBe(new Set(result).size);
		expect(result).toEqual(result.map(w => w.toLowerCase()));
	});

	it('handles project names with punctuation', () => {
		const input = 'Project: Build React/Next.js dashboard';
		const result = tokenize(input);

		// Punctuation becomes part of the token since we split on whitespace
		expect(result).toContain('project:');
		expect(result).toContain('build');
		expect(result).toContain('react/next.js');
		expect(result).toContain('dashboard');
	});

	it('handles empty tokens after filtering', () => {
		// All single-char words
		expect(tokenize('a b c d e')).toEqual([]);

		// Mixed with multi-char
		expect(tokenize('a test b example c')).toEqual(['test', 'example']);
	});
});
