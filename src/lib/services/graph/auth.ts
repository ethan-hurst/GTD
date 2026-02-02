import { PublicClientApplication, type Configuration, type AuthenticationResult, InteractionRequiredAuthError } from '@azure/msal-browser';

const msalConfig: Configuration = {
	auth: {
		clientId: import.meta.env.PUBLIC_MSAL_CLIENT_ID || '',
		authority: import.meta.env.PUBLIC_MSAL_AUTHORITY || 'https://login.microsoftonline.com/common',
		redirectUri: typeof window !== 'undefined' ? window.location.origin : '',
	},
	cache: {
		cacheLocation: 'sessionStorage',  // Secure, cleared on tab close
	},
};

let msalInstance: PublicClientApplication | null = null;

export async function getMsalInstance(): Promise<PublicClientApplication> {
	if (msalInstance) return msalInstance;

	if (typeof window === 'undefined') {
		throw new Error('MSAL can only be initialized in the browser');
	}

	msalInstance = new PublicClientApplication(msalConfig);
	await msalInstance.initialize();
	// Handle redirect promise (for redirect flow completion)
	await msalInstance.handleRedirectPromise();
	return msalInstance;
}

const SCOPES = ['Calendars.ReadWrite', 'User.Read'];

export async function loginWithMsal(): Promise<void> {
	const instance = await getMsalInstance();
	await instance.loginRedirect({ scopes: SCOPES });
}

export async function logoutFromMsal(): Promise<void> {
	const instance = await getMsalInstance();
	await instance.logoutRedirect();
	msalInstance = null;
}

export async function acquireToken(): Promise<string> {
	const instance = await getMsalInstance();
	const accounts = instance.getAllAccounts();

	if (accounts.length === 0) {
		throw new Error('No authenticated account found');
	}

	try {
		const result = await instance.acquireTokenSilent({
			scopes: SCOPES,
			account: accounts[0],
		});
		return result.accessToken;
	} catch (error) {
		if (error instanceof InteractionRequiredAuthError) {
			// Silent renewal failed — redirect for re-auth
			await instance.acquireTokenRedirect({ scopes: SCOPES });
			throw new Error('Redirecting for re-authentication');
		}
		throw error;
	}
}

export async function getAuthenticatedAccount() {
	const instance = await getMsalInstance();
	const accounts = instance.getAllAccounts();
	return accounts.length > 0 ? accounts[0] : null;
}
