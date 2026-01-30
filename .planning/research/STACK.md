# Stack Research: Outlook Calendar Sync

**Domain:** Microsoft Outlook Calendar Sync (SvelteKit 2 / Svelte 5 integration)
**Researched:** 2026-01-31
**Confidence:** MEDIUM

## Executive Summary

For integrating Microsoft Outlook Calendar Sync into a SvelteKit 2 / Svelte 5 application with Dexie 4.x, you need minimal additions: @azure/msal-browser for authentication, @microsoft/microsoft-graph-client for API calls, and @microsoft/microsoft-graph-types for TypeScript definitions. The existing stack (SvelteKit, Dexie, TypeScript) provides the foundation for offline-first sync without additional packages.

**Critical Finding:** As of January 2026, MSAL.js has version conflicts. Version 5.1.0 was released but appears underdocumented with peer dependency issues. Recommend staying on stable v4.28.x until v5.x stabilizes.

**Existing Stack (DO NOT change):**
- SvelteKit 2 (framework)
- Svelte 5 with $state runes (reactivity)
- Dexie 4.x with EntityTable (IndexedDB)
- Tailwind v4 with Vite plugin (styling)
- @event-calendar/core (calendar component)
- TypeScript (language)
- Vite (build tool)

## Recommended Stack Additions

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| @azure/msal-browser | ^4.28.1 | OAuth 2.0 authentication with PKCE | Only library for Microsoft identity platform auth in browser SPAs. Version 4.28.1 is stable (released Jan 21, 2026). Version 5.1.0 exists but has underdocumented breaking changes and peer dependency conflicts. Implements PKCE flow required for public clients. |
| @microsoft/microsoft-graph-client | ^3.0.7 | Microsoft Graph API client | Official SDK with built-in request building, pagination, batching. Version 3.0.7 is current stable (last major release 2 years ago, still actively maintained). Simplifies calendar API calls with fluent interface. |
| @microsoft/microsoft-graph-types | ^2.x (latest) | TypeScript type definitions for Graph API | Provides intellisense for Graph entities (Calendar, Event, User). Saves time vs manual type creation. Install as dev dependency. Zero runtime impact. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None required | - | - | Existing Dexie 4.x handles offline storage. No additional sync libraries needed. Svelte 5 $state runes handle reactivity. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Microsoft Graph Explorer | API testing | Web tool at https://developer.microsoft.com/graph/graph-explorer. Test queries before coding. |
| @microsoft/microsoft-graph-types-beta | Beta API types (optional) | Only if using /beta endpoints. Stick to v1.0 for production stability. |

## Installation

```bash
# Core packages for Outlook Calendar Sync
npm install @azure/msal-browser@^4.28.1 @microsoft/microsoft-graph-client@^3.0.7

# TypeScript type definitions (dev dependency)
npm install -D @microsoft/microsoft-graph-types
```

**Total bundle size impact:** ~52 KB minified + gzipped (~40 KB MSAL + ~12 KB Graph SDK)

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| @azure/msal-browser | @azure/msal-node | NEVER for browser. Only for Node.js server-side authentication (incompatible with client-side). |
| @azure/msal-browser v4.28.1 | @azure/msal-browser v5.1.0 | Wait until v5.x is properly documented (expected Q1/Q2 2026). Currently has peer dependency conflicts. |
| @microsoft/microsoft-graph-client | Direct fetch() to Graph API | Only if bundle size is critical (<12 KB savings). Lose batching, pagination, retry logic. Use Kiota to generate minimal client. |
| sessionStorage (MSAL default) | localStorage | Only for cross-tab SSO. sessionStorage is more secure (cleared on tab close, not shared across tabs, reduces XSS attack surface). |
| sessionStorage | memoryStorage | Only for maximum security at cost of UX (user must re-login on every page refresh). |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| @azure/msal-react | React-specific wrapper. Incompatible with Svelte. Creates unnecessary Context/Provider overhead. | @azure/msal-browser directly |
| @azure/msal-angular | Angular-specific wrapper. Incompatible with Svelte. | @azure/msal-browser directly |
| @azure/msal-browser v5.x | Released Jan 2026 but underdocumented. GitHub issue #8254 reports peer dependency conflicts. No clear migration guide. | @azure/msal-browser v4.28.1 |
| MSAL.js v1.x (deprecated) | Uses implicit flow (deprecated for security). Removed from Microsoft CDN. | @azure/msal-browser v4.x+ (uses PKCE flow) |
| ADAL.js | Deprecated library. Azure AD Graph API endpoint retired. | @azure/msal-browser |
| IndexedDB for token storage | Security risk: vulnerable to XSS attacks, persists to file system. MSAL docs explicitly warn against this. | sessionStorage (MSAL default) or memoryStorage |
| localStorage for PKCE verifier | Persists across sessions. Higher XSS risk than sessionStorage. | sessionStorage (cleared on tab close) |
| Exchange Web Services (EWS) | Being retired October 1, 2026. Microsoft recommends migrating to Graph API. | Microsoft Graph API |
| Microsoft Graph Toolkit | Deprecated. Retirement begins Sept 2025, full retirement Aug 28, 2026. | @microsoft/microsoft-graph-client + @azure/msal-browser |

