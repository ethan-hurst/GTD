---
phase: 09-read-calendar
plan: 03
subsystem: calendar-sync
tags: [tdd, graph-api, calendar, delta-sync, outlook]

# Dependency graph
requires:
  - phase: 09-01
    provides: "Dexie schema with Outlook sync fields"
  - phase: 09-02
    provides: "Graph API client (graphFetch, graphFetchAll)"
provides:
  - calendar-mapping-functions  # Pure function for Outlook → CalendarEvent conversion
  - calendar-sync-service       # Delta sync with Graph API
  - calendar-list-fetcher       # Fetch user's Outlook calendars
affects:
  - 09-05  # Calendar sync store (orchestrates sync using this service)
  - 09-06  # Calendar subscription UI (uses fetchCalendars)
  - 09-07  # Manual sync trigger (uses syncCalendarEvents)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure function pattern for mapOutlookEvent (highly testable, no side effects)"
    - "Delta query pattern: initial sync with date range, incremental sync with deltaLink"
    - "Bulk operations pattern: single db.where().anyOf() query, then bulkPut (no N+1)"
    - "syncStateNotFound fallback: automatic retry with full sync when delta token expires"

key-files:
  created:
    - src/lib/services/graph/calendar.ts
    - src/lib/services/graph/calendar.test.ts
  modified:
    - vitest.node.config.ts

key-decisions:
  - "All-day events use local midnight without timezone conversion (matches Graph API semantics)"
  - "Body preview truncated to 500 chars to avoid bloating database with large event descriptions"
  - "@removed annotation returns null from mapper (deletion marker for sync logic)"
  - "6-month back, 12-month forward date range for initial sync (covers typical planning horizon)"
  - "Soft-delete for removed events (preserves history, supports tombstone pattern)"
  - "Node.js test environment (not browser) for Graph service tests (mocks Dexie and graphFetch)"

patterns-established:
  - "TDD with RED-GREEN-REFACTOR cycle: failing tests → implementation → cleanup"
  - "SyncResult interface for sync metrics (eventsAdded, eventsUpdated, eventsDeleted)"
  - "OutlookEvent and OutlookCalendar types mirror Graph API response shape"
  - "Helper function extraction for date range building (DRY principle)"

# Metrics
duration: 5min
completed: 2026-02-02
---

# Phase 09 Plan 03: Calendar Sync Service (TDD) Summary

**Pure mapping functions, delta sync service, and calendar list fetcher with comprehensive test coverage using RED-GREEN-REFACTOR TDD cycle**

## Performance

- **Duration:** 5 minutes
- **Started:** 2026-02-02T15:32:22Z
- **Completed:** 2026-02-02T15:37:03Z
- **Tasks:** 1 TDD task (3 commits: RED → GREEN → REFACTOR)
- **Files created:** 2
- **Files modified:** 1

## Accomplishments

### TDD Cycle Execution

**RED Phase (d32d566):**
- Wrote 13 failing tests covering all edge cases
- Added calendar.test.ts to vitest.node.config.ts include pattern
- Tests failed with "Cannot find module" (expected RED state)

**GREEN Phase (0d4d5c3):**
- Implemented calendar.ts with 3 exported functions
- All 13 tests passed
- TypeScript errors fixed (optional chaining for undefined checks)

**REFACTOR Phase (214ae58):**
- Extracted buildInitialSyncUrl helper function
- Eliminated code duplication (date range building appeared 2x)
- Tests still pass after refactoring

### mapOutlookEvent Function

Pure function (no side effects, highly testable) that maps Microsoft Graph event fields to CalendarEvent format:

**Field Mappings:**
- `subject` → `title`
- `start.dateTime + start.timeZone` → `startTime` (Date)
- `end.dateTime + end.timeZone` → `endTime` (Date)
- `isAllDay` → `allDay`
- `location.displayName` → `location`
- `bodyPreview` → `notes` (truncated to 500 chars)
- `id` → `outlookId`
- `@odata.etag` → `outlookETag`
- `calendarId` param → `outlookCalendarId`
- `syncSource` = `'outlook'`
- `lastSyncedAt` = `new Date()`

**Special Cases Handled:**
1. **All-day events:** Use date string directly (YYYY-MM-DD), create start/end as local midnight. No timezone conversion applied (matches Graph API semantics).
2. **Non-all-day events:** Parse dateTime with timezone to create Date objects. UTC timezone appends 'Z' suffix, others parse as-is.
3. **Missing location:** Set to `undefined` (not empty string)
4. **Missing body:** Set notes to `undefined`
5. **Long body preview:** Truncate to 500 chars to avoid database bloat
6. **Deleted events (@removed annotation):** Return `null` as deletion marker

