import { db, type GTDItem } from './schema';

/**
 * Tokenize text into searchable words.
 * Splits on whitespace, lowercases, removes short words (< 2 chars), and deduplicates.
 */
export function tokenize(text: string): string[] {
	if (!text) return [];

	const words = text
		.toLowerCase()
		.split(/\s+/)
		.filter(word => word.length >= 2);

	// Deduplicate
	return Array.from(new Set(words));
}

/**
 * Search items by query string using full-text search on searchWords index.
 * Returns up to 20 results, active types only, sorted by modified date descending.
 */
export async function searchItems(query: string): Promise<GTDItem[]> {
	if (!query.trim()) return [];

	const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length >= 2);
	if (queryWords.length === 0) return [];

	const firstWord = queryWords[0];

	// Query using prefix matching on the multi-valued searchWords index
	// Fall back to full scan if index query fails (e.g. corrupt records)
	let results: GTDItem[];
	try {
		results = await db.items
			.where('searchWords')
			.startsWithIgnoreCase(firstWord)
			.toArray();
	} catch {
		// Fallback: scan all items and match against title+notes
		const allItems = await db.items.toArray();
		results = allItems.filter(item => {
			const text = `${item.title} ${item.notes}`.toLowerCase();
			return text.includes(firstWord);
		});
	}

	// Filter to active types only
	const activeTypes: GTDItem['type'][] = ['inbox', 'next-action', 'project', 'waiting'];
	results = results.filter(item => activeTypes.includes(item.type));

	// If multiple query words, further filter by checking all words against title+notes
	if (queryWords.length > 1) {
		results = results.filter(item => {
			const fullText = `${item.title} ${item.notes}`.toLowerCase();
			return queryWords.every(word => fullText.includes(word));
		});
	}

	// Sort by modified date descending (most recent first)
	results.sort((a, b) => b.modified.getTime() - a.modified.getTime());

	// Limit to 20 results
	return results.slice(0, 20);
}