## SvelteKit 2 / Svelte 5 Integration Notes

### MSAL.js in SvelteKit 2 / Svelte 5

**Critical Constraint:** MSAL.js browser library only works client-side (requires `window`, `localStorage`, `sessionStorage`). **NOT compatible with SvelteKit SSR.**

**Solution:** Initialize MSAL in client-side code only (`.svelte` files, not `.server.ts` files).

#### Pattern 1: Singleton Instance

```typescript
// lib/auth/msalInstance.ts
import { PublicClientApplication } from '@azure/msal-browser';

const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
    redirectUri: window.location.origin,
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: 'sessionStorage', // More secure than localStorage
    storeAuthStateInCookie: false,
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);

// Initialize once - call this in root layout
export async function initializeMsal() {
  await msalInstance.initialize();
  await msalInstance.handleRedirectPromise(); // Critical for redirect flow
}
```

#### Pattern 2: Svelte 5 $state Runes Integration

```typescript
// lib/auth/authStore.svelte.ts
import { msalInstance } from './msalInstance';
import type { AccountInfo } from '@azure/msal-browser';

// Reactive state using Svelte 5 runes
let account = $state<AccountInfo | null>(null);
let isAuthenticated = $derived(account !== null);

export const authStore = {
  get account() { return account; },
  get isAuthenticated() { return isAuthenticated; },

  async login() {
    try {
      // Try popup first (better UX, no page reload)
      const response = await msalInstance.loginPopup({
        scopes: ['Calendars.ReadWrite', 'offline_access']
      });
      account = response.account;
    } catch (error: any) {
      // Fallback to redirect if popup blocked
      if (error.errorCode === 'popup_window_error') {
        await msalInstance.loginRedirect({
          scopes: ['Calendars.ReadWrite', 'offline_access']
        });
      } else {
        throw error;
      }
    }
  },

  async logout() {
    await msalInstance.logoutPopup();
    account = null;
  },

  async getAccessToken(): Promise<string> {
    if (!account) throw new Error('Not authenticated');

    try {
      // Try silent token acquisition first
      const response = await msalInstance.acquireTokenSilent({
        scopes: ['Calendars.ReadWrite'],
        account: account,
      });
      return response.accessToken;
    } catch (error) {
      // If silent fails, trigger interactive login
      const response = await msalInstance.acquireTokenPopup({
        scopes: ['Calendars.ReadWrite'],
        account: account,
      });
      return response.accessToken;
    }
  }
};
```

#### Pattern 3: SvelteKit Layout Initialization

```svelte
<!-- +layout.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { initializeMsal } from '$lib/auth/msalInstance';
  import { authStore } from '$lib/auth/authStore.svelte';

  let initialized = $state(false);

  onMount(async () => {
    // Initialize MSAL only in browser
    await initializeMsal();
    initialized = true;

    // Check if user is already logged in
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      authStore.account = accounts[0];
    }
  });
</script>

{#if initialized}
  <slot />
{:else}
  <div>Loading authentication...</div>
{/if}
```

