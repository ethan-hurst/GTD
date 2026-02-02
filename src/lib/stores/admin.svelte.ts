export class AdminStore {
	password = $state('');
	authenticated = $state(false);

	restoreSession() {
		if (typeof window === 'undefined') return;
		const stored = sessionStorage.getItem('admin_password');
		if (stored) {
			this.password = stored;
			this.authenticated = true;
		}
	}

	async authenticate(pwd: string): Promise<{ ok: boolean; error?: string }> {
		try {
			const response = await fetch('/.netlify/functions/feedback-query', {
				headers: {
					Authorization: `Basic ${btoa(`admin:${pwd}`)}`
				}
			});

			if (response.status === 401) {
				return { ok: false, error: 'Invalid password' };
			}

			if (response.status === 503) {
				return { ok: false, error: 'Admin not configured. Set ANALYTICS_PASSWORD in Netlify.' };
			}

			if (!response.ok) {
				return { ok: false, error: 'Authentication failed' };
			}

			this.password = pwd;
			this.authenticated = true;
			sessionStorage.setItem('admin_password', pwd);
			return { ok: true };
		} catch {
			return { ok: false, error: 'Network error. Please try again.' };
		}
	}

	signOut() {
		this.password = '';
		this.authenticated = false;
		sessionStorage.removeItem('admin_password');
	}

	getAuthHeader(): string {
		return `Basic ${btoa(`admin:${this.password}`)}`;
	}
}

export const adminStore = new AdminStore();
