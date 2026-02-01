import { db, type QueuedFeedback } from './schema';

/**
 * Queue a feedback submission for later sending (offline support)
 */
export async function queueFeedback(feedback: Omit<QueuedFeedback, 'id' | 'timestamp' | 'retryCount'>): Promise<number> {
	const id = await db.feedbackQueue.add({
		...feedback,
		timestamp: Date.now(),
		retryCount: 0
	});
	return id as number;
}

/**
 * Get count of queued (unsent) feedback items
 */
export async function getQueuedCount(): Promise<number> {
	return db.feedbackQueue.count();
}

/**
 * Attempt to send all queued feedback submissions.
 * Called by service worker on sync event or manually on reconnect.
 * Returns number of successfully sent items.
 */
export async function syncQueuedFeedback(): Promise<number> {
	const queued = await db.feedbackQueue.toArray();
	let sentCount = 0;

	for (const item of queued) {
		// Skip items with too many retries (> 5)
		if (item.retryCount > 5) {
			await db.feedbackQueue.delete(item.id!);
			continue;
		}

		try {
			const response = await fetch('/.netlify/functions/feedback-submit', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: item.type,
					description: item.description,
					email: item.email || undefined,
					screenshot: item.screenshot || undefined,
					botField: ''
				})
			});

			if (response.ok) {
				await db.feedbackQueue.delete(item.id!);
				sentCount++;
			} else {
				await db.feedbackQueue.update(item.id!, {
					retryCount: item.retryCount + 1
				});
			}
		} catch (err) {
			console.warn('Failed to sync feedback item:', item.id, err);
			await db.feedbackQueue.update(item.id!, {
				retryCount: item.retryCount + 1
			});
		}
	}

	return sentCount;
}

/**
 * Register for background sync (Chrome/Edge only - progressive enhancement)
 */
export async function registerFeedbackSync(): Promise<void> {
	if ('serviceWorker' in navigator && 'SyncManager' in window) {
		try {
			const registration = await navigator.serviceWorker.ready;
			await (registration as any).sync.register('sync-feedback');
		} catch (err) {
			console.warn('Background sync registration failed:', err);
		}
	}
}