### Microsoft Graph Client Setup

```typescript
// lib/graph/graphClient.ts
import { Client } from '@microsoft/microsoft-graph-client';
import { authStore } from '$lib/auth/authStore.svelte';

export function getGraphClient() {
  return Client.init({
    authProvider: async (done) => {
      try {
        const token = await authStore.getAccessToken();
        done(null, token); // Success callback
      } catch (error) {
        done(error, null); // Error callback
      }
    }
  });
}
```

### Delta Query Implementation (Incremental Sync)

Microsoft Graph delta query enables efficient incremental sync. Only fetch changed/deleted events since last sync.

```typescript
// lib/graph/calendarSync.ts
import { getGraphClient } from './graphClient';
import { db } from '$lib/db'; // Your Dexie instance
import type { Event } from '@microsoft/microsoft-graph-types';

interface DeltaResponse {
  events: Event[];
  deltaLink: string;
}

export async function syncCalendar(lastDeltaLink?: string): Promise<DeltaResponse> {
  const client = getGraphClient();

  // First sync: use calendarView with date range
  // Subsequent syncs: use deltaLink from previous sync
  const url = lastDeltaLink ||
    `/me/calendarView/delta?startDateTime=${getStartDate()}&endDateTime=${getEndDate()}`;

  let response = await client.api(url).get();
  const events: Event[] = response.value;

  // Handle pagination (@odata.nextLink)
  while (response['@odata.nextLink']) {
    response = await client.api(response['@odata.nextLink']).get();
    events.push(...response.value);
  }

  // Save deltaLink for next sync (@odata.deltaLink)
  const deltaLink = response['@odata.deltaLink'];

  return { events, deltaLink };
}

function getStartDate(): string {
  // Start 1 month ago
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return date.toISOString();
}

function getEndDate(): string {
  // End 6 months from now
  const date = new Date();
  date.setMonth(date.getMonth() + 6);
  return date.toISOString();
}
```

### Popup vs Redirect Flow

| Flow | Pros | Cons | Recommendation |
|------|------|------|----------------|
| Popup | - No page reload<br>- App state preserved<br>- Better UX | - Blocked by popup blockers<br>- Doesn't work in iframes | **Preferred** for SvelteKit SPA |
| Redirect | - No popup blockers<br>- Works in all browsers | - Full page reload<br>- App state lost<br>- Interrupts navigation | Fallback if popups fail |

**Implementation:** Use `loginPopup()` with try/catch fallback to `loginRedirect()` (see Pattern 2 above).

### Token Storage and Refresh

**Token Lifecycle:**
- Access token expires in 1 hour
- Refresh token valid for 90 days (rolling window)
- MSAL automatically refreshes via `acquireTokenSilent()`

**Storage Strategy:**
- **MSAL tokens:** sessionStorage (MSAL manages automatically)
- **Calendar data:** Dexie IndexedDB (your existing pattern)
- **Sync metadata:** Dexie IndexedDB table (deltaLink, lastSyncTime)
- **Sync queue:** Dexie IndexedDB table (pending offline changes)

**DO NOT** store tokens in Dexie. MSAL handles token storage securely in sessionStorage. Storing tokens in IndexedDB:
- Increases XSS attack surface
- Persists tokens to file system
- Violates Microsoft security best practices

## Integration with Existing Stack

### Dexie 4.x Schema Extensions

Extend your existing Dexie schema with tables for Outlook sync:

