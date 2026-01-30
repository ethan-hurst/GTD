---
phase: 05-waiting-for-someday-maybe
plan: 04
subsystem: navigation
tags: [routing, keyboard-shortcuts, sidebar, processing-flow, delegation]
status: complete
wave: 3
depends_on: ["05-02", "05-03"]

requires:
  - phase: 05-02
    provides: "Waiting For route and UI"
  - phase: 05-03
    provides: "Someday/Maybe route and UI"

provides:
  - "Sidebar navigation links for /waiting and /someday"
  - "Keyboard shortcuts 'w' and 's' for list navigation"
  - "Enhanced delegate step with optional follow-up date"

affects:
  - phase: 05-05
    impact: "Verification can now test complete navigation flow"

tech-stack:
  added: []
  patterns:
    - "Single-key keyboard shortcuts for GTD lists"
    - "Optional follow-up date for delegated items"

key-files:
  created: []
  modified:
    - path: "src/lib/components/Sidebar.svelte"
      provides: "Navigation links for Waiting For and Someday/Maybe"
    - path: "src/routes/+layout.svelte"
      provides: "Keyboard shortcuts 'w' and 's'"
    - path: "src/lib/components/ProcessingFlow.svelte"
      provides: "Enhanced delegate step with follow-up date input"

decisions:
  - what: "No badges on Waiting For or Someday/Maybe sidebar links"
    why: "Per user decision - these are review-time concerns, not action-now indicators like inbox count or stalled projects"
    alternatives: ["Show count badges similar to inbox", "Show overdue count for waiting-for"]
    outcome: "Clean navigation links without badges"

metrics:
  duration: "2.17 min"
  completed: "2026-01-30"
---

# Phase 05 Plan 04: Navigation Integration Summary

Wire Waiting For and Someday/Maybe into app navigation, keyboard shortcuts, and processing flow.

**One-liner:** Sidebar links, 'w'/'s' keyboard shortcuts, and enhanced delegate step with optional follow-up dates for complete navigation integration.

## What Was Built

### Navigation Links
Added Waiting For and Someday/Maybe links to sidebar:
- Positioned between Projects and Settings sections
- No badges (explicit user decision - review-time concerns)
- Active state highlighting when on respective routes
- Follows existing sidebar link patterns

### Keyboard Shortcuts
Added single-key navigation shortcuts:
- 'w' key navigates to /waiting
- 's' key navigates to /someday
- Respects input field guard (doesn't fire when typing)
- Mirrors existing 'n' (next actions) and 'p' (projects) pattern

### Processing Flow Enhancement
Enhanced delegate step with optional follow-up date:
- Added date input field below person name input
- Date is optional with clear helper text
- Persists followUpDate to item during delegation
- Maintains all existing processing paths
- Someday/Maybe routing unchanged

## Files Modified

1. **src/lib/components/Sidebar.svelte** - Added navigation links
   - Waiting For link with route highlighting
   - Someday/Maybe link with route highlighting
   - Positioned between Projects and Settings with separators

2. **src/routes/+layout.svelte** - Added keyboard shortcuts
   - 'w' shortcut for /waiting navigation
   - 's' shortcut for /someday navigation
   - Follows existing shortcut pattern with input guard

3. **src/lib/components/ProcessingFlow.svelte** - Enhanced delegate step
   - Added followUpDateStr state variable
   - Added optional date input field to delegate-input step
   - Updated delegate() function to persist followUpDate
   - Maintained all existing processing flow logic

## Technical Details

### Keyboard Shortcut Implementation
Shortcuts added to `handleKeydown` in +layout.svelte following existing pattern:
- Check for input fields first (isInput guard)
- Single-key shortcuts only fire when not typing
- event.preventDefault() to avoid browser conflicts
- Consistent with 'n' and 'p' shortcuts

### Sidebar Link Structure
Links use consistent pattern across sidebar:
- `$page.url.pathname.startsWith()` for route matching
- Tailwind classes for active/inactive states
- Dark mode support
- No state imports needed (no badges to display)

### Follow-Up Date Handling
ProcessingFlow delegate enhancement:
- HTML5 date input provides native picker
- Optional field with helper text
- Converts string to Date object or undefined
- Passed to updateItem() with delegatedTo field

## Verification

All must-haves verified:
- ✅ Sidebar shows Waiting For and Someday/Maybe navigation links (no badges)
- ✅ Pressing 'w' navigates to /waiting from anywhere (except input fields)
- ✅ Pressing 's' navigates to /someday from anywhere (except input fields)
- ✅ Processing flow delegate step saves person name and optional follow-up date
- ✅ Waiting-for and someday/maybe items do NOT appear in next actions lists (type filtering)

Build verification:
- ✅ `npx tsc --noEmit` passes
- ✅ `npm run build` succeeds
- ✅ All keyboard shortcuts registered correctly
- ✅ Sidebar links in correct position
- ✅ ProcessingFlow includes followUpDate input

## Next Phase Readiness

Phase 5 (Waiting For & Someday/Maybe) is now ready for human verification (05-05):
- All navigation routes wired up
- Keyboard shortcuts provide quick access
- Processing flow properly routes delegated items
- Lists are fully integrated into app navigation

User can now:
- Navigate to waiting-for and someday/maybe via sidebar or shortcuts
- Delegate items with optional follow-up dates
- Process inbox items into waiting-for or someday/maybe
- Access all GTD lists via consistent navigation pattern

## Performance

- **Execution time:** 2.17 minutes (130 seconds)
- **Tasks completed:** 2/2
- **Commits:** 2 (one per task)
- **Deviations:** None - plan executed exactly as written

## Deviations from Plan

None - plan executed exactly as written.

## Commits

1. **9611520** - feat(05-04): add sidebar navigation and keyboard shortcuts
   - Sidebar links for Waiting For and Someday/Maybe
   - 'w' and 's' keyboard shortcuts
   - No badges per user decision

2. **7f44596** - feat(05-04): enhance ProcessingFlow delegate step with follow-up date
   - Optional follow-up date input field
   - Updated delegate() function
   - Maintained existing processing paths

---

**Phase Progress:** 4/5 plans complete in phase 05 (80%)
**Overall Progress:** 18/19 plans complete across all phases (94.7%)
