---
phase: 09
plan: 01
subsystem: calendar-sync
tags: [schema, msal, oauth, microsoft-graph, dexie]
requires:
  - 07-06  # Calendar schema foundation
  - 08.5-04  # Sync infrastructure patterns
provides:
  - outlook-sync-schema  # CalendarEvent fields for Outlook integration
  - syncmeta-table  # Calendar sync metadata storage
  - msal-auth-service  # Microsoft Graph authentication
affects:
  - 09-02  # Graph API client (depends on auth service)
  - 09-03  # Calendar sync service (depends on schema + auth)
tech-stack:
  added:
    - "@azure/msal-browser@^4.28.1"  # Microsoft Authentication Library
  patterns:
    - SSR-safe MSAL initialization with browser guard
    - Silent token acquisition with redirect fallback
    - Session storage for MSAL cache (cleared on tab close)
key-files:
  created:
    - src/lib/services/graph/auth.ts
    - .planning/phases/09-read-calendar/09-01-USER-SETUP.md
  modified:
    - src/lib/db/schema.ts
    - package.json
key-decisions:
  - decision: "Pin MSAL to 4.x range (v5.x has peer dependency conflicts)"
    rationale: "Known risk from research - v5.x not stable until Q1/Q2 2026"
    alternatives: "Wait for v5 stabilization (blocks Outlook sync)"
    impact: "Low - v4.x is stable and production-ready"
  - decision: "Use session storage for MSAL cache (not local storage)"
    rationale: "Security - credentials cleared on tab close"
    alternatives: "Local storage (persists across sessions but higher risk)"
    impact: "Users re-authenticate per browser session (trade-off for security)"
  - decision: "Silent token acquisition with redirect fallback"
    rationale: "Best UX - most renewals happen silently, redirect only when required"
    alternatives: "Always redirect (worse UX), popup (blocked by browsers)"
    impact: "Seamless token refresh for users"
duration: 2m
completed: 2026-02-02
---

# Phase 9 Plan 01: Outlook Sync Schema & Auth Foundation Summary

Extended Dexie schema with Outlook sync fields, created syncMeta table for calendar metadata tracking, installed MSAL 4.x, and built SSR-safe authentication service with silent token refresh.

## Performance

**Duration:** 2 minutes
**Started:** 2026-02-02 05:20 UTC
**Completed:** 2026-02-02 05:23 UTC

**Tasks:** 2/2 complete
**Files modified:** 3 (schema.ts, package.json, package-lock.json)
**Files created:** 2 (auth.ts, USER-SETUP.md)

## Accomplishments

### 1. Schema Extension for Outlook Sync

Extended the CalendarEvent interface with five new optional fields:

- `outlookId?: string` — Microsoft Graph event ID (primary key for Outlook events)
- `outlookETag?: string` — ETag for optimistic concurrency control (conflict detection)
- `syncSource?: 'manual' | 'ics-import' | 'outlook'` — Event origin tracking
- `lastSyncedAt?: Date` — Last successful sync timestamp
- `outlookCalendarId?: string` — Parent Outlook calendar reference

These fields enable:

- Bi-directional sync with conflict detection
- Multi-source event tracking (user-created vs. imported vs. synced)
- Incremental sync with timestamp-based filtering

### 2. SyncMeta Table

Created new SyncMeta interface and table for tracking Outlook calendar subscriptions:

```typescript
export interface SyncMeta {
  id: string;          // UUID
  calendarId: string;  // Outlook calendar ID
  calendarName: string; // Display name
  deltaLink?: string;  // Last delta link URL for incremental sync
  lastSyncAt?: Date;   // When this calendar was last synced
  enabled: boolean;    // Whether user wants to see this calendar
  color?: string;      // Color override for events from this calendar
}
```

This enables:

