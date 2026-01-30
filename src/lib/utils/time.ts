/**
 * Format a date as relative time (e.g., "2 hours ago", "yesterday", "in 3 days")
 * Uses Intl.RelativeTimeFormat for localized, human-readable output.
 */
export function formatRelativeTime(date: Date): string {
	const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto', style: 'long' });
	const now = new Date();
	const diffMs = date.getTime() - now.getTime();
	const diffSecs = Math.round(diffMs / 1000);

	// Just now (< 1 minute)
	if (Math.abs(diffSecs) < 60) {
		return 'just now';
	}

	// Minutes
	const diffMins = Math.round(diffSecs / 60);
	if (Math.abs(diffMins) < 60) {
		return rtf.format(diffMins, 'minute');
	}

	// Hours
	const diffHours = Math.round(diffSecs / 3600);
	if (Math.abs(diffHours) < 24) {
		return rtf.format(diffHours, 'hour');
	}

	// Days
	const diffDays = Math.round(diffSecs / 86400);
	if (Math.abs(diffDays) < 7) {
		return rtf.format(diffDays, 'day');
	}

	// Weeks
	if (Math.abs(diffDays) < 30) {
		const diffWeeks = Math.round(diffDays / 7);
		return rtf.format(diffWeeks, 'week');
	}

	// For older dates, just show the formatted date
	return date.toLocaleDateString();
}

export function getTimeSinceLastReview(lastReview: Date | null): string {
	if (!lastReview) return 'Never completed';

	const now = new Date();
	const diffMs = now.getTime() - lastReview.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	if (diffDays === 0) return 'Today';
	if (diffDays === 1) return 'Yesterday';
	if (diffDays < 7) return `${diffDays} days ago`;
	if (diffDays === 7) return '1 week ago';
	if (diffDays < 14) return 'Last week';
	if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

	const diffMonths = Math.floor(diffDays / 30);
	return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`;
}
