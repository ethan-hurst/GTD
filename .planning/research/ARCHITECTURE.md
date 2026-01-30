# Architecture Research

**Domain:** Outlook Calendar Sync (SvelteKit integration)
**Researched:** 2026-01-31
**Confidence:** HIGH

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                      GTD SvelteKit App (Browser)                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  UI Layer (Svelte 5 Components)                                    │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐           │
│  │ Calendar    │  │ Sync Status  │  │ OAuth Login     │           │
│  │ View        │  │ Indicator    │  │ Button          │           │
│  └─────────────┘  └──────────────┘  └─────────────────┘           │
│         │                │                     │                    │
│  ┌──────▼────────────────▼─────────────────────▼──────────┐        │
│  │         State Layer ($state runes stores)              │        │
│  │  ┌──────────────┐  ┌─────────────┐  ┌──────────────┐  │        │
│  │  │calendarState │  │ syncStore   │  │  authStore   │  │        │
│  │  │(existing)    │  │   (NEW)     │  │    (NEW)     │  │        │
│  │  └──────────────┘  └─────────────┘  └──────────────┘  │        │
│  └────────────────────────────────────────────────────────┘        │
│         │                │                     │                    │
│  ┌──────▼────────────────▼─────────────────────▼──────────┐        │
│  │         Service Layer                                  │        │
│  │  ┌──────────────┐  ┌─────────────┐  ┌──────────────┐  │        │
│  │  │ Graph Client │  │ Sync Engine │  │ MSAL Auth    │  │        │
│  │  │   (NEW)      │  │   (NEW)     │  │   (NEW)      │  │        │
│  │  └──────────────┘  └─────────────┘  └──────────────┘  │        │
│  └────────────────────────────────────────────────────────┘        │
│         │                │                     │                    │
│  ┌──────▼────────────────▼─────────────────────▼──────────┐        │
│  │    Data Layer (Dexie IndexedDB)                        │        │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐             │        │
│  │  │ events   │  │ syncMeta │  │ syncQueue│             │        │
│  │  │(existing)│  │  (NEW)   │  │  (NEW)   │             │        │
│  │  └──────────┘  └──────────┘  └──────────┘             │        │
│  └────────────────────────────────────────────────────────┘        │
│                                                                     │
│  Service Worker (existing)                                         │
│  └─ Offline caching + future Background Sync trigger               │
│                                                                     │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 │ HTTPS (OAuth + Graph API)
                 │
         ┌───────▼───────────────────────────┐
         │   Microsoft Identity Platform     │
         │   (login.microsoftonline.com)     │
         └───────────────────────────────────┘
                 │
         ┌───────▼───────────────────────────┐
         │   Microsoft Graph API             │
         │   (graph.microsoft.com/v1.0)      │
         │                                   │
         │  - /me/calendarView/delta         │
         │  - /me/events/{id}                │
         └───────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **MSAL Auth Service** | OAuth 2.0 auth code flow with PKCE, token acquisition/refresh | `@azure/msal-browser` PublicClientApplication |
| **Graph Client Service** | HTTP client for Microsoft Graph API with auth headers | Wrapper around fetch with token injection |
| **Sync Engine** | Orchestrates delta sync: pull from Outlook, push to Outlook, conflict resolution | State machine: idle → syncing → success/error |
| **Sync Metadata Store** | Tracks delta tokens, sync state, event mapping | IndexedDB table with deltaLink URLs per calendar |
| **Sync Queue** | Queues offline mutations for replay when online | IndexedDB table with operation type, timestamp, retry count |
| **Calendar State** | Reactive UI state for events (already exists) | Svelte 5 $state runes class |
| **Auth Store** | Reactive UI state for login status, user profile | Svelte 5 $state runes class |
| **Sync Store** | Reactive UI state for sync status, last sync time | Svelte 5 $state runes class |

## Integration with Existing Architecture

### Existing Components to Modify

- **CalendarEvent schema** — Add `outlookId`, `outlookETag`, `syncSource` fields
- **calendarStore.svelte.ts** — Add methods for Outlook event handling (merge, map, display)
- **EventCalendar.svelte** — Add sync trigger button, OAuth login prompt
- **CalendarSidePanel.svelte** — Show Outlook events alongside local events
- **service-worker.js** — Add Background Sync registration for sync queue replay

### New Components to Add

