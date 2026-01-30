---
phase: 05-waiting-for-someday-maybe
plan: 01
type: summary
subsystem: data-layer
tags:
  - database
  - schema-migration
  - reactive-state
  - waiting-for
  - someday-maybe
requires:
  - 04-01  # Project operations pattern
  - 03-01  # Context operations pattern
  - 01-01  # Dexie schema foundation
provides:
  - waiting-for-operations
  - someday-maybe-operations
  - waiting-state-store
  - someday-state-store
  - schema-v4
affects:
  - 05-02  # Waiting For UI
  - 05-03  # Someday/Maybe UI
  - 05-04  # Integration with ProcessingFlow
tech-stack:
  added: []
  patterns:
    - Dexie schema migration (v3 → v4)
    - Reactive state with $state/$derived runes
    - MAX_SAFE_INTEGER for nulls-last sorting
    - Undo function return pattern
    - Category filtering with derived state
key-files:
  created:
    - src/lib/stores/waiting.svelte.ts
    - src/lib/stores/someday.svelte.ts
  modified:
    - src/lib/db/schema.ts
    - src/lib/db/operations.ts
decisions:
  - title: "Add followUpDate and category fields to GTDItem"
    rationale: "Waiting-for items need follow-up tracking, someday/maybe items benefit from categorization"
    alternatives: "Separate tables for each type (rejected - GTD items share most fields)"
    outcome: "Extended GTDItem interface with optional fields"
  - title: "Sort waiting items by followUpDate with nulls last"
    rationale: "Items with follow-up dates should appear first, items without dates appear at end"
    alternatives: "Nulls first (rejected - less useful), separate lists (rejected - more complex)"
    outcome: "Used MAX_SAFE_INTEGER pattern from getAllNextActions"
  - title: "Export SOMEDAY_CATEGORIES constant with 8 predefined categories"
    rationale: "Provides helpful organization without forcing rigid structure"
    alternatives: "Free-text only (rejected - less discoverable), hardcoded in UI (rejected - not reusable)"
    outcome: "Exported from store file for UI component import"
  - title: "Overdue detection computed on load, not derived"
    rationale: "followUpDate comparison needs Date.now() which isn't reactive"
    alternatives: "Derived with $derived.by (rejected - would recompute constantly)"
    outcome: "Computed once in loadItems(), stored in Set for fast lookup"
metrics:
  duration: 1.95 min
  completed: 2026-01-30
---

# Phase 5 Plan 01: Waiting For & Someday/Maybe Data Layer Summary

**One-liner:** Schema v4 with followUpDate + category fields, 6 new database operations, and two reactive state stores with overdue detection and category filtering.

## What Was Built

Created the data layer foundation for Waiting For and Someday/Maybe features:

**Schema Migration (v3 → v4):**
- Added `followUpDate?: Date` to GTDItem for waiting-for follow-up tracking
- Added `category?: string` to GTDItem for someday/maybe categorization
- Created schema version 4 with new field indexes

**Waiting For Operations (3 functions):**
- `getAllWaitingFor()`: Query, filter completed, sort by followUpDate (nulls last) then created
- `resolveWaitingFor(id)`: Mark complete, return undo function
- `addWaitingFor(title, delegatedTo, followUpDate?, projectId?, notes?)`: Create new waiting item

**Someday/Maybe Operations (3 functions):**
- `getAllSomedayMaybe()`: Query, filter completed, sort by created date
- `promoteSomedayToActive(id, newType)`: Change type to 'project' or 'next-action', clear category
- `addSomedayItem(title, notes?, category?)`: Create new someday item

**Reactive State Stores:**
- `WaitingForState`: Overdue detection via Set, expandable items, item count
- `SomedayMaybeState`: Category filtering via $derived, expandable items, filtered count
- `SOMEDAY_CATEGORIES`: 8 predefined categories (Projects, Learning, Travel, Hobbies, Books & Media, Skills, Places to Visit, Things to Try)

## Implementation Notes

