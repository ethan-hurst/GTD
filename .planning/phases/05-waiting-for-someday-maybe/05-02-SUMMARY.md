---
phase: 05-waiting-for-someday-maybe
plan: 02
type: summary
subsystem: ui
tags:
  - waiting-for
  - ui-components
  - route
  - svelte
requires:
  - 05-01  # Waiting For data layer
  - 04-02  # ProjectList pattern
  - 03-02  # ActionItem pattern
provides:
  - waiting-for-ui
  - waiting-route
  - waiting-for-list-component
  - waiting-for-item-component
affects:
  - 05-04  # Integration (sidebar nav, keyboard shortcuts)
  - 06-01  # Weekly Review (will need to include waiting-for review)
tech-stack:
  added: []
  patterns:
    - Inline add form pattern (from ProjectList)
    - Overdue conditional styling
    - Native date input for follow-up dates
    - Toast notification with undo capability
    - Expandable detail panel with auto-save
key-files:
  created:
    - src/lib/components/WaitingForItem.svelte
    - src/lib/components/WaitingForList.svelte
    - src/routes/waiting/+page.svelte
  modified: []
decisions:
  - title: "Native date input for follow-up date"
    rationale: "Standard HTML5 input provides good UX without additional library dependencies"
    alternatives: "Custom date picker (rejected - unnecessary complexity for this use case)"
    outcome: "Used <input type=\"date\"> in both add form and detail panel"
  - title: "Overdue styling with red background/border"
    rationale: "Strong visual indicator helps users identify items needing follow-up during review"
    alternatives: "Subtle badge only (rejected - less visible), sort to top only (rejected - visual cue still helpful)"
    outcome: "Red background (bg-red-50 dark/bg-red-900/20) for overdue items"
  - title: "Resolve action instead of complete"
    rationale: "GTD terminology - waiting-for items are 'resolved' when the delegated work is done"
    alternatives: "Complete (rejected - less semantically accurate for delegation tracking)"
    outcome: "Green 'Resolve' button, toast says 'resolved' instead of 'completed'"
metrics:
  duration: 2.07 min
  completed: 2026-01-30
---

# Phase 5 Plan 02: Waiting For UI Summary

**One-liner:** Complete /waiting route with inline add form, overdue detection with red styling, resolve flow with undo, and expandable detail panel for editing.

## What Was Built

Created the complete Waiting For UI following the ProjectList/ActionList patterns:

**WaitingForItem component:**
- Main row displays title (bold), delegated person, delegation date, and optional follow-up date
- Overdue visual styling: red background/border when followUpDate is past
- Resolve button (green) triggers resolveWaitingFor() with toast confirmation
- Expandable detail panel with auto-saving fields:
  - Notes (textarea, saves on blur)
  - Follow-up date (native date input, saves on change)
  - Person (text input, saves on blur)
  - Project link display (read-only for now)
  - Delete button with confirmation
- Resolving animation (opacity fade with strikethrough)

**WaitingForList component:**
- Page header with item count badge and overdue count indicator
- Inline add form at top:
  - Title input (required): "What are you waiting for?"
  - Person input (required): "Who from?"
  - Follow-up date input (optional, native date picker): "Follow up by"
  - Add button (disabled until title AND person filled)
  - Toast confirmation on submit
- Empty state with instructional GTD text about delegation
- Renders WaitingForItem for each item from waitingForState
- Passes overdue detection, expansion state, and callbacks to items

**/waiting route:**
- Imports waitingForState and WaitingForList
- Loads items on mount via waitingForState.loadItems()
- Renders WaitingForList component
- Follows exact pattern from /projects route

## Implementation Notes

**Followed established patterns:**
- Inline add form: Same structure as ProjectList (title field, submit button, form validation)
- Item component structure: Matches ActionItem/ProjectItem (clickable row, detail panel, metadata badges)
- Auto-save on blur/change: Consistent with ActionDetailPanel and ProjectDetailPanel
- Toast notifications: svelte-5-french-toast with success messages
- Empty state: Centered icon, instructional text matching other views