- **AuthService** (`src/lib/services/graph/auth.ts`) — MSAL.js authentication wrapper
- **GraphClient** (`src/lib/services/graph/client.ts`) — Microsoft Graph API HTTP client
- **CalendarSyncService** (`src/lib/services/graph/calendar.ts`) — Calendar-specific Graph operations
- **SyncEngine** (`src/lib/services/sync/engine.ts`) — Orchestrates bidirectional sync
- **SyncQueue** (`src/lib/services/sync/queue.ts`) — Offline mutation queue management
- **authStore** (`src/lib/stores/auth.svelte.ts`) — Reactive auth state
- **syncStore** (`src/lib/stores/sync.svelte.ts`) — Reactive sync state
- **OutlookSyncButton.svelte** — UI component for sync trigger
- **OutlookAuthButton.svelte** — UI component for OAuth login

## Recommended Project Structure

```
src/
├── lib/
│   ├── services/
│   │   ├── graph/                     # NEW: Microsoft Graph integration
│   │   │   ├── auth.ts                # MSAL authentication
│   │   │   ├── client.ts              # Graph API HTTP client
│   │   │   └── calendar.ts            # Calendar sync operations
│   │   └── sync/                      # NEW: Sync engine
│   │       ├── engine.ts              # Sync orchestration
│   │       ├── queue.ts               # Offline queue management
│   │       └── types.ts               # Sync-related types
│   ├── stores/
│   │   ├── auth.svelte.ts             # NEW: Auth state
│   │   ├── sync.svelte.ts             # NEW: Sync state
│   │   └── calendar.svelte.ts         # MODIFY: Add Outlook methods
│   ├── components/
│   │   ├── OutlookAuthButton.svelte   # NEW: OAuth login
│   │   ├── OutlookSyncButton.svelte   # NEW: Sync trigger
│   │   ├── SyncStatusIndicator.svelte # NEW: Sync status display
│   │   ├── EventCalendar.svelte       # MODIFY: Add sync controls
│   │   └── CalendarSidePanel.svelte   # MODIFY: Show Outlook events
│   └── db/
│       ├── schema.ts                  # MODIFY: Add sync tables
│       └── operations.ts              # MODIFY: Add sync metadata ops
└── service-worker.js                  # MODIFY: Add Background Sync
```

## Data Flow

### Flow 1: Outlook → GTD (Read/Pull Sync)

```
┌────────────────────────────────────────────────────────────────────┐
│ 1. User clicks "Sync with Outlook" button                         │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ 2. SyncEngine checks auth status                                  │
│    - If not authenticated → redirect to MSAL login                │
│    - If authenticated → acquire access token silently             │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ 3. SyncEngine loads last deltaLink from syncMeta table            │
│    - First sync: deltaLink is null                                │
│    - Subsequent syncs: deltaLink contains delta token              │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ 4. GraphClient calls /me/calendarView/delta                       │
│    - First sync: startDateTime & endDateTime (e.g., ±6 months)    │
│    - Delta sync: Use saved deltaLink URL with $deltatoken         │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ 5. Process paginated response                                     │
│    - Follow @odata.nextLink until @odata.deltaLink received       │
│    - Parse each event, check for @removed property                │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ 6. Map Outlook events → GTD CalendarEvent                         │
│    - Lookup by outlookId in events table                          │
│    - New event → insert with source='outlook'                     │
│    - Changed event → update if outlookETag differs                │
│    - Deleted event (@removed) → delete from events table          │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ 7. Save @odata.deltaLink to syncMeta table                        │
│    - Overwrites previous deltaLink for incremental sync           │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ 8. Reload calendarState.events                                    │
│    - UI reactively updates to show Outlook events                 │
└────────────────────────────────────────────────────────────────────┘
```

### Flow 2: GTD → Outlook (Write/Push Sync)

```
┌────────────────────────────────────────────────────────────────────┐
│ 1. User creates/updates event in GTD with scheduled time          │
│    - EventForm sets source='gtd-scheduled'                         │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ 2. Check network connectivity (navigator.onLine)                  │
│    - Online → proceed to step 3                                   │
│    - Offline → enqueue to syncQueue, skip to step 8               │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ 3. Map GTD event → Outlook event schema                           │
│    - subject = title                                               │
│    - start/end = startTime/endTime with timezone                  │
│    - body = notes (HTML or text)                                   │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ 4. GraphClient POST /me/events (create) or PATCH (update)         │
│    - Create: outlookId is null                                    │
│    - Update: outlookId exists, include If-Match header with ETag  │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ 5. Handle response                                                 │
│    - 201 Created → save outlookId and ETag to GTD event           │
│    - 200 OK → update ETag                                          │
│    - 412 Precondition Failed → conflict detected                  │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ 6. Conflict resolution (Outlook wins)                             │
│    - GET /me/events/{id} to fetch current Outlook version         │
│    - Overwrite GTD event with Outlook data                        │
│    - Show user notification: "Event updated from Outlook"         │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ 7. Update events table                                             │
│    - Save outlookId, outlookETag, lastSyncedAt timestamp          │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ 8. Reload calendarState.events                                    │
│    - UI reactively updates                                         │
└────────────────────────────────────────────────────────────────────┘
```

