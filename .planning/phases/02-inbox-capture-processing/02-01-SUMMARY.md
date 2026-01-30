---
phase: 02-inbox-capture-processing
plan: 01
subsystem: database
tags: [dexie, indexeddb, full-text-search, svelte-5-state-runes, intl-api]

# Dependency graph
requires:
  - phase: 01-foundation-storage
    provides: Dexie v1 schema with GTDItem and operations layer
provides:
  - Dexie v2 schema with multi-valued searchWords index for full-text search
  - Automatic tokenization via Dexie hooks on item creation/update
  - Search utilities with prefix matching and active-type filtering
  - Relative time formatter using Intl.RelativeTimeFormat
  - Reactive inbox state store with Svelte 5 $state runes
affects: [02-02, 02-03, 02-04, Phase 3 UI components requiring search and inbox state]

# Tech tracking
tech-stack:
  added: [svelte-5-french-toast]
  patterns: [Dexie hooks for derived fields, multi-valued indexes, $state rune class stores, Intl.RelativeTimeFormat]

key-files:
  created:
    - src/lib/db/search.ts
    - src/lib/utils/time.ts
    - src/lib/stores/inbox.svelte.ts
  modified:
    - src/lib/db/schema.ts
    - package.json

key-decisions:
  - "Use Dexie multi-valued index (*searchWords) for full-text search over third-party search libraries"
  - "Tokenize on write (hooks) rather than read for better search performance"
  - "Filter searches to active types only (inbox, next-action, project, waiting) excluding someday"
  - "Use native Intl.RelativeTimeFormat for time formatting over moment.js or date-fns"

patterns-established:
  - "Dexie hooks pattern: Automatic field population on creating/updating for derived data"
  - "Multi-valued index pattern: Use *fieldName in schema for array-based search indexes"
  - "Search tokenization: Split on whitespace, lowercase, filter words < 2 chars, deduplicate"
  - "$state rune class pattern: Class-based reactive stores with derived properties and async methods"

# Metrics
duration: 2.6min
completed: 2026-01-30
---

# Phase 2 Plan 01: Data Layer & Utilities Summary

**Dexie v2 with searchable multi-valued index, automatic tokenization hooks, relative time formatting, and reactive inbox state store**

## Performance

- **Duration:** 2.6 min
- **Started:** 2026-01-30T12:51:29Z
- **Completed:** 2026-01-30T12:54:05Z
- **Tasks:** 2
- **Files modified:** 5 (3 created, 2 modified)

## Accomplishments
- Extended database schema to v2 with searchWords multi-valued index and new GTDItem fields (context, delegatedTo, projectId, completedAt)
- Implemented automatic search tokenization via Dexie creating/updating hooks
- Created full-text search with prefix matching, active-type filtering, and multi-word query support
- Built relative time formatter using native Intl.RelativeTimeFormat with appropriate unit selection
- Established reactive inbox state store using Svelte 5 $state runes pattern with selection, expansion, and processing mode

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and migrate database schema with search indexes** - `154e1c8` (feat)
2. **Task 2: Create time formatting utility and shared inbox state store** - `26e6436` (feat)

## Files Created/Modified

**Created:**
- `src/lib/db/search.ts` - Tokenization and search query utilities for full-text search via searchWords index
- `src/lib/utils/time.ts` - Relative time formatting using Intl.RelativeTimeFormat with unit selection
- `src/lib/stores/inbox.svelte.ts` - Reactive inbox state with $state runes for items, selection, expansion, processing mode

**Modified:**
- `src/lib/db/schema.ts` - Migrated to Dexie v2, added searchWords/context/delegatedTo/projectId/completedAt fields, added hooks for tokenization
- `package.json` - Added svelte-5-french-toast dependency

## Decisions Made

**1. Use Dexie multi-valued index for full-text search**
- Rationale: Native IndexedDB feature, no additional libraries, excellent performance for prefix matching
- Pattern: `*searchWords` in schema definition creates multi-valued index on string array

**2. Tokenize on write (via hooks) rather than read**
- Rationale: Better search performance - tokenization happens once at write time, not repeatedly on every search
- Implementation: Dexie hooks on creating/updating automatically populate searchWords field

**3. Filter searches to active types only**
- Rationale: "Someday/Maybe" items are intentionally deferred and shouldn't appear in quick search results
- Active types: inbox, next-action, project, waiting

**4. Use native Intl.RelativeTimeFormat**
- Rationale: Zero dependencies, native browser API, excellent localization support, appropriate for this use case
- No need for moment.js or date-fns for simple relative time formatting

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**TypeScript hook parameter types**
- Issue: Dexie hook parameters typed as `Object` by default, causing property access errors
- Resolution: Added explicit type annotations (`obj: GTDItem`, `modifications: Partial<GTDItem>`) to hook callbacks
- Impact: No functional change, just TypeScript type safety

## Next Phase Readiness

**Ready for phase 2 UI plans (02-02, 02-03, 02-04):**
- ✅ Database schema v2 with search indexes deployed
- ✅ Search utilities ready for quick-add autocomplete
- ✅ Relative time formatter ready for inbox item display
- ✅ Reactive inbox state store ready for component integration
- ✅ All TypeScript compilation passes
- ✅ Production build succeeds

**No blockers.** Phase 2 UI components can now import and use:
- `searchItems(query)` from `lib/db/search`
- `formatRelativeTime(date)` from `lib/utils/time`
- `inboxState` singleton from `lib/stores/inbox.svelte`

---
*Phase: 02-inbox-capture-processing*
*Completed: 2026-01-30*