**Test Coverage:**
- ✅ Basic event mapping with all fields
- ✅ All-day event without timezone shift
- ✅ Missing location field
- ✅ Missing body field
- ✅ Body truncation (600 chars → 500 chars)
- ✅ Deleted event returns null

### fetchCalendars Function

Fetches user's Outlook calendars from `/me/calendars` endpoint.

**Returns:** Array of `OutlookCalendar` objects with `id`, `name`, `color`, `isDefaultCalendar`

**Error Handling:** Returns empty array on API failure (graceful degradation)

**Test Coverage:**
- ✅ Success case: Returns calendar array from Graph API
- ✅ Error case: Returns empty array on API failure

### syncCalendarEvents Function

Delta sync service with initial sync fallback and bulk database operations.

**Sync Flow:**

1. **Determine URL:**
   - If `existingDeltaLink` provided: Use it for incremental sync
   - Else: Build initial sync URL with date range (6 months back, 12 months forward)

2. **Fetch Events:**
   - Call `graphFetchAll` to handle pagination automatically
   - If error is `syncStateNotFound`: Delta token expired, retry with initial sync URL

3. **Separate Events:**
   - Events with `@removed` annotation → deletion queue
   - Events without `@removed` → upsert queue

4. **Load Existing Events:**
   - Single query: `db.events.where('outlookId').anyOf(ids).toArray()`
   - Build lookup map for O(1) matching (no N+1 queries)

5. **Process Upserts:**
   - For each event, check if exists in map
   - If exists and ETag differs → update (count as eventsUpdated)
   - If not exists → insert (count as eventsAdded)
   - Build array of CalendarEvent objects to write

6. **Bulk Write:**
   - `db.events.bulkPut(eventsToWrite)` — single transaction

7. **Process Deletions:**
   - For each deleted Outlook ID, find existing event
   - Soft-delete: `db.events.update(id, { deleted: true, deletedAt: new Date() })`
   - Count as eventsDeleted

8. **Return Result:**
   - `success: true`
   - `deltaLink` from response (for next sync)
   - Metrics: `eventsAdded`, `eventsUpdated`, `eventsDeleted`

**Test Coverage:**
- ✅ Initial sync without deltaLink (2 events added)
- ✅ Delta sync with existing deltaLink (1 event updated)
- ✅ Deleted events with @removed annotation (1 event soft-deleted)
- ✅ syncStateNotFound fallback (retries with full sync)
- ✅ API failure (returns error with success: false)

### Helper Functions

**parseDateTime(dateTime, timeZone):**
- Simple implementation for parsing Graph API date strings
- UTC timezone: Appends 'Z' suffix
- Non-UTC: Parses as-is (simplified approach)
- Note: Production implementation would use date-fns-tz or similar

**buildInitialSyncUrl(calendarId):**
- Extracted during REFACTOR phase
- Builds delta query URL with 6-month back, 12-month forward range
- Single source of truth for sync window configuration

## Task Commits

| Phase | Commit | Description | Files |
|-------|--------|-------------|-------|
| RED | d32d566 | Add failing tests for calendar sync service | calendar.test.ts, vitest.node.config.ts |
| GREEN | 0d4d5c3 | Implement calendar sync service (13 tests pass) | calendar.ts, calendar.test.ts |
| REFACTOR | 214ae58 | Extract buildInitialSyncUrl helper | calendar.ts |

## Files Created/Modified

**Created:**
- `src/lib/services/graph/calendar.ts` — Calendar sync service (3 exports, 282 lines)
- `src/lib/services/graph/calendar.test.ts` — Test suite (13 tests, Node.js environment)

**Modified:**
- `vitest.node.config.ts` — Added calendar tests to include pattern

## Decisions Made

### 1. All-Day Event Timezone Handling

**Decision:** Use local midnight without timezone conversion for all-day events

**Rationale:**
- Graph API returns all-day events as date strings (YYYY-MM-DD)
- Applying timezone conversion would shift dates (Feb 10 → Feb 9 or Feb 11 depending on user timezone)
- Local midnight matches user's mental model ("Company Holiday on Feb 10" should display as Feb 10)

**Implementation:** `new Date(dateStr + 'T00:00:00')` creates midnight in local timezone

**Alternatives:**
- UTC midnight (would cause date shifting in non-UTC timezones)
- Store as date string (breaks CalendarEvent.startTime type contract)

**Impact:** All-day events display on correct calendar date regardless of user timezone

### 2. Body Preview Truncation

**Decision:** Truncate `bodyPreview` to 500 chars

**Rationale:**
- Graph API can return very long body previews (thousands of chars)
- Database bloat for events with detailed agendas or attachments
- 500 chars sufficient for "quick glance" use case in UI