### Flow 3: Offline Queue Replay

```
┌────────────────────────────────────────────────────────────────────┐
│ 1. User goes offline (navigator.onLine = false)                   │
│    - All create/update/delete operations enqueue to syncQueue     │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ 2. User comes back online (online event fires)                    │
│    - Service Worker triggers Background Sync (future enhancement) │
│    - OR app detects online and calls SyncEngine.replayQueue()     │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ 3. SyncEngine loads all items from syncQueue                      │
│    - Sort by timestamp ASC (FIFO order)                           │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ 4. Process each queued operation                                  │
│    - CREATE → POST /me/events                                     │
│    - UPDATE → PATCH /me/events/{id}                               │
│    - DELETE → DELETE /me/events/{id}                              │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ 5. Handle success/failure                                         │
│    - Success → remove from syncQueue                              │
│    - Failure → increment retryCount                               │
│    - Max retries exceeded → move to deadLetterQueue (manual fix)  │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ 6. After all queued items processed, run delta sync               │
│    - Pull latest changes from Outlook to reconcile                │
└────────────────────────────────────────────────────────────────────┘
```

## Delta Sync Pattern

Microsoft Graph API provides delta query capabilities for efficient incremental synchronization.

### Delta Query Flow

**1. Initial Sync (First Time)**

```http
GET /me/calendarView/delta?startDateTime=2026-01-01T00:00:00Z&endDateTime=2026-12-31T23:59:59Z
Prefer: odata.maxpagesize=50
```

Response contains:
- `value[]` — Array of calendar events
- `@odata.nextLink` — URL for next page (if paginated)
- `@odata.deltaLink` — URL for next delta sync (final response only)

**2. Pagination**

If response contains `@odata.nextLink`, follow it:

```http
GET /me/calendarView/delta?$skiptoken=abc123xyz
```

Repeat until response contains `@odata.deltaLink` instead.

**3. Save Delta Link**

Store the `@odata.deltaLink` URL in syncMeta table:

```typescript
{
  id: 1,
  key: 'outlook-calendar-deltaLink',
  value: 'https://graph.microsoft.com/v1.0/me/calendarView/delta?$deltatoken=def456uvw',
  updatedAt: new Date()
}
```

**4. Subsequent Delta Sync**

Use saved deltaLink URL:

```http
GET /me/calendarView/delta?$deltatoken=def456uvw
```

Response contains only changed events since last sync:
- New events
- Updated events
- Deleted events (with `@removed` property)

**5. Handling Deletions**

Deleted events have `@removed` annotation:

```json
{
  "@odata.type": "#microsoft.graph.event",
  "id": "AAMkADk0MGFk...",
  "@removed": {
    "reason": "deleted"
  }
}
```

Delete from local events table by `outlookId`.

**6. Token Expiration**

If deltaToken expires (typically after 7 days for Outlook entities), Graph API returns error. Restart with initial sync.

### Delta Sync Implementation

```typescript
// src/lib/services/graph/calendar.ts

export async function performDeltaSync() {
  // 1. Load saved deltaLink
  const meta = await getSyncMetadata('outlook-calendar-deltaLink');
  const deltaUrl = meta?.value;

  // 2. Build request URL
  const url = deltaUrl || buildInitialSyncUrl();

  // 3. Fetch delta changes
  let nextLink = url;
  const allEvents: OutlookEvent[] = [];

  while (nextLink) {
    const response = await graphClient.get(nextLink);
    allEvents.push(...response.value);

    if (response['@odata.nextLink']) {
      nextLink = response['@odata.nextLink'];
    } else {
      // Final page, save deltaLink
      await saveSyncMetadata('outlook-calendar-deltaLink', response['@odata.deltaLink']);
      nextLink = null;
    }
  }

  // 4. Apply changes to local database
  for (const event of allEvents) {
    if (event['@removed']) {
      await deleteEventByOutlookId(event.id);
    } else {
      await upsertEventFromOutlook(event);
    }
  }
}
```

## Offline Queue Pattern

