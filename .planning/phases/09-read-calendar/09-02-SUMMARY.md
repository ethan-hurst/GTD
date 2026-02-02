---
phase: 09-read-calendar
plan: 02
subsystem: api
tags: [graph-api, msal, outlook, authentication, http-client]

# Dependency graph
requires:
  - phase: 09-01
    provides: "MSAL auth service with acquireToken, loginWithMsal, logoutFromMsal"
provides:
  - Graph API HTTP client with auto-auth and throttle handling
  - Reactive auth store tracking Outlook login state
  - OutlookAuthButton component for connect/disconnect UI
affects: [09-03, 09-04, 09-05, 09-06, 09-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Graph API client pattern: graphFetch wrapper with token injection, retry logic, pagination"
    - "Auth store pattern: Svelte 5 $state runes for reactive authentication state"

key-files:
  created:
    - src/lib/services/graph/client.ts
    - src/lib/stores/auth.svelte.ts
    - src/lib/components/OutlookAuthButton.svelte
  modified: []

key-decisions:
  - "Graph client handles full URLs (nextLink/deltaLink) by checking for https:// prefix"
  - "429 throttling respects Retry-After header with exponential backoff fallback"
  - "401 token refresh triggers once per request, then returns error if still failing"
  - "Auth store disconnect clears all Outlook calendar events and syncMeta"
  - "OutlookAuthButton uses $effect to call authState.init() on mount (SSR-safe)"

patterns-established:
  - "GraphResponse<T> interface for consistent error handling across Graph API calls"
  - "graphFetchAll follows pagination automatically, collecting all items across pages"
  - "Auth store SSR safety with typeof window check in init()"
  - "Confirmation dialog before disconnect to prevent accidental data loss"

# Metrics
duration: 3min
completed: 2026-02-02
---

# Phase 09 Plan 02: Graph Client & Auth UI Summary

**Graph API HTTP client with auto-token injection, 429 retry handling, and pagination; reactive auth store with OutlookAuthButton for connect/disconnect flow**

## Performance

- **Duration:** 3 minutes
- **Started:** 2026-02-02T05:26:35Z
- **Completed:** 2026-02-02T05:29:14Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Graph API client wraps fetch with automatic Bearer token injection via acquireToken()
- Handles 429 throttling with Retry-After delay and exponential backoff (max 3 retries)
- Handles 401 token refresh with single retry, 412 ETag conflicts, network errors
- Extracts @odata.nextLink and @odata.deltaLink for pagination and delta queries
- graphFetchAll convenience function follows pagination automatically
- Auth store tracks isAuthenticated, userName, userEmail reactively with Svelte 5 $state
- OutlookAuthButton shows connect/disconnect states with user info display
- Loading and error states handled with spinner and dismissible error messages
- SSR-safe with browser guards in init()

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Graph API HTTP client** - `9a2ec2c` (feat)
2. **Task 2: Create auth store and OutlookAuthButton component** - `de68c8b` (feat)

## Files Created/Modified
- `src/lib/services/graph/client.ts` - Graph API HTTP wrapper with token injection, retry logic, pagination handling
- `src/lib/stores/auth.svelte.ts` - Reactive auth state store tracking Outlook login state and user profile
- `src/lib/components/OutlookAuthButton.svelte` - Connect/Disconnect UI with user info display and error handling

## Decisions Made

1. **Full URL handling in graphFetch**: When path starts with 'https://', use as-is without prepending GRAPH_BASE_URL. This is needed for nextLink and deltaLink URLs which are full URLs returned by Graph API.

2. **Retry-After header respect**: 429 throttling responses read Retry-After header (in seconds) and delay that exact duration before retrying. Falls back to exponential backoff (2^attempt seconds) if header missing.

3. **Single token refresh attempt**: 401 responses trigger token refresh once. If retry with new token still fails, return error rather than infinite retry loop.

4. **Disconnect data cleanup**: Auth store disconnect() method clears all CalendarEvents where syncSource='outlook' and all syncMeta records before triggering MSAL logout. Prevents orphaned Outlook data.

5. **OutlookAuthButton initialization**: Component uses $effect to call authState.init() on mount rather than in store constructor. This ensures SSR safety and proper initialization timing.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**TypeScript circular reference error**: Initial graphFetchAll implementation caused "implicitly has type 'any'" error on line 136. Fixed by explicitly typing the response variable:

```typescript
const response: GraphResponse<{ value: T[]; '@odata.nextLink'?: string; '@odata.deltaLink'?: string }> = await graphFetch<...>(currentPath);
```

This resolved the inference issue without changing functionality.

## User Setup Required

None - no external service configuration required. MSAL client ID and authority are already configured from Plan 09-01.

## Next Phase Readiness

**Ready for Plan 09-03 (Calendar Sync Service):**
- ✅ graphFetch available for all Graph API calls
- ✅ graphFetchAll available for paginated calendar event queries
- ✅ Auth store tracks login state reactively
- ✅ OutlookAuthButton provides user-facing connect/disconnect flow
- ✅ Error handling patterns established (429, 401, 412, network errors)
- ✅ Delta link extraction ready for incremental sync

**No blockers.** Calendar sync service can now use graphFetch for all API operations and rely on auth store for login state checks.

---
*Phase: 09-read-calendar*
*Completed: 2026-02-02*