- Delta query support (incremental sync using Microsoft's delta tokens)
- Per-calendar enable/disable toggles
- Color customization for multi-calendar views

### 3. Dexie Version 13

Created new schema version with:

- **syncMeta table**: `id, calendarId, enabled` indexes
- **events table**: Added `outlookId, syncSource` indexes for efficient lookups

Index strategy:

- `outlookId` index enables O(1) lookup during sync (detect existing events)
- `syncSource` index supports filtering by origin (show only Outlook events)

### 4. MSAL Authentication Service

Installed `@azure/msal-browser@^4.28.1` and created `src/lib/services/graph/auth.ts` with five exports:

**getMsalInstance()** — Lazy singleton initialization (SSR-safe)

- Browser guard prevents SSR crashes
- Handles redirect promise completion (OAuth callback flow)

**loginWithMsal()** — Initiate OAuth redirect flow

- Requests `Calendars.ReadWrite` and `User.Read` scopes
- Redirects to Microsoft login

**logoutFromMsal()** — Sign out and clear cache

- Redirects to Microsoft logout endpoint
- Resets local MSAL instance

**acquireToken()** — Get access token with silent-first strategy

```typescript
try {
  // Silent renewal (no UI)
  const result = await instance.acquireTokenSilent({
    scopes: SCOPES,
    account: accounts[0],
  });
  return result.accessToken;
} catch (error) {
  if (error instanceof InteractionRequiredAuthError) {
    // Redirect for re-authentication (refresh token expired)
    await instance.acquireTokenRedirect({ scopes: SCOPES });
  }
}
```

**getAuthenticatedAccount()** — Check current auth status

- Returns account object or null
- Used for UI state (show login vs. logout button)

### 5. User Setup Documentation

Created comprehensive setup guide covering:

- Azure Portal app registration
- Redirect URI configuration (SPA type)
- API permissions (Calendars.ReadWrite, User.Read)
- Environment variable configuration
- Common error troubleshooting

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extend Dexie schema for Outlook sync | 5c3597b | schema.ts |
| 2 | Install MSAL and create auth service | 30bf1fb | package.json, package-lock.json, auth.ts |

## Files Created/Modified

**Created:**

- `src/lib/services/graph/auth.ts` — MSAL authentication service (5 exports)
- `.planning/phases/09-read-calendar/09-01-USER-SETUP.md` — Azure setup guide

**Modified:**

- `src/lib/db/schema.ts` — Added 5 fields to CalendarEvent, created SyncMeta interface, added version 13
- `package.json` — Added @azure/msal-browser@^4.28.1
- `package-lock.json` — Dependency tree update

## Decisions Made

### 1. MSAL Version Pinning

**Decision:** Pin to `@azure/msal-browser@^4.28.1` (not v5.x)

**Rationale:**

- v5.x has peer dependency conflicts with current tooling
- Research flagged this as known risk (expected Q1/Q2 2026 stabilization)
- v4.x is production-ready and stable

**Alternatives:**

- Wait for v5 stabilization (blocks entire Outlook sync feature)
- Use different auth library (would require re-research)

**Impact:** Low - v4.x meets all requirements, upgrade path clear when v5 stabilizes

### 2. Session Storage for MSAL Cache

**Decision:** Use `sessionStorage` for MSAL token cache (not `localStorage`)

**Rationale:**

- Security best practice - credentials cleared on tab close
- Reduces attack surface for XSS/token theft
- Aligns with Microsoft security recommendations

**Alternatives:**

- `localStorage` — Persists across sessions (higher convenience, higher risk)
- In-memory only — Most secure but re-auth on every page refresh (poor UX)

**Impact:** Users re-authenticate per browser session (acceptable trade-off for security)

### 3. Silent-First Token Acquisition

**Decision:** Implement `acquireTokenSilent` with `acquireTokenRedirect` fallback

**Rationale:**

- Best UX - most token renewals happen silently (no UI interruption)
- Redirect only when refresh token expires (rare - typically 90 days)
- Popup flow blocked by modern browsers (not viable)

**Alternatives:**

- Always redirect (degrades UX with unnecessary redirects)
- Popup flow (browser pop-up blockers prevent this)

**Impact:** Seamless experience for users - invisible token refresh in 99% of cases

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Both tasks completed without blockers.

**Pre-existing TypeScript warnings** (not related to this plan):

- ActionItem.svelte has accessibility warnings (pre-existing)
- Type mismatches in sync tests (pre-existing from 08.5)

These warnings do not block build or functionality.

## User Setup Required

**Service:** Microsoft Entra ID (Azure AD)

Users must complete Azure Portal configuration before calendar sync can function.

**See:** `.planning/phases/09-read-calendar/09-01-USER-SETUP.md` for step-by-step guide.

**Required environment variables:**

- `PUBLIC_MSAL_CLIENT_ID` — Azure app registration client ID
- `PUBLIC_MSAL_AUTHORITY` — OAuth authority URL (typically https://login.microsoftonline.com/common)

**Configuration tasks:**

1. Register new application in Azure Portal
2. Set redirect URI to SPA type (http://localhost:5173 for dev)
3. Add API permissions: Calendars.ReadWrite, User.Read
4. Copy client ID to .env file

**Estimated setup time:** 5-10 minutes (first-time Azure users may need 15-20 minutes)

## Next Phase Readiness

**Ready for Plan 09-02:** Graph API Client

**Dependencies satisfied:**

- ✅ MSAL authentication service available (getMsalInstance, acquireToken)
- ✅ Schema supports Outlook event storage (outlookId, outlookETag, etc.)
- ✅ User setup documentation available (09-01-USER-SETUP.md)

**Blockers:** None

**Known risks for Phase 9:**

1. **Corporate IT approval:** Organizations with Conditional Access policies may require admin consent for API permissions. Timeline unknown (depends on IT department).

2. **Delta token expiration:** Microsoft Graph delta tokens expire after 7 days. Plan 09-03 must implement `syncStateNotFound` error handling and fall back to full sync.

3. **Rate limits:** Graph API rate limits not published. Production monitoring needed to detect 429 responses.

**Recommendations for next plan:**

- Plan 09-02 should implement retry logic with exponential backoff (Graph API may return transient errors)
- Consider implementing a token refresh indicator in UI (user feedback during silent renewal)
- Add error boundary for MSAL initialization failures (graceful degradation if auth unavailable)