GTD operations must continue working offline and sync when connectivity returns.

### Sync Queue Schema

```typescript
export interface SyncQueueItem {
  id: number;
  operation: 'create' | 'update' | 'delete';
  entityType: 'event';
  entityId: number;          // Local GTD event ID
  payload: any;              // Event data to sync
  timestamp: Date;           // When queued
  retryCount: number;        // Failed attempts
  maxRetries: number;        // Default: 3
  error?: string;            // Last error message
}
```

### Queue Operations

**1. Enqueue Operation (Offline)**

```typescript
export async function enqueueSync(
  operation: 'create' | 'update' | 'delete',
  event: CalendarEvent
) {
  await db.syncQueue.add({
    operation,
    entityType: 'event',
    entityId: event.id,
    payload: event,
    timestamp: new Date(),
    retryCount: 0,
    maxRetries: 3
  } as SyncQueueItem);
}
```

**2. Replay Queue (Online)**

```typescript
export async function replayQueue() {
  const items = await db.syncQueue
    .orderBy('timestamp')  // FIFO order
    .toArray();

  for (const item of items) {
    try {
      switch (item.operation) {
        case 'create':
          await graphClient.createEvent(item.payload);
          break;
        case 'update':
          await graphClient.updateEvent(item.payload.outlookId, item.payload);
          break;
        case 'delete':
          await graphClient.deleteEvent(item.payload.outlookId);
          break;
      }

      // Success: remove from queue
      await db.syncQueue.delete(item.id);

    } catch (error) {
      // Failure: increment retry count
      const newRetryCount = item.retryCount + 1;

      if (newRetryCount >= item.maxRetries) {
        // Move to dead letter queue for manual intervention
        await db.deadLetterQueue.add(item);
        await db.syncQueue.delete(item.id);
      } else {
        await db.syncQueue.update(item.id, {
          retryCount: newRetryCount,
          error: error.message
        });
      }
    }
  }

  // After queue replay, run delta sync to reconcile
  await performDeltaSync();
}
```

**3. Detect Connectivity Changes**

```typescript
// In app initialization or layout
window.addEventListener('online', async () => {
  await replayQueue();
});

window.addEventListener('offline', () => {
  syncStore.setOffline(true);
});
```

## Schema Changes

### Version 7: Add Outlook Sync Metadata

```typescript
// src/lib/db/schema.ts

export interface CalendarEvent {
  id: number;
  title: string;
  startTime: Date;
  endTime: Date;
  allDay?: boolean;
  location?: string;
  notes?: string;
  color?: string;
  projectId?: number;
  source?: string;           // Existing: 'manual' | 'ics-import' | filename

  // NEW: Outlook sync fields
  outlookId?: string;        // Graph API event ID
  outlookETag?: string;      // ETag for conflict detection
  syncSource?: 'local' | 'outlook' | 'both';  // Sync ownership
  lastSyncedAt?: Date;       // Last sync timestamp

  rrule?: string;            // Existing: RFC 5545 RRULE string
  recurrenceId?: number;     // Existing: Links to parent event for exceptions
  exceptionDates?: string[]; // Existing: ISO date strings for excluded occurrences
  created: Date;
  modified: Date;
}

export interface SyncMetadata {
  id: number;
  key: string;               // e.g., 'outlook-calendar-deltaLink'
  value: any;                // Stored delta link URL or other metadata
  updatedAt: Date;
}

export interface SyncQueueItem {
  id: number;
  operation: 'create' | 'update' | 'delete';
  entityType: 'event';
  entityId: number;
  payload: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
  error?: string;
}

// Schema migration
db.version(7).stores({
  items: "++id, type, created, modified, *searchWords, context, projectId, sortOrder, completedAt, followUpDate, category",
  lists: "++id, name, type",
  contexts: "++id, name, sortOrder",
  settings: "++id, &key, updatedAt",
  events: "++id, startTime, endTime, projectId, source, recurrenceId, outlookId, syncSource",  // Add outlookId, syncSource
  syncMeta: "++id, &key, updatedAt",        // NEW: Sync metadata
  syncQueue: "++id, timestamp, entityType"  // NEW: Offline sync queue
});
```

### Migration Strategy

1. **Version 7 adds sync tables** — No data migration needed for existing events
2. **outlookId defaults to undefined** — Existing events remain local-only
3. **First sync populates outlookId** — When Outlook events pulled, outlookId set
4. **syncSource inference** — If outlookId exists, syncSource = 'outlook' or 'both'

## Architectural Patterns