**Followed established patterns:**
- Schema migration pattern from v1→v2→v3, added v4 without breaking previous versions
- Operations pattern from actions/projects (undo functions, date handling, CRUD)
- State store pattern from ActionState/ProjectState (Svelte 5 runes, derived state, singletons)

**Key technical decisions:**
- Used MAX_SAFE_INTEGER for nulls-last sorting (same pattern as getAllNextActions)
- Computed overdue Set on load rather than derived (Date.now() isn't reactive)
- Category filtering via $derived for reactive updates when category selection changes
- Exported SOMEDAY_CATEGORIES from store file for easy UI import

## Verification Results

All verification checks passed:

- ✅ TypeScript compilation: `npx tsc --noEmit` passes with zero errors
- ✅ Schema fields: followUpDate and category present in GTDItem interface
- ✅ Schema version: db.version(4) block exists
- ✅ Operations: All 6 functions (getAllWaitingFor, resolveWaitingFor, addWaitingFor, getAllSomedayMaybe, promoteSomedayToActive, addSomedayItem) implemented
- ✅ State stores: waiting.svelte.ts and someday.svelte.ts exist with correct exports
- ✅ Build: `npm run build` succeeds
- ✅ Exports verified: waitingForState, somedayMaybeState, SOMEDAY_CATEGORIES all exported

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

1. **Schema extension over new tables**: Extended GTDItem with optional fields rather than creating separate tables for waiting/someday items. Rationale: All GTD items share most fields (title, notes, dates, projectId), only a few fields differ by type.

2. **MAX_SAFE_INTEGER nulls-last pattern**: Used same sorting approach as getAllNextActions for consistent behavior across the app.

3. **Overdue detection in loadItems()**: Computed overdue Set once on load rather than using $derived, because Date.now() comparison isn't reactive and would cause constant recomputation.

4. **Exported SOMEDAY_CATEGORIES constant**: Provides helpful categorization without forcing rigid structure. UI components can import and display as filter options.

## Testing Notes

**Manual verification performed:**
- TypeScript compilation passes
- All exports verified via grep
- Build succeeds without errors

**Suggested follow-up testing (in UI plans):**
- Verify schema migration from v3→v4 preserves existing data
- Test overdue detection with past/future followUpDates
- Test category filtering with various categories
- Test undo function for resolveWaitingFor

## Next Phase Readiness

**Blockers:** None

**Concerns:** None

**Ready for next plans:**
- ✅ 05-02 (Waiting For UI) - operations and state store ready
- ✅ 05-03 (Someday/Maybe UI) - operations, state store, and categories ready
- ✅ 05-04 (Integration) - all operations available for ProcessingFlow enhancement

## Performance

**Execution:** 1.95 min (2 tasks)
- Task 1 (Schema + Operations): ~0.95 min
- Task 2 (State Stores): ~1.00 min

**Build time:** 1.43s (unchanged from baseline)

## Commits

| Hash    | Type | Description |
|---------|------|-------------|
| 0ca3adc | feat | Extend schema and create waiting/someday operations |
| 31a155d | feat | Create WaitingForState and SomedayMaybeState reactive stores |

## Lessons Learned

**What went well:**
- Following established patterns made implementation straightforward
- Schema migration pattern scales well (v1→v2→v3→v4 without issues)
- Svelte 5 runes pattern continues to provide clean reactive state

**What to improve:**
- None - execution was smooth

## Knowledge for Future Phases

**For UI developers (05-02, 05-03):**
- Import `waitingForState` from `$lib/stores/waiting.svelte.ts`
- Import `somedayMaybeState` and `SOMEDAY_CATEGORIES` from `$lib/stores/someday.svelte.ts`
- Call `loadItems()` on mount to populate state
- Use `isOverdue(id)` for styling waiting-for items
- Use `filteredItems` for category-filtered someday/maybe view

**For integration (05-04):**
- `addWaitingFor()` requires delegatedTo parameter
- `promoteSomedayToActive()` automatically clears category field
- `resolveWaitingFor()` returns undo function (same pattern as completeAction)
