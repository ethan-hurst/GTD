import { acquireToken } from './auth';

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';
const MAX_RETRIES = 3;

interface GraphResponse<T = any> {
	ok: boolean;
	status: number;
	data?: T;
	error?: string;
	nextLink?: string;   // @odata.nextLink for pagination
	deltaLink?: string;  // @odata.deltaLink for delta queries
}

/**
 * Execute a Graph API request with automatic token injection and error handling.
 * Handles 429 throttling, 401 token refresh, and pagination.
 */
export async function graphFetch<T = any>(
	path: string,
	options: RequestInit = {}
): Promise<GraphResponse<T>> {
	// Acquire Bearer token
	let token: string;
	try {
		token = await acquireToken();
	} catch (err) {
		return {
			ok: false,
			status: 401,
			error: err instanceof Error ? err.message : 'Failed to acquire token'
		};
	}

	// Build full URL (use path as-is if it's already a full URL, e.g., nextLink/deltaLink)
	const url = path.startsWith('https://') ? path : `${GRAPH_BASE_URL}${path}`;

	// Merge headers
	const headers = new Headers(options.headers || {});
	headers.set('Authorization', `Bearer ${token}`);
	if (!headers.has('Content-Type')) {
		headers.set('Content-Type', 'application/json');
	}

	// Execute request with retry logic
	let lastError: string | null = null;
	for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
		try {
			const response = await fetch(url, { ...options, headers });

			// Handle 429 Too Many Requests (throttling)
			if (response.status === 429) {
				const retryAfter = response.headers.get('Retry-After');
				const delaySeconds = retryAfter ? parseInt(retryAfter, 10) : Math.pow(2, attempt);
				console.warn(`Graph API throttled. Retrying after ${delaySeconds}s (attempt ${attempt + 1}/${MAX_RETRIES})`);
				await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
				continue; // Retry
			}

			// Handle 401 Unauthorized (token expired)
			if (response.status === 401 && attempt === 0) {
				console.warn('Graph API 401 - attempting token refresh');
				try {
					token = await acquireToken();
					headers.set('Authorization', `Bearer ${token}`);
					// Retry with new token
					const retryResponse = await fetch(url, { ...options, headers });
					if (!retryResponse.ok && retryResponse.status !== 412) {
						return {
							ok: false,
							status: retryResponse.status,
							error: await extractErrorMessage(retryResponse)
						};
					}
					return await parseGraphResponse<T>(retryResponse);
				} catch (refreshErr) {
					return {
						ok: false,
						status: 401,
						error: refreshErr instanceof Error ? refreshErr.message : 'Token refresh failed'
					};
				}
			}

			// Handle 412 Precondition Failed (ETag conflict)
			if (response.status === 412) {
				return {
					ok: false,
					status: 412,
					error: 'ETag conflict - resource was modified by another client'
				};
			}

			// Handle other non-OK responses
			if (!response.ok) {
				return {
					ok: false,
					status: response.status,
					error: await extractErrorMessage(response)
				};
			}

			// Success - parse response
			return await parseGraphResponse<T>(response);

		} catch (err) {
			lastError = err instanceof Error ? err.message : String(err);
			console.error(`Graph API request failed (attempt ${attempt + 1}/${MAX_RETRIES}):`, lastError);
			// Retry on network errors
			if (attempt < MAX_RETRIES - 1) {
				await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
			}
		}
	}

	// All retries exhausted
	return {
		ok: false,
		status: 0,
		error: lastError || 'Network error'
	};
}

/**
 * Fetch all pages of a paginated Graph API result.
 * Follows @odata.nextLink until no more pages or @odata.deltaLink is received.
 */
export async function graphFetchAll<T = any>(
	path: string
): Promise<{ ok: boolean; data: T[]; deltaLink?: string; error?: string }> {
	const allItems: T[] = [];
	let currentPath: string | null = path;
	let deltaLink: string | undefined;

	while (currentPath) {
		const response: GraphResponse<{ value: T[]; '@odata.nextLink'?: string; '@odata.deltaLink'?: string }> = await graphFetch<{ value: T[]; '@odata.nextLink'?: string; '@odata.deltaLink'?: string }>(currentPath);

		if (!response.ok) {
			return {
				ok: false,
				data: [],
				error: response.error
			};
		}

		// Collect items from this page
		if (response.data?.value) {
			allItems.push(...response.data.value);
		}

		// Check for delta link (indicates end of delta query)
		if (response.deltaLink) {
			deltaLink = response.deltaLink;
			break;
		}

		// Check for next page
		currentPath = response.nextLink || null;
	}

	return {
		ok: true,
		data: allItems,
		deltaLink
	};
}

/**
 * Parse Graph API response and extract data, nextLink, deltaLink.
 */
async function parseGraphResponse<T>(response: Response): Promise<GraphResponse<T>> {
	let data: any;
	const contentType = response.headers.get('Content-Type') || '';

	// Parse JSON if content type indicates JSON
	if (contentType.includes('application/json')) {
		try {
			data = await response.json();
		} catch (err) {
			return {
				ok: false,
				status: response.status,
				error: 'Failed to parse JSON response'
			};
		}
	} else {
		// Non-JSON response (e.g., 204 No Content)
		data = null;
	}

	// Extract pagination links
	const nextLink = data?.['@odata.nextLink'];
	const deltaLink = data?.['@odata.deltaLink'];

	return {
		ok: true,
		status: response.status,
		data,
		nextLink,
		deltaLink
	};
}

/**
 * Extract error message from Graph API error response.
 */
async function extractErrorMessage(response: Response): Promise<string> {
	try {
		const json = await response.json();
		return json?.error?.message || `HTTP ${response.status}`;
	} catch {
		return `HTTP ${response.status}`;
	}
}