```typescript
// lib/db/schema.ts (extend existing schema)
import Dexie, { type EntityTable } from 'dexie';

interface OutlookEvent {
  id: string; // Microsoft Graph event ID
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  body?: { content: string; contentType: string };
  isDeleted?: boolean; // Delta query includes deletions
  lastModified: string;
  // Add other Event properties as needed
}

interface SyncMetadata {
  id: 'calendar_sync'; // Single row key
  deltaLink: string;
  lastSyncTime: number;
}

interface SyncQueueItem {
  id?: number;
  operation: 'create' | 'update' | 'delete';
  eventId: string;
  eventData: Partial<OutlookEvent>;
  retryCount: number;
  createdAt: number;
}

const db = new Dexie('GTDDatabase') as Dexie & {
  outlookEvents: EntityTable<OutlookEvent, 'id'>;
  syncMetadata: EntityTable<SyncMetadata, 'id'>;
  syncQueue: EntityTable<SyncQueueItem, 'id'>;
  // ... existing tables (projects, tasks, contexts, etc.)
};

// Increment version number when adding new tables
db.version(2).stores({
  outlookEvents: 'id, start.dateTime, end.dateTime', // Compound indexes for date range queries
  syncMetadata: 'id',
  syncQueue: '++id, operation, createdAt',
  // ... existing table definitions
});

export { db };
```

### Tailwind v4 (No Impact)

MSAL and Graph libraries are headless (no UI components). Your existing Tailwind setup handles all UI styling for auth buttons, calendar views, sync status indicators, etc.

### TypeScript Integration

All recommended packages include native TypeScript support:

```typescript
import type { AccountInfo, AuthenticationResult } from '@azure/msal-browser';
import type { Event, Calendar } from '@microsoft/microsoft-graph-types';

// Full type safety
const handleLogin = async (): Promise<AccountInfo> => {
  const result: AuthenticationResult = await msalInstance.loginPopup(loginRequest);
  return result.account;
};

const getEvents = async (): Promise<Event[]> => {
  const client = getGraphClient();
  const response = await client.api('/me/events').get();
  return response.value; // Typed as Event[]
};
```

### @event-calendar/core Integration

Your existing calendar component can display both GTD tasks AND Outlook events:

```typescript
// Merge local GTD tasks with synced Outlook events
const calendarEvents = $derived(() => {
  const gtdTasks = /* ... from Dexie ... */;
  const outlookEvents = /* ... from Dexie outlookEvents table ... */;

  return [
    ...gtdTasks.map(task => ({
      id: task.id,
      title: task.title,
      start: task.scheduledTime,
      // ... GTD-specific styling
    })),
    ...outlookEvents.map(event => ({
      id: event.id,
      title: event.subject,
      start: event.start.dateTime,
      end: event.end.dateTime,
      // ... Outlook-specific styling
    }))
  ];
});
```

## Offline Sync Queue Pattern

**Architecture:** Dexie-based queue (no additional libraries needed). Follows offline-first best practices from 2025/2026 research.

```typescript
// lib/sync/syncQueue.ts
import { db } from '$lib/db/schema';
import { getGraphClient } from '$lib/graph/graphClient';

export async function enqueueChange(
  operation: 'create' | 'update' | 'delete',
  eventId: string,
  eventData: any
) {
  // Add to offline queue
  await db.syncQueue.add({
    operation,
    eventId,
    eventData,
    retryCount: 0,
    createdAt: Date.now()
  });

  // Attempt immediate sync if online
  if (navigator.onLine) {
    await processSyncQueue();
  }
}

export async function processSyncQueue() {
  const items = await db.syncQueue.orderBy('createdAt').toArray();
  const client = getGraphClient();

  for (const item of items) {
    try {
      switch (item.operation) {
        case 'create':
          await client.api('/me/events').post(item.eventData);
          break;
        case 'update':
          await client.api(`/me/events/${item.eventId}`).patch(item.eventData);
          break;
        case 'delete':
          await client.api(`/me/events/${item.eventId}`).delete();
          break;
      }

      // Success - remove from queue
      await db.syncQueue.delete(item.id!);

    } catch (error: any) {
      // Handle auth errors (token expired)
      if (error.code === 'InvalidAuthenticationToken') {
        // Token expired - will retry next sync after re-auth
        return;
      }

      // Increment retry count
      await db.syncQueue.update(item.id!, {
        retryCount: item.retryCount + 1
      });

      // Max retries reached - log failure
      if (item.retryCount >= 3) {
        console.error('Sync failed after 3 retries:', item, error);
        // Optionally: move to failed queue or notify user
      }
    }
  }
}

// Call this when coming back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    processSyncQueue();
  });
}
```

