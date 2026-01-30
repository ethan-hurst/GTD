---
phase: 08-calendar-view
plan: "01"
subsystem: calendar-foundation
tags: [calendar, indexeddb, dexie, svelte-5, state-management, npm-packages]

requires:
  - 01-01-PLAN.md  # Dexie database foundation and schema pattern
  - 01-02-PLAN.md  # Svelte 5 $state runes pattern

provides:
  - CalendarEvent TypeScript interface with all required fields
  - Dexie schema v6 with events table and proper indexes
  - Event CRUD operations (8 functions)
  - CalendarState reactive store with Svelte 5 runes
  - Calendar npm packages (@event-calendar/*, ical.js, rrule)

affects:
  - 08-02-PLAN.md  # Will use CalendarEvent interface and event operations
  - 08-03-PLAN.md  # Will use CalendarState store and event data
  - 08-04-PLAN.md  # Will use event CRUD operations
  - 08-05-PLAN.md  # Will use bulkAddEvents for ICS import
  - 08-06-PLAN.md  # Will integrate with existing GTD workflow

tech-stack:
  added:
    - "@event-calendar/core@5.x"  # Calendar UI component library
    - "@event-calendar/day-grid@5.x"  # Day/month grid view plugin
    - "@event-calendar/time-grid@5.x"  # Week/day time grid view plugin
    - "@event-calendar/interaction@5.x"  # Drag-drop interaction plugin
    - "@event-calendar/list@5.x"  # List view plugin
    - "ical.js@2.2.1+"  # ICS file parsing (RFC 5545 compliant)
    - "rrule@latest"  # Recurrence rule handling (iCalendar RFC)
  patterns:
    - "Dexie schema versioning with incremental migrations"
    - "Svelte 5 class-based store with $state runes"
    - "CRUD operations with automatic timestamp management"
    - "IndexedDB indexes for date range queries"

key-files:
  created:
    - src/lib/stores/calendar.svelte.ts  # CalendarState reactive store
  modified:
    - package.json  # Added 7 calendar-related npm packages
    - package-lock.json  # Lock file for new dependencies
    - src/lib/db/schema.ts  # Added CalendarEvent interface and schema v6
    - src/lib/db/operations.ts  # Added 8 event CRUD operations

key-decisions:
  - schema-v6-indexes: "Index startTime, endTime, projectId, source, recurrenceId - optimizes date range queries and project filtering"
  - exceptionDates-string-array: "Store ISO date strings rather than Date objects to avoid IndexedDB serialization issues"
  - recurring-event-pattern: "Store base event with RRULE, expand instances on-demand rather than storing each occurrence"
  - calendar-state-pattern: "Follow existing ActionState/ProjectState class-based $state runes pattern for consistency"
  - event-operations-location: "Add Calendar Event Operations section to operations.ts after Settings Operations"

duration: "2 min"
completed: 2026-01-31
---

# Phase 08 Plan 01: Calendar Data Foundation Summary

**One-liner:** Calendar event data model with Dexie schema v6, 8 CRUD operations, reactive CalendarState store, and npm packages installed

## Performance

- **Duration:** 2 minutes 5 seconds
- **Started:** 2026-01-31
- **Completed:** 2026-01-31
- **Tasks:** 2/2 complete
- **Files modified:** 4 files (1 created, 3 modified)

## Accomplishments

Built the complete data foundation for calendar functionality:

1. **Installed calendar ecosystem packages**: @event-calendar/core with 4 plugins (day-grid, time-grid, interaction, list), ical.js for ICS parsing, rrule for recurrence handling
2. **Created CalendarEvent TypeScript interface**: 14 fields including id, title, startTime, endTime, allDay, location, notes, color, projectId, source, rrule, recurrenceId, exceptionDates, created, modified
3. **Added Dexie schema v6**: New events table with indexes on startTime, endTime, projectId, source, recurrenceId for efficient date range and project filtering queries
4. **Implemented 8 event CRUD operations**: addEvent, updateEvent, deleteEvent, getEvent, getEventsInRange, getRecurringEvents, bulkAddEvents, getAllEvents
5. **Created CalendarState reactive store**: Follows existing pattern with $state runes, derived values, and methods that wrap operations.ts calls

The foundation supports:
- Manual event creation and editing
- ICS file import (via bulkAddEvents)
- Recurring events with RRULE patterns
- Event-to-project linking
- Date range queries for calendar view rendering

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install npm packages and add CalendarEvent model with schema v6 | 4498a67 | package.json, package-lock.json, src/lib/db/schema.ts |
| 2 | Add event CRUD operations and CalendarState reactive store | fea7c73 | src/lib/db/operations.ts, src/lib/stores/calendar.svelte.ts |

## Files Created/Modified

**Created:**
- `src/lib/stores/calendar.svelte.ts` — CalendarState class with Svelte 5 $state runes pattern (65 lines)

**Modified:**
- `package.json` — Added 7 calendar npm packages
- `package-lock.json` — Lock file updated with 22 new packages
- `src/lib/db/schema.ts` — Added CalendarEvent interface (14 fields), events EntityTable, schema v6 with indexes
- `src/lib/db/operations.ts` — Added Calendar Event Operations section with 8 functions

## Decisions Made

### Schema Design Decisions

**Index Selection**: Indexed startTime, endTime, projectId, source, recurrenceId but NOT exceptionDates
- Rationale: Date range queries need startTime/endTime indexes for performance. ProjectId enables filtering events by project. Source allows filtering by import source. ExceptionDates is a plain array field (not multi-valued index) to store ISO date strings.
- Impact: Efficient queries for calendar view rendering and project integration.

**exceptionDates as String Array**: Store ISO date strings rather than Date objects
- Rationale: IndexedDB serialization of Date objects can be inconsistent across browsers. ISO strings are universally serializable and parseable.
- Impact: Recurrence expansion code must parse strings to Date objects, but data persistence is reliable.

**Recurring Event Data Model**: Store base event with RRULE, expand instances on-demand
- Rationale: Avoids data duplication and simplifies "edit series vs single occurrence" logic. Following Martin Fowler's recurring events pattern.
- Impact: Calendar UI must expand recurrences at render time using rrule.js, but database stays normalized.

### Architecture Decisions

**CalendarState Store Pattern**: Class-based store with Svelte 5 $state runes
- Rationale: Consistency with existing ActionState, ProjectState, WeeklyReviewState patterns throughout the app.
- Impact: Familiar developer experience, predictable reactivity, follows established conventions.

**Operations Location**: Added Calendar Event Operations after Settings Operations in operations.ts
- Rationale: Logical grouping by domain (Items, Contexts, Actions, Projects, Waiting For, Someday/Maybe, Settings, Calendar Events).
- Impact: Clear separation of concerns, easy to locate calendar-specific operations.

### Package Selection Decisions

**@event-calendar/core over FullCalendar**: Chose EventCalendar library
- Rationale: Smaller bundle (35KB vs 150KB+), zero dependencies, native Svelte 5 support, Google Calendar-style time blocks, no commercial license required.
- Impact: Lighter bundle, simpler integration, better Svelte 5 compatibility.

**ical.js for ICS Parsing**: Mozilla-maintained RFC 5545/7265 compliant parser
- Rationale: VTIMEZONE support, battle-tested with thousands of calendar implementations, handles timezone edge cases.
- Impact: Reliable ICS import without hand-rolling RFC compliance.

**rrule.js for Recurrence**: Standard iCalendar recurrence library
- Rationale: RFC-compliant RRULE handling, DST-aware, natural language parsing, widely used.
- Impact: Correct recurrence expansion without custom date math bugs.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. TypeScript compilation succeeded with zero errors on both tasks.

## Next Phase Readiness

**Ready for 08-02**: ICS parser and recurrence utilities
- CalendarEvent interface available for type annotations
- bulkAddEvents operation ready for import flow
- rrule and ical.js packages installed

**Ready for 08-03**: Calendar UI component
- CalendarState store reactive and ready to bind
- Event data model matches @event-calendar/core expectations
- CRUD operations available for user interactions

**Ready for 08-04**: Event form and interactions
- addEvent, updateEvent, deleteEvent operations implemented
- CalendarEvent interface defines all editable fields
- ProjectId linking ready for GTD integration

**Ready for 08-05**: Import and side panel
- bulkAddEvents handles batch import
- getEventsInRange supports date-filtered queries
- ProjectId field enables project-linked event filtering

**Blockers/Concerns:**
- None identified

**Future Considerations:**
- Calendar view will need to expand recurring events at render time (getRecurringEvents + rrule.js expansion)
- Event color logic not yet defined (should it inherit from project? allow manual override?)
- Timezone handling deferred to ICS import implementation (ical.js will handle this)
