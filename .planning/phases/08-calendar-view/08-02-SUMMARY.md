---
phase: 08-calendar-view
plan: 02
subsystem: calendar
tags: [ical.js, rrule, ics-parser, recurrence, rfc-5545, calendar-events]

# Dependency graph
requires:
  - phase: 08-01
    provides: CalendarEvent schema with rrule and exceptionDates fields
provides:
  - ICS file parsing (parseICS function converting .ics text to CalendarEvent[])
  - Recurrence expansion (expandRecurrence and expandAllRecurrences functions)
  - RRULE string handling with exception dates (EXDATE)
affects: [08-03-calendar-ui, 08-04-ics-import, future calendar features]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - ical.js wrapper for ICS parsing with type-safe property extraction
    - rrule.js RRuleSet pattern for recurrence expansion with exception handling
    - Pure function pattern for recurrence expansion (no DB writes, on-demand computation)

key-files:
  created:
    - src/lib/utils/ics-parser.ts
    - src/lib/utils/recurrence.ts
  modified: []

key-decisions:
  - "Type-safe ical.js property extraction: Use typeof checks for union return types"
  - "RRuleSet dtstart assignment: Set dtstart on RRuleSet instance for proper recurrence timing"
  - "Strip RRULE prefix: Handle both 'RRULE:...' and raw RRULE strings for flexibility"
  - "On-demand expansion only: Recurrence functions are pure, no database writes"

patterns-established:
  - "ICS parsing edge cases: Missing DTEND defaults to +1 hour (timed) or +1 day (all-day), missing SUMMARY defaults to '(No title)'"
  - "Recurrence expansion error handling: On parse failure, return base event if in range (graceful degradation)"
  - "Duration preservation: Calculate duration from base event, apply to all recurrence instances"

# Metrics
duration: 3.4min
completed: 2026-01-30
---

# Phase 08 Plan 02: Calendar Utilities Summary

**ICS parsing and RRULE expansion utilities using ical.js and rrule.js for calendar event import and recurrence handling**

## Performance

- **Duration:** 3.4 min
- **Started:** 2026-01-30T21:24:41Z
- **Completed:** 2026-01-30T21:28:05Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- ICS file parsing with ical.js extracting all VEVENT properties (SUMMARY, DTSTART, DTEND, LOCATION, DESCRIPTION, RRULE, EXDATE)
- Recurrence expansion with rrule.js expanding RRULE strings into CalendarEvent instances within visible date ranges
- Type-safe handling of ical.js union return types using typeof checks
- Exception date (EXDATE) support via RRuleSet for excluding specific occurrences
- Pure function pattern ensuring no database writes, expansion computed on-demand

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ICS parser utility** - `fa15c3a` (feat)
2. **Task 2: Create recurrence expansion utility** - `9e49108` (feat)

## Files Created/Modified
- `src/lib/utils/ics-parser.ts` - Parse ICS text into CalendarEvent[] using ical.js, extract VEVENT properties, validate ICS format
- `src/lib/utils/recurrence.ts` - Expand RRULE to instances using rrule.js, handle exception dates, preserve duration across occurrences

## Decisions Made

**Type-safe ical.js property extraction**
- ical.js getFirstPropertyValue() returns union types (string | Binary | Duration | Period | Recur | Time | UtcOffset | Geo)
- Use typeof checks to safely extract string values: `const title = typeof summaryValue === 'string' ? summaryValue : '(No title)'`
- Ensures TypeScript compilation without casting to `any`

**RRuleSet dtstart assignment**
- RRule.fromString() doesn't accept dtstart option (only takes string parameter)
- Set dtstart directly on RRuleSet instance: `rruleSet.dtstart = event.startTime`
- Ensures recurrence timing matches event's original start time

**RRULE prefix handling**
- Support both 'RRULE:FREQ=DAILY;...' and 'FREQ=DAILY;...' formats
- Strip 'RRULE:' prefix if present before parsing: `event.rrule.substring(6)`
- Handles ICS files from different calendar exporters

**On-demand expansion only**
- expandRecurrence and expandAllRecurrences are pure functions
- No database writes - expansion computed only for visible date range
- Follows research recommendation (08-RESEARCH.md Pattern 4)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**TypeScript union type errors from ical.js**
- **Issue:** ical.js getFirstPropertyValue() returns union types, caused "Type X is not assignable to type 'string'" errors
- **Resolution:** Added typeof checks for type-safe extraction (Rule 3 - Blocking)
- **Impact:** 2 minutes debugging, fixed by explicit type guards

**RRule.fromString signature mismatch**
- **Issue:** Plan suggested RRule.fromString(rruleString, { dtstart: event.startTime }) but fromString only accepts one argument
- **Resolution:** Set dtstart on RRuleSet instance instead: `rruleSet.dtstart = event.startTime`
- **Impact:** 1 minute to check rrule.js type definitions, straightforward fix

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for:**
- 08-03 (Calendar UI component): parseICS and expandRecurrence utilities ready for integration
- 08-04 (ICS import feature): validateICS and parseICS ready for file upload handling

**Utilities available:**
- `parseICS(icsText, source?)` - Convert .ics file content to CalendarEvent[]
- `validateICS(icsText)` - Pre-validate ICS format before parsing
- `expandRecurrence(event, rangeStart, rangeEnd)` - Expand single recurring event to instances
- `expandAllRecurrences(events, rangeStart, rangeEnd)` - Expand all events in array, sorted by startTime

**Edge cases handled:**
- Missing DTEND (defaults to +1 hour for timed, +1 day for all-day)
- Missing SUMMARY (defaults to "(No title)")
- Invalid RRULE (returns base event if in range, logs error)
- EXDATE handling (excluded from recurrence instances)

---
*Phase: 08-calendar-view*
*Completed: 2026-01-30*