### Pattern 1: Token Management with MSAL.js

MSAL.js handles OAuth 2.0 authorization code flow with PKCE for SPAs.

**Configuration:**

```typescript
// src/lib/services/graph/auth.ts
import { PublicClientApplication } from '@azure/msal-browser';

export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
    redirectUri: window.location.origin,
    navigateToLoginRequestUrl: true
  },
  cache: {
    cacheLocation: 'sessionStorage',  // Secure: tokens cleared on tab close
    storeAuthStateInCookie: false
  }
};

export const msalInstance = new PublicClientApplication(msalConfig);

export const loginRequest = {
  scopes: ['Calendars.ReadWrite', 'User.Read']
};
```

**Login Flow:**

```typescript
export async function login() {
  try {
    // Redirect to Microsoft login
    await msalInstance.loginRedirect(loginRequest);
  } catch (error) {
    console.error('Login failed:', error);
  }
}

export async function handleRedirect() {
  // On page load, check for redirect response
  const response = await msalInstance.handleRedirectPromise();
  if (response) {
    // User logged in, tokens cached
    return response.account;
  }
}
```

**Token Acquisition:**

```typescript
export async function getAccessToken(): Promise<string> {
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length === 0) {
    throw new Error('Not authenticated');
  }

  const request = {
    scopes: loginRequest.scopes,
    account: accounts[0]
  };

  try {
    // Try silent token acquisition (from cache or refresh token)
    const response = await msalInstance.acquireTokenSilent(request);
    return response.accessToken;
  } catch (error) {
    // Silent acquisition failed, prompt user
    const response = await msalInstance.acquireTokenRedirect(request);
    return response.accessToken;
  }
}
```

**Security Consideration:** Use `sessionStorage` (default) for better security. Tokens cleared when tab closes. Use `localStorage` only if SSO across browser sessions is required, but increases XSS risk.

**Source:** [Microsoft MSAL.js Caching Documentation](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/caching)

### Pattern 2: Graph API Client with Automatic Token Injection

Wrap fetch with automatic token injection and error handling.

```typescript
// src/lib/services/graph/client.ts
import { getAccessToken } from './auth';

const GRAPH_ENDPOINT = 'https://graph.microsoft.com/v1.0';

export async function graphFetch(url: string, options: RequestInit = {}) {
  const token = await getAccessToken();

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Graph API error: ${error.error?.message || response.statusText}`);
  }

  return response.json();
}

export const graphClient = {
  get: (path: string) => graphFetch(`${GRAPH_ENDPOINT}${path}`),
  post: (path: string, body: any) => graphFetch(`${GRAPH_ENDPOINT}${path}`, {
    method: 'POST',
    body: JSON.stringify(body)
  }),
  patch: (path: string, body: any) => graphFetch(`${GRAPH_ENDPOINT}${path}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  }),
  delete: (path: string) => graphFetch(`${GRAPH_ENDPOINT}${path}`, {
    method: 'DELETE'
  })
};
```

### Pattern 3: Conflict Resolution (Outlook Wins)

When pushing GTD changes to Outlook, use ETag for optimistic concurrency.

```typescript
// src/lib/services/graph/calendar.ts

export async function updateOutlookEvent(event: CalendarEvent) {
  const outlookEvent = mapGTDToOutlook(event);

  try {
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/events/${event.outlookId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${await getAccessToken()}`,
          'Content-Type': 'application/json',
          'If-Match': event.outlookETag  // Optimistic concurrency
        },
        body: JSON.stringify(outlookEvent)
      }
    );

    if (response.status === 412) {
      // Precondition Failed: conflict detected
      await resolveConflict(event.outlookId, event.id);
    } else if (response.ok) {
      // Update successful
      const updated = await response.json();
      await db.events.update(event.id, {
        outlookETag: updated['@odata.etag'],
        lastSyncedAt: new Date()
      });
    }
  } catch (error) {
    // Network error: enqueue for later
    await enqueueSync('update', event);
  }
}

async function resolveConflict(outlookId: string, localEventId: number) {
  // Outlook wins: fetch current Outlook version and overwrite local
  const outlookEvent = await graphClient.get(`/me/events/${outlookId}`);
  const localEvent = mapOutlookToGTD(outlookEvent);

  await db.events.update(localEventId, {
    ...localEvent,
    outlookETag: outlookEvent['@odata.etag'],
    lastSyncedAt: new Date()
  });

  // Notify user
  syncStore.addNotification('Event updated from Outlook due to conflict');
}
```

### Pattern 4: Event Mapping (Outlook ↔ GTD)

Map between Outlook event schema and GTD CalendarEvent schema.

```typescript
// src/lib/services/graph/calendar.ts

