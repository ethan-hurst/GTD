/**
 * Unit tests for time formatting utilities
 */

import { describe, it, expect } from 'vitest';
import { formatRelativeTime, getTimeSinceLastReview } from './time';

describe('getTimeSinceLastReview', () => {
	it('returns "Never completed" for null input', () => {
		expect(getTimeSinceLastReview(null)).toBe('Never completed');
	});

	it('returns "Today" for today\'s date', () => {
		const today = new Date();
		expect(getTimeSinceLastReview(today)).toBe('Today');
	});

	it('returns "Yesterday" for yesterday', () => {
		const yesterday = new Date(Date.now() - 1 * 86400000);
		expect(getTimeSinceLastReview(yesterday)).toBe('Yesterday');
	});

	it('returns "3 days ago" for 3 days ago', () => {
		const threeDaysAgo = new Date(Date.now() - 3 * 86400000);
		expect(getTimeSinceLastReview(threeDaysAgo)).toBe('3 days ago');
	});

	it('returns "1 week ago" for 7 days ago', () => {
		const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
		expect(getTimeSinceLastReview(sevenDaysAgo)).toBe('1 week ago');
	});

	it('returns "Last week" for 10 days ago', () => {
		const tenDaysAgo = new Date(Date.now() - 10 * 86400000);
		expect(getTimeSinceLastReview(tenDaysAgo)).toBe('Last week');
	});

	it('returns "3 weeks ago" for 21 days ago', () => {
		const threeWeeksAgo = new Date(Date.now() - 21 * 86400000);
		expect(getTimeSinceLastReview(threeWeeksAgo)).toBe('3 weeks ago');
	});

	it('returns "1 month ago" for 31 days ago', () => {
		const oneMonthAgo = new Date(Date.now() - 31 * 86400000);
		expect(getTimeSinceLastReview(oneMonthAgo)).toBe('1 month ago');
	});

	it('returns "2 months ago" for 65 days ago', () => {
		const twoMonthsAgo = new Date(Date.now() - 65 * 86400000);
		expect(getTimeSinceLastReview(twoMonthsAgo)).toBe('2 months ago');
	});
});

describe('formatRelativeTime', () => {
	it('returns "just now" for date very close to now', () => {
		const now = new Date();
		expect(formatRelativeTime(now)).toBe('just now');

		const fewSecondsAgo = new Date(Date.now() - 30000); // 30 seconds
		expect(formatRelativeTime(fewSecondsAgo)).toBe('just now');
	});

	it('returns time with "minute" for date 5 minutes ago', () => {
		const fiveMinutesAgo = new Date(Date.now() - 5 * 60000);
		const result = formatRelativeTime(fiveMinutesAgo);

		expect(result).toMatch(/minute/i);
	});

	it('returns time with "hour" for date 3 hours ago', () => {
		const threeHoursAgo = new Date(Date.now() - 3 * 3600000);
		const result = formatRelativeTime(threeHoursAgo);

		expect(result).toMatch(/hour/i);
	});

	it('returns time with "day" or "yesterday" for date 2 days ago', () => {
		const twoDaysAgo = new Date(Date.now() - 2 * 86400000);
		const result = formatRelativeTime(twoDaysAgo);

		// Could be "2 days ago" or "yesterday" depending on exact timing
		expect(result).toMatch(/day|yesterday/i);
	});

	it('returns time with "week" for date 10 days ago', () => {
		const tenDaysAgo = new Date(Date.now() - 10 * 86400000);
		const result = formatRelativeTime(tenDaysAgo);

		expect(result).toMatch(/week/i);
	});

	it('returns formatted date for date 40 days ago', () => {
		const fortyDaysAgo = new Date(Date.now() - 40 * 86400000);
		const result = formatRelativeTime(fortyDaysAgo);

		// Should return locale date string (e.g., "12/22/2025")
		// Just verify it's not a relative time phrase
		expect(result).not.toMatch(/just now|minute|hour|day|week/i);
	});

	it('handles future dates', () => {
		const tomorrow = new Date(Date.now() + 86400000);
		const result = formatRelativeTime(tomorrow);

		// Should return relative time or formatted date
		expect(typeof result).toBe('string');
		expect(result.length).toBeGreaterThan(0);
	});
});