## Required OAuth Scopes

Register your app in Azure Portal (https://portal.azure.com) → App Registrations → New registration.

| Scope | Purpose | Required |
|-------|---------|----------|
| Calendars.ReadWrite | Read and write user calendars | Yes |
| offline_access | Get refresh tokens for background sync (90-day rolling window) | Yes |
| User.Read | Get user profile info (name, email for display) | Optional |

**App Registration Settings:**
- Platform: Single-page application (SPA)
- Redirect URIs: `http://localhost:5173` (dev), `https://yourdomain.com` (prod)
- Implicit grant: NOT required (PKCE flow doesn't use implicit grant)

## Performance Considerations

### Bundle Size Impact

| Package | Size (minified + gzipped) | Notes |
|---------|---------------------------|-------|
| @azure/msal-browser | ~40 KB | Essential. No alternatives for Microsoft identity platform. |
| @microsoft/microsoft-graph-client | ~12 KB | Optional but recommended. Can use fetch() instead (see below). |
| @microsoft/microsoft-graph-types | 0 KB | Dev dependency only. No runtime impact. |
| **Total Addition** | ~52 KB | Acceptable for calendar sync feature (~3% of typical SPA bundle). |

### Bundle Size Optimization (if needed)

If 52 KB is too large, replace Graph SDK with direct fetch():

```typescript
// Alternative to Graph SDK (saves ~12 KB)
async function getEvents() {
  const token = await authStore.getAccessToken();
  const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Graph API error: ${response.status}`);
  }

  return response.json();
}
```

**Trade-off:** Lose Graph SDK's built-in batching, pagination, retry logic, error handling. Must implement manually.

**Recommendation:** Keep Graph SDK unless bundle size is critical constraint. The 12 KB cost is worth the DX and reliability benefits.

### Runtime Performance

- Token acquisition: ~100-300ms (silent), ~2-5s (interactive popup)
- Graph API calls: ~200-500ms (typical), ~1-2s (large result sets)
- Delta query: ~200-500ms (incremental), ~2-10s (initial full sync)
- IndexedDB writes: ~10-50ms (single event), ~100-500ms (bulk write)

## Security Best Practices

### Token Storage
- **DO:** Use sessionStorage (MSAL default)
- **DON'T:** Use localStorage (XSS vulnerability, persists across sessions)
- **DON'T:** Store tokens in IndexedDB/Dexie (file system persistence, XSS vulnerability)

### XSS Protection
- Sanitize user input before rendering (Svelte auto-escapes by default)
- Use Content Security Policy (CSP) headers
- Keep dependencies updated (`npm audit`)
- Avoid `@html` directive with untrusted content

### PKCE Flow
- MSAL.js v4+ uses PKCE automatically (no manual implementation needed)
- Code verifier stored in sessionStorage temporarily (cleared after exchange)
- State parameter prevents CSRF attacks

### Environment Variables
Store Azure credentials in `.env` files (never commit):

```bash
# .env.local (gitignored)
VITE_AZURE_CLIENT_ID=your-client-id
VITE_AZURE_TENANT_ID=your-tenant-id
```

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| @azure/msal-browser@4.28.1 | SvelteKit 2.x | Works client-side only. NOT SSR compatible. |
| @azure/msal-browser@4.28.1 | Svelte 5.x | Compatible. Use $state runes for reactive auth state. |
| @azure/msal-browser@4.28.1 | TypeScript 5.x | Built with TS. Native type support. |
| @microsoft/microsoft-graph-client@3.0.7 | Node.js 12+ | Requires LTS version. Built with TypeScript 4.x. |
| @microsoft/microsoft-graph-client@3.0.7 | @azure/msal-browser@4.x | Use MSAL token in authProvider callback. |
| @microsoft/microsoft-graph-types@2.x | TypeScript 2.0+ | Dev dependency. No runtime impact. Works with any TS version. |

## Known Issues & Mitigations

### Issue 1: MSAL v5.x Peer Dependency Conflicts

**Problem:** @azure/msal-browser v5.0.2 and v5.1.0 released without documentation. GitHub issue #8254 reports peer dependency conflicts with @azure/msal-react v5.0.2.

**Impact:** Breaking changes not documented. Migration path unclear.

**Mitigation:** Pin to v4.28.1 in package.json:

```json
{
  "dependencies": {
    "@azure/msal-browser": "4.28.1"
  }
}
```

**When to upgrade:** Wait until v5.x is properly documented (expected Q1/Q2 2026). Monitor GitHub releases.

### Issue 2: Popup Blockers

**Problem:** `loginPopup()` blocked by browser popup blockers.

**Impact:** User can't authenticate.

**Mitigation:** Fallback to `loginRedirect()`:

```typescript
try {
  await msalInstance.loginPopup(loginRequest);
} catch (error: any) {
  if (error.errorCode === 'popup_window_error') {
    await msalInstance.loginRedirect(loginRequest);
  }
}
```

**Best practice:** Use `loginPopup()` as primary flow. Automatically fall back to redirect on popup block.

### Issue 3: Token Expiration During Offline Period

**Problem:** Access token expires (1 hour). Refresh token may expire (90 days) if user offline long-term.

**Impact:** Sync fails when coming back online. User must re-authenticate.

**Mitigation:** Handle auth errors gracefully:

```typescript
try {
  await processSyncQueue();
} catch (error: any) {
  if (error.code === 'InvalidAuthenticationToken' || error.errorCode === 'interaction_required') {
    // Token expired - prompt re-login
    await authStore.login();
    // Retry sync after re-auth
    await processSyncQueue();
  }
}
```

### Issue 4: SvelteKit SSR Incompatibility

**Problem:** MSAL.js requires `window`, `sessionStorage`, `localStorage`. Not available during SSR.

**Impact:** Build fails or runtime errors during SSR.

**Mitigation:** Initialize MSAL client-side only:

```svelte
<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';

  onMount(async () => {
    if (browser) {
      await initializeMsal();
    }
  });