interface OutlookEvent {
  id: string;
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: { displayName: string };
  body?: { content: string; contentType: 'text' | 'html' };
  isAllDay?: boolean;
  recurrence?: any;
  '@odata.etag'?: string;
}

export function mapOutlookToGTD(outlookEvent: OutlookEvent): Partial<CalendarEvent> {
  return {
    title: outlookEvent.subject,
    startTime: new Date(outlookEvent.start.dateTime),
    endTime: new Date(outlookEvent.end.dateTime),
    allDay: outlookEvent.isAllDay || false,
    location: outlookEvent.location?.displayName,
    notes: outlookEvent.body?.content,
    outlookId: outlookEvent.id,
    outlookETag: outlookEvent['@odata.etag'],
    syncSource: 'outlook',
    source: 'outlook',
    lastSyncedAt: new Date()
  };
}

export function mapGTDToOutlook(gtdEvent: CalendarEvent): Partial<OutlookEvent> {
  return {
    subject: gtdEvent.title,
    start: {
      dateTime: gtdEvent.startTime.toISOString(),
      timeZone: 'UTC'
    },
    end: {
      dateTime: gtdEvent.endTime.toISOString(),
      timeZone: 'UTC'
    },
    isAllDay: gtdEvent.allDay || false,
    location: gtdEvent.location ? { displayName: gtdEvent.location } : undefined,
    body: gtdEvent.notes ? {
      content: gtdEvent.notes,
      contentType: 'text'
    } : undefined
  };
}
```

### Pattern 5: Reactive Sync State with Svelte 5 Runes

Follow existing store pattern for sync state management.

```typescript
// src/lib/stores/sync.svelte.ts
import type { SyncQueueItem } from '$lib/db/schema';

export class SyncState {
  isSyncing = $state(false);
  lastSyncAt = $state<Date | null>(null);
  syncError = $state<string | null>(null);
  queuedItems = $state<SyncQueueItem[]>([]);
  isOffline = $state(!navigator.onLine);

  queueCount = $derived(this.queuedItems.length);
  syncStatus = $derived(
    this.isSyncing ? 'syncing' :
    this.syncError ? 'error' :
    this.queueCount > 0 ? 'pending' :
    'idle'
  );

  async startSync() {
    if (this.isSyncing) return;

    this.isSyncing = true;
    this.syncError = null;

    try {
      await performDeltaSync();
      await replayQueue();
      this.lastSyncAt = new Date();
    } catch (error) {
      this.syncError = error.message;
    } finally {
      this.isSyncing = false;
    }
  }

  async loadQueue() {
    this.queuedItems = await db.syncQueue.toArray();
  }

  setOffline(offline: boolean) {
    this.isOffline = offline;
  }
}

export const syncStore = new SyncState();
```

### Pattern 6: Background Sync (Future Enhancement)

Service Worker Background Sync API ensures sync completes even if user closes tab.

```typescript
// src/service-worker.js (future enhancement)

// Register sync event
self.addEventListener('sync', (event) => {
  if (event.tag === 'outlook-sync') {
    event.waitUntil(performBackgroundSync());
  }
});

async function performBackgroundSync() {
  // Import sync engine (note: service worker context)
  const { replayQueue, performDeltaSync } = await import('$lib/services/sync/engine');

  await replayQueue();
  await performDeltaSync();
}