**Key UX decisions:**
- Overdue items sort to top (via MAX_SAFE_INTEGER pattern in getAllWaitingFor)
- Red visual highlight for overdue items makes them immediately visible
- Follow-up date is optional (not all waiting-for items need follow-up tracking)
- "Resolve" terminology instead of "complete" (more GTD-accurate for delegation)

## Verification Results

All verification checks passed:

- ✅ TypeScript compilation: `npx tsc --noEmit` passes
- ✅ Build: `npm run build` succeeds
- ✅ Route exists: /waiting route file created and imports waitingForState
- ✅ Inline form: Title + person + optional date fields present
- ✅ Overdue styling: bg-red-50/bg-red-900 conditional classes present
- ✅ Resolve action: Calls resolveWaitingFor with toast confirmation
- ✅ Empty state: Contains instructional text about delegation

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

1. **Native date input**: Used standard HTML5 `<input type="date">` for both add form and detail panel. Provides good cross-browser UX without library dependencies.

2. **Overdue red styling**: Strong visual indicator (red background and border) helps users quickly identify items needing follow-up during weekly review.

3. **"Resolve" terminology**: Used "Resolve" button and toast messaging instead of "Complete" to be semantically accurate for GTD delegation tracking.

4. **Form requires both title and person**: Add button disabled until both required fields filled, preventing incomplete waiting-for items.

## Testing Notes

**Manual verification performed:**
- TypeScript compilation passes
- Build succeeds
- All required components created
- All pattern integrations verified via grep

**Suggested follow-up testing (in 05-04 or 05-05):**
- Navigate to /waiting and verify list loads
- Add new waiting-for item with and without follow-up date
- Verify overdue detection works (items with past followUpDate show red)
- Test resolve flow with undo toast
- Test detail panel editing (notes, follow-up date, person)
- Verify empty state displays when no items

## Next Phase Readiness

**Blockers:** None

**Concerns:** None

**Ready for next plans:**
- ✅ 05-03 (Someday/Maybe UI) - Can follow same component patterns
- ✅ 05-04 (Integration) - /waiting route ready for sidebar nav and keyboard shortcut
- ⚠️  ProcessingFlow delegate enhancement - Will need to add delegate option that creates waiting-for items

## Performance

**Execution:** 2.07 min (2 tasks)
- Task 1 (WaitingForItem): ~1.0 min
- Task 2 (WaitingForList + route): ~1.07 min

**Build time:** 1.43s (unchanged from baseline)

## Commits

| Hash    | Type | Description |
|---------|------|-------------|
| dfbe520 | feat | Create WaitingForItem component |
| 3feb5e5 | feat | Create WaitingForList component and /waiting route |

## Lessons Learned

**What went well:**
- Following ProjectList/ActionList patterns made implementation straightforward
- Inline add form pattern is now well-established across the app
- Overdue detection logic in data layer made UI implementation clean
- Native date input provides good UX without additional dependencies

**What to improve:**
- None - execution was smooth

## Knowledge for Future Phases

**For 05-04 (Integration):**
- Add "Waiting For" to sidebar navigation (after Projects, before Someday/Maybe)
- Add keyboard shortcut for /waiting route (suggest 'w' for waiting)
- Enhance ProcessingFlow to add "Delegate" option that creates waiting-for items
- Delegate flow should prompt for: person, optional follow-up date, optional project link

**For 06-01 (Weekly Review):**
- Waiting-for review step should show all items, highlight overdue
- Review should prompt: "Follow up on any of these?" and "Remove any that are resolved?"
- Consider showing time-since-created for items without follow-up dates

**Pattern for future list views:**
- Inline add form at top (always visible, no modal)
- Item count badge in header
- Empty state with GTD instructional text
- Item components with expandable detail panels
- Auto-save on blur/change for edits
- Toast notifications for actions