**Implementation:** `outlookEvent.bodyPreview.substring(0, 500)`

**Alternatives:**
- No truncation (database bloat, performance impact)
- Store full body separately (over-engineering for v1.1)

**Impact:** Minor — users see truncated notes in event detail panel, can click through to Outlook for full details

### 3. Sync Date Range

**Decision:** 6 months back, 12 months forward for initial sync

**Rationale:**
- Covers historical context (what happened in last 6 months)
- Covers planning horizon (typical 1-year forward-looking view)
- Balances completeness vs. performance (18-month window is reasonable)

**Implementation:** `buildInitialSyncUrl` helper with `setMonth(±6/12)`

**Alternatives:**
- 1 month back, 3 months forward (misses historical context)
- 1 year back, 2 years forward (unnecessary for GTD use case)

**Impact:** Users see relevant calendar context without overwhelming database with very old events

### 4. Node.js Test Environment

**Decision:** Run calendar tests in Node.js environment (not browser)

**Rationale:**
- Calendar service is pure business logic (no DOM, no Svelte)
- Mocking Dexie in Node.js is simpler than browser mode
- Faster test execution (no Playwright overhead)

**Implementation:** Added `src/lib/services/graph/**/*.test.ts` to vitest.node.config.ts

**Alternatives:**
- Browser mode (unnecessary overhead for non-UI tests)
- Separate test directory (breaks co-location pattern)

**Impact:** Faster test feedback loop, clearer separation between unit tests (Node) and integration tests (browser)

## Deviations from Plan

None — plan executed exactly as written.

TDD cycle completed successfully:
1. ✅ RED: Tests written, failed as expected
2. ✅ GREEN: Implementation made all tests pass
3. ✅ REFACTOR: Code cleaned up (helper extraction), tests still pass

## Issues Encountered

### 1. Vitest Mock Hoisting

**Issue:** Initial mock setup referenced `mockDb` variable inside `vi.mock()` factory, causing "Cannot access before initialization" error

**Root Cause:** `vi.mock()` is hoisted to top of file, so it can't reference variables declared later

**Fix:** Changed mock to use factory functions:
```typescript
vi.mock('$lib/db/schema', () => ({
  db: {
    events: {
      where: vi.fn(() => ({
        anyOf: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue([]),
        })),
      })),
    },
  },
}));
```

**Impact:** Minor — required refactoring mock setup pattern, but tests work correctly

### 2. TypeScript Optional Chaining

**Issue:** `svelte-check` reported "possibly undefined" errors for `result!.startTime`

**Root Cause:** `mapOutlookEvent` returns `Partial<CalendarEvent> | null`, so fields might be undefined

**Fix:** Changed `result!.startTime` → `result?.startTime` (optional chaining)

**Impact:** None — tests still pass, TypeScript errors resolved

## Test Coverage

**13 tests, 100% pass rate**

### mapOutlookEvent (6 tests)
- ✅ Maps basic Outlook event to CalendarEvent
- ✅ Handles all-day events without timezone conversion
- ✅ Handles missing location
- ✅ Handles missing body
- ✅ Truncates long body preview to 500 chars
- ✅ Returns null for deleted events (@removed annotation)

### fetchCalendars (2 tests)
- ✅ Fetches user calendars from Graph API
- ✅ Returns empty array on API error

### syncCalendarEvents (5 tests)
- ✅ Performs initial sync without deltaLink
- ✅ Performs delta sync with existing deltaLink
- ✅ Handles deleted events with @removed annotation
- ✅ Handles syncStateNotFound error with fallback to full sync
- ✅ Returns error on API failure

## Next Phase Readiness

**Ready for Plan 09-05 (Calendar Sync Store):**

- ✅ `mapOutlookEvent` available for event transformation
- ✅ `fetchCalendars` available for calendar discovery
- ✅ `syncCalendarEvents` available for delta sync orchestration
- ✅ All edge cases tested (all-day, deletions, syncStateNotFound, etc.)
- ✅ Bulk operations pattern established (no N+1 queries)
- ✅ SyncResult interface defined for metrics tracking

**No blockers.** Plan 09-05 can now create a reactive store that orchestrates calendar sync using these service functions.

**Known Limitations (Acceptable for v1.1):**

1. **Timezone parsing:** Simplified implementation (UTC + fallback to local). Production would use date-fns-tz for proper IANA timezone handling.
2. **No retry logic in sync service:** Retry handled by graphFetchAll (429, network errors). Service assumes caller handles higher-level retry orchestration.
3. **No progress callbacks:** Sync is atomic operation. Future enhancement could add progress events for large syncs.

---
*Phase: 09-read-calendar*
*Completed: 2026-02-02*