// In app code, register background sync
if ('serviceWorker' in navigator && 'sync' in self.registration) {
  await self.registration.sync.register('outlook-sync');
}
```

## Anti-Patterns

### Anti-Pattern 1: Storing Tokens in IndexedDB

**What to avoid:** Storing OAuth tokens manually in IndexedDB or localStorage.

**Why bad:**
- Security risk: tokens accessible to XSS attacks
- MSAL.js already handles secure token storage
- Token refresh logic complex and error-prone

**Instead:** Let MSAL.js manage token storage in sessionStorage/localStorage via its cache configuration. Never manually persist tokens.

### Anti-Pattern 2: Polling for Changes Instead of Delta Queries

**What to avoid:** Fetching all calendar events on every sync to detect changes.

```typescript
// BAD: Fetch all events every time
const events = await graphClient.get('/me/events?$top=1000');
// Compare with local events to find changes
```

**Why bad:**
- Wastes bandwidth (fetches unchanged events)
- Slow for large calendars (1000s of events)
- Hits API rate limits faster

**Instead:** Use delta query pattern with deltaLink tokens to fetch only changes since last sync.

**Source:** [Microsoft Graph Delta Query Documentation](https://learn.microsoft.com/en-us/graph/delta-query-events)

### Anti-Pattern 3: Ignoring ETag for Conflict Detection

**What to avoid:** Updating Outlook events without checking ETag.

```typescript
// BAD: Blindly update without ETag
await graphClient.patch(`/me/events/${outlookId}`, updatedEvent);
```

**Why bad:**
- Last-write-wins without user awareness
- Silently overwrites concurrent Outlook changes
- No conflict detection mechanism

**Instead:** Include `If-Match` header with ETag and handle 412 Precondition Failed responses to resolve conflicts explicitly (Outlook wins in this case).

### Anti-Pattern 4: Synchronous Sync Blocking UI

**What to avoid:** Running sync operations synchronously on UI thread.

```typescript
// BAD: Blocks UI rendering
function handleSyncClick() {
  performDeltaSync();  // Blocks until complete
  replayQueue();       // Blocks until complete
}
```

**Why bad:**
- Freezes UI during sync (poor UX)
- No progress indication
- User can't cancel

**Instead:** Run sync asynchronously with reactive loading state and progress indicators.

```typescript
// GOOD: Async with loading state
async function handleSyncClick() {
  syncStore.isSyncing = true;  // Reactive state
  try {
    await performDeltaSync();
    await replayQueue();
  } finally {
    syncStore.isSyncing = false;
  }
}
```

### Anti-Pattern 5: Separate Database Reads Per Event

**What to avoid:** N+1 query pattern when syncing multiple events.

```typescript
// BAD: Separate query per event
for (const outlookEvent of outlookEvents) {
  const existing = await db.events.where('outlookId').equals(outlookEvent.id).first();
  if (existing) {
    await db.events.update(existing.id, mapOutlookToGTD(outlookEvent));
  } else {
    await db.events.add(mapOutlookToGTD(outlookEvent));
  }
}
```

**Why bad:**
- Slow: 100 events = 200 database operations
- Blocks IndexedDB transaction queue

**Instead:** Bulk read all events with outlookIds, build lookup map, then bulk write.

```typescript
// GOOD: Bulk operations
const outlookIds = outlookEvents.map(e => e.id);
const existingEvents = await db.events.where('outlookId').anyOf(outlookIds).toArray();
const existingMap = new Map(existingEvents.map(e => [e.outlookId, e]));

const toUpdate = [];
const toCreate = [];

for (const outlookEvent of outlookEvents) {
  const existing = existingMap.get(outlookEvent.id);
  if (existing) {
    toUpdate.push({ key: existing.id, changes: mapOutlookToGTD(outlookEvent) });
  } else {
    toCreate.push(mapOutlookToGTD(outlookEvent));
  }
}

