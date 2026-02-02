/**
 * Reactive auth state store (Svelte 5 runes)
 * Manages Outlook authentication state and user profile
 */

import { getMsalInstance, getAuthenticatedAccount, loginWithMsal, logoutFromMsal } from '$lib/services/graph/auth';
import { db } from '$lib/db/schema';

class AuthStore {
	isAuthenticated = $state(false);
	isLoading = $state(false);
	userName = $state<string | null>(null);
	userEmail = $state<string | null>(null);
	error = $state<string | null>(null);

	/**
	 * Initialize auth state from MSAL.
	 * Should be called once on app startup.
	 * SSR-safe (guards with window check).
	 */
	async init(): Promise<void> {
		// SSR safety
		if (typeof window === 'undefined') return;

		try {
			this.isLoading = true;
			this.error = null;

			// Ensure MSAL is initialized and redirect promise is handled
			await getMsalInstance();

			// Check if user is already authenticated
			const account = await getAuthenticatedAccount();

			if (account) {
				this.isAuthenticated = true;
				this.userName = account.name || null;
				this.userEmail = account.username || null;
			}
		} catch (err) {
			console.error('Auth init failed:', err);
			this.error = err instanceof Error ? err.message : 'Authentication initialization failed';
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Connect to Outlook.
	 * Triggers redirect flow - page will reload after authentication.
	 */
	async connect(): Promise<void> {
		try {
			this.isLoading = true;
			this.error = null;

			// Trigger MSAL login redirect
			await loginWithMsal();
			// Note: This will redirect - code after this won't execute
		} catch (err) {
			console.error('Outlook connect failed:', err);
			this.error = err instanceof Error ? err.message : 'Failed to connect to Outlook';
			this.isLoading = false;
		}
	}

	/**
	 * Disconnect from Outlook.
	 * Clears Outlook calendar data and triggers MSAL logout redirect.
	 */
	async disconnect(): Promise<void> {
		try {
			this.isLoading = true;
			this.error = null;

			// Clean up Outlook data from IndexedDB
			// Delete all calendar events from Outlook
			await db.events.where('syncSource').equals('outlook').delete();

			// Clear all sync metadata (delta links, calendar info)
			await db.syncMeta.clear();

			// Trigger MSAL logout redirect
			await logoutFromMsal();
			// Note: This will redirect - code after this won't execute

		} catch (err) {
			console.error('Outlook disconnect failed:', err);
			this.error = err instanceof Error ? err.message : 'Failed to disconnect from Outlook';
			this.isLoading = false;
		}
	}

	/**
	 * Clear error state.
	 */
	clearError(): void {
		this.error = null;
	}
}

export const authState = new AuthStore();