</script>
```

Or use `+page.svelte` (client-side) instead of `+page.server.ts` (SSR).

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| MSAL.js version | MEDIUM | v4.28.1 verified via GitHub releases (Jan 21, 2026). v5.x exists but underdocumented. |
| Graph SDK version | HIGH | v3.0.7 verified via official GitHub releases. Current stable. |
| SvelteKit integration | MEDIUM | No official MSAL-Svelte wrapper. Pattern based on community examples and MSAL.js docs. |
| Dexie integration | HIGH | Existing stack. Standard IndexedDB pattern for offline sync verified via 2025 research. |
| TypeScript types | HIGH | All packages have native TS support verified via npm package metadata. |
| Security practices | HIGH | Token storage best practices verified via Microsoft Learn and OWASP guidelines. |

## Open Questions (Recommend Phase-Specific Research)

- **Conflict resolution:** How to handle conflicts when same event modified in both GTD app and Outlook? (Recommend: Outlook wins, as stated in requirements)
- **Recurring events:** How to handle recurring event instances in delta query? (Graph API returns series + exceptions - needs investigation)
- **Performance at scale:** How does delta query perform with 1000+ calendar events? (Recommend: load testing in implementation phase)
- **Background sync:** Can Service Worker Background Sync improve offline → online sync UX? (Optional enhancement)

## Sources

### MSAL.js
- [MSAL.js v3 Release Blog](https://devblogs.microsoft.com/identity/msal-js-v3-release/) - Version 3 features and changes
- [MSAL Browser Documentation](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/about-msal-browser) - Official MSAL browser library docs
- [Initialize MSAL.js Client Apps](https://learn.microsoft.com/en-us/entra/identity-platform/msal-js-initializing-client-applications) - Configuration options
- [Caching in MSAL.js](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/caching) - Token storage best practices
- [MSAL.js GitHub Releases](https://github.com/AzureAD/microsoft-authentication-library-for-js/releases) - Version 4.28.1 and 5.1.0 verified
- [MSAL Browser v5.x Issue #8254](https://github.com/AzureAD/microsoft-authentication-library-for-js/issues/8254) - Peer dependency conflicts

### Microsoft Graph
- [Microsoft Graph SDK JavaScript GitHub](https://github.com/microsoftgraph/msgraph-sdk-javascript) - Official SDK repository
- [Microsoft Graph JavaScript SDK v3.0.0 GA](https://devblogs.microsoft.com/microsoft365dev/microsoft-graph-javascript-sdk-3-0-0-is-now-generally-available/) - Version 3 announcement
- [Microsoft Graph Types NPM](https://www.npmjs.com/package/@microsoft/microsoft-graph-types) - TypeScript type definitions
- [Microsoft Graph Types GitHub](https://github.com/microsoftgraph/msgraph-typescript-typings/) - Type definitions repository
- [Delta Query for Events](https://learn.microsoft.com/en-us/graph/delta-query-events) - Incremental sync pattern
- [Event Delta API Reference](https://learn.microsoft.com/en-us/graph/api/event-delta?view=graph-rest-1.0) - API endpoint documentation
- [Calendar API Overview](https://learn.microsoft.com/en-us/graph/api/resources/calendar-overview?view=graph-rest-1.0) - Working with calendars

### SvelteKit Integration
- [Azure AD Authentication in SvelteKit](https://medium.com/@varu87/azure-ad-authentication-in-sveltekit-f596cfa8a349) - Community integration guide
- [SvelteKit MSAL SPA GitHub](https://github.com/andreideak/sveltekit-msal-spa) - Example implementation
- [MSAL SvelteKit Webapp GitHub](https://github.com/andreideak/msal-sveltekit-webapp) - Server-side pattern (msal-node)
- [Single-page App Sign-in & Sign-out](https://learn.microsoft.com/en-us/entra/identity-platform/scenario-spa-sign-in) - SPA authentication patterns

### Security & Best Practices
- [Best Practices for Storing Access Tokens in the Browser](https://curity.medium.com/best-practices-for-storing-access-tokens-in-the-browser-6b3d515d9814) - Token storage security
- [PKCE Authentication](https://marussy.com/pkce-authentication/) - Client-side vs server-side PKCE
- [OAuth 2.0 for Browser-Based Apps](https://www.ietf.org/archive/id/draft-ietf-oauth-browser-based-apps-12.html) - IETF OAuth spec
- [OAuth 2.0 Authorization Code Flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow) - Microsoft identity platform flow

### Offline Sync
- [Offline-first frontend apps in 2025: IndexedDB](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/) - IndexedDB patterns
- [Background Syncs in PWA](https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/background-syncs) - Service Worker sync
- [How to implement offline-first data sync](https://www.mindstick.com/interview/34329/how-would-you-implement-offline-first-data-sync-with-indexeddb-and-a-remote-api) - Queue pattern

### Svelte 5
- [Svelte 5 and Granular Reactivity Revolution](https://leapcell.io/blog/svelte-5-and-the-granular-reactivity-revolution-with-runes) - Runes overview
- [Introducing Runes](https://svelte.dev/blog/runes) - Official Svelte 5 runes announcement
- [Svelte 5 Refresher with Runes](https://luminary.blog/techs/05-svelte5-refresher/) - Runes guide

### Alternatives & Comparisons
- [Microsoft Graph SDK overview](https://learn.microsoft.com/en-us/graph/sdks/sdks-overview) - When to use SDK vs direct API
- [MSAL React FAQ](https://learn.microsoft.com/en-us/entra/msal/javascript/react/faq) - Framework wrapper considerations
- [MSAL Browser FAQ](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/FAQ.md) - Common issues

---

*Stack research for: Outlook Calendar Sync (v1.1 milestone)*
*Researched: 2026-01-31*
*Confidence: MEDIUM (MSAL v5.x uncertainty, SvelteKit integration patterns from community examples)*
*Total bundle size impact: ~52 KB (~3% of typical SPA)*
*No changes to existing stack required*