await db.events.bulkUpdate(toUpdate);
await db.events.bulkAdd(toCreate);
```

## Suggested Build Order

### Phase 1: Authentication Foundation (1-2 days)

**What:** MSAL.js OAuth flow without sync functionality.

**Deliverables:**
- Install `@azure/msal-browser`
- Create Azure AD app registration (client ID, tenant ID)
- Implement `auth.ts` service with login/logout/token acquisition
- Create `authStore.svelte.ts` with reactive auth state
- Build `OutlookAuthButton.svelte` component
- Add auth button to Calendar page
- Test login flow and token acquisition

**Rationale:** Authentication is prerequisite for all Graph API calls. Build and test in isolation before adding sync complexity.

**Validation:** User can log in, see profile, log out, and token is acquired silently on subsequent page loads.

### Phase 2: Read-Only Outlook Events (2-3 days)

**What:** Pull Outlook events into GTD calendar view (one-way sync).

**Deliverables:**
- Create `client.ts` Graph API wrapper
- Create `calendar.ts` with delta query implementation
- Add schema v7 with `outlookId`, `syncMeta`, `syncQueue` tables
- Implement `mapOutlookToGTD` event mapping
- Create `syncStore.svelte.ts` with sync state
- Build `OutlookSyncButton.svelte` component
- Display Outlook events in EventCalendar component
- Test initial sync and delta sync

**Rationale:** One-way read is lower risk and validates Graph API integration, delta query pattern, and event mapping before introducing write operations.

**Validation:** User can sync Outlook events, see them in calendar, and delta sync fetches only changes.

### Phase 3: Push GTD Events to Outlook (2-3 days)

**What:** Create/update Outlook events from GTD scheduled tasks.

**Deliverables:**
- Implement `createOutlookEvent` and `updateOutlookEvent` in `calendar.ts`
- Implement `mapGTDToOutlook` event mapping
- Add outlookETag conflict detection with If-Match header
- Implement conflict resolution (Outlook wins)
- Trigger sync on event create/update
- Test create, update, and conflict scenarios

**Rationale:** After read works, add write to enable two-way sync. Conflict detection critical before offline queue.

**Validation:** User can create GTD event with scheduled time, it appears in Outlook, and conflicts resolve correctly (Outlook wins).

### Phase 4: Offline Queue (2-3 days)

**What:** Queue mutations when offline, replay when online.

**Deliverables:**
- Implement `queue.ts` with enqueue/replay logic
- Add connectivity detection (online/offline events)
- Enqueue creates/updates/deletes when offline
- Display queue count in UI
- Auto-replay queue on reconnect
- Add retry logic with max retries
- Test offline create → online replay

**Rationale:** Offline support is core to GTD app's offline-first architecture. Build after two-way sync works to avoid debugging both simultaneously.

**Validation:** User can create/update events offline, see queue count, go online, and changes sync to Outlook automatically.

### Phase 5: Polish and Edge Cases (1-2 days)

**What:** Error handling, loading states, user notifications, recurrence support.

**Deliverables:**
- Add loading spinners during sync
- Add error messages for sync failures
- Add success notifications
- Handle token expiration gracefully
- Handle deltaToken expiration (restart full sync)
- Add manual sync trigger
- Document recurrence limitations (if any)
- Test edge cases: network errors, token refresh, large calendars

**Rationale:** Core functionality works, now improve UX and handle edge cases.

**Validation:** User sees clear feedback for all sync states, errors don't crash app, and edge cases handled gracefully.

## Build Order Summary

```
Phase 1: Auth (1-2d)
  └─ Login/logout working, tokens acquired

Phase 2: Read-only sync (2-3d)
  └─ Outlook events displayed in GTD calendar

Phase 3: Two-way sync (2-3d)
  └─ GTD events pushed to Outlook, conflicts resolved

Phase 4: Offline queue (2-3d)
  └─ Offline operations queued and replayed

Phase 5: Polish (1-2d)
  └─ UX improvements and edge case handling

Total: 8-13 days
```

**Key Dependencies:**
- Phase 2 requires Phase 1 (auth needed for Graph API)
- Phase 3 requires Phase 2 (read sync validates API integration)
- Phase 4 requires Phase 3 (offline queue needs two-way sync working)
- Phase 5 requires Phase 4 (polish assumes core features working)

## Sources

**HIGH Confidence Sources:**

- [Microsoft Graph Delta Query for Events](https://learn.microsoft.com/en-us/graph/delta-query-events) — Official delta query documentation
- [Microsoft Graph event:delta API Reference](https://learn.microsoft.com/en-us/graph/api/event-delta?view=graph-rest-1.0) — API endpoint specification
- [MSAL.js Browser Caching](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/caching) — Token storage security guidance
- [MSAL.js Authorization Code Flow Tutorial](https://learn.microsoft.com/en-us/azure/active-directory/develop/tutorial-v2-javascript-auth-code) — SPA authentication implementation

**MEDIUM Confidence Sources:**

- [SvelteKit MSAL SPA Example](https://github.com/andreideak/sveltekit-msal-spa) — Community implementation pattern
- [Azure AD Authentication in SvelteKit](https://medium.com/@varu87/azure-ad-authentication-in-sveltekit-f596cfa8a349) — Integration guide
- [Offline-First with IndexedDB Sync Guide](https://medium.com/@sohail_saifii/implementing-offline-first-with-indexeddb-and-sync-a-real-world-guide-0638c8d01056) — Sync queue pattern
- [Building Offline-First PWA with IndexedDB](https://medium.com/@oluwadaprof/building-an-offline-first-pwa-notes-app-with-next-js-indexeddb-and-supabase-f861aa3a06f9) — Queue-store-detect-sync pattern

**LOW Confidence Sources (WebSearch only):**

- Microsoft Graph API conflict resolution patterns — No official conflict resolution API found; recommendation is to use ETag and implement custom resolution logic
- Background Sync API support — Standard API but implementation varies by browser

---
*Architecture research for: Outlook Calendar Sync*
*Researched: 2026-01-31*
*Confidence: HIGH (delta query, MSAL auth, offline patterns well-documented)*
