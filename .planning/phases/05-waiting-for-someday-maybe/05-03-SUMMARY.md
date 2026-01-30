---
phase: 05-waiting-for-someday-maybe
plan: 03
type: summary
subsystem: ui-layer
tags:
  - svelte-5
  - someday-maybe-ui
  - category-filtering
  - promotion-flow
  - gtd-incubation
requires:
  - 05-01  # Someday/Maybe data layer
  - 03-01  # Context operations pattern
  - 04-01  # Project UI patterns
affects:
  - 05-04  # ProcessingFlow integration
  - 05-05  # Weekly review integration
provides:
  - someday-maybe-route
  - category-filter-ui
  - promotion-workflow
tech-stack:
  added: []
  patterns:
    - Two-column sidebar layout for filtering
    - Inline item creation (title-only capture)
    - Button group for promotion actions
    - Category pill badges
    - Toggle-based category selection
key-files:
  created:
    - src/routes/someday/+page.svelte
    - src/lib/components/SomedayMaybeList.svelte
    - src/lib/components/SomedayMaybeItem.svelte
  modified: []
decisions:
  - title: "Title-only capture in inline add form"
    rationale: "GTD principle: capture fast, organize later. Users can categorize during review, not during brain dump."
    alternatives: "Require category during add (rejected - adds friction to capture)"
    outcome: "Inline form only requires title, category assigned later in expanded view"
  - title: "Button group for promotion (not dropdown)"
    rationale: "Only two options (Project/Action), both equally important. Button group is simpler and more discoverable."
    alternatives: "Single dropdown menu (rejected - adds unnecessary clicks)"
    outcome: "Two adjacent buttons: 'Project' and 'Action' with upward arrow icons"
  - title: "Category filter sidebar on left (like ContextList pattern)"
    rationale: "Established pattern from ActionList, users already familiar with left sidebar for filtering"
    alternatives: "Top bar filter (rejected - less consistent), right sidebar (rejected - less conventional)"
    outcome: "Left sidebar with All button + category buttons, main content on right"
metrics:
  duration: 2.70 min
  completed: 2026-01-30
---

# Phase 5 Plan 03: Someday/Maybe UI Summary

**One-liner:** Complete Someday/Maybe list UI with category-filtered sidebar, inline title-only capture, and one-click promotion to projects or actions.

## What Was Built

Created the full Someday/Maybe user interface following GTD incubation principles:

**SomedayMaybeItem Component:**
- Main row: title, category badge (if assigned), creation date, promote buttons
- Promote buttons: "Project" and "Action" buttons side-by-side with upward arrow icons
- Promotion flow: one-click calls `promoteSomedayToActive()`, shows toast, reloads list
- Expanded panel: editable notes (auto-save on blur), category selector with toggle buttons, delete button
- Category selector: renders all 8 predefined categories from SOMEDAY_CATEGORIES, click to assign/unassign
- Follows ProjectItem/ActionItem patterns (expand/collapse, card styling)

**SomedayMaybeList Component:**
- Two-column layout: left sidebar (category filter), right main area (list + inline add)
- Category filter sidebar: "All" button showing total count, one button per category with individual counts
- Active category highlighted with bg-gray-200/dark:bg-gray-800 styling
- Inline add form: single input ("Capture an idea...") + Add button
- Title-only capture: no category required during add (GTD fast capture principle)
- Item list: renders SomedayMaybeItem components with expand/collapse, uses filteredItems from store
- Empty states: "incubation list" instructional text for All view, category-specific guidance for filtered views

**/someday Route:**
- Loads items on mount via `somedayMaybeState.loadItems()`
- Renders SomedayMaybeList component
- Follows exact pattern from projects/+page.svelte

## Implementation Notes

**Design patterns followed:**
- Two-column sidebar layout from ActionList/ContextList pattern
- Item component pattern from ProjectItem (expand/collapse, detail panel)
- Category counts displayed next to each filter option (like context counts)
- Card-based item styling with hover effects
- Empty state with icon + instructional text

**Key technical decisions:**
- Category toggle in expanded view: click once to assign, click again to unassign (implemented via ternary)
- Auto-save on blur for notes field (matches ProjectDetailPanel pattern)
- Promote buttons in main row (not hidden in expanded panel) - key action easily discoverable
- Category badge only shows when assigned (no badge for uncategorized items)

**GTD alignment:**
- Fast capture: inline form requires only title, no category
- Review-time organization: categorize during expansion/review, not during capture
- Promotion as type change: `promoteSomedayToActive()` changes type field and clears category
- Incubation concept: empty state teaches users about someday/maybe purpose

## Verification Results

All verification checks passed:

- ✅ TypeScript compilation: `npx tsc --noEmit` passes with zero errors
- ✅ Build: `npm run build` succeeds in 1.51s
- ✅ Route exists: /someday route created and imports somedayMaybeState
- ✅ Category filter: SomedayMaybeList uses SOMEDAY_CATEGORIES for sidebar buttons
- ✅ Inline add: Form with "Capture an idea..." placeholder, title-only capture
- ✅ Promote buttons: SomedayMaybeItem has "Project" and "Action" buttons calling promoteSomedayToActive
- ✅ Expanded view: Category selector with SOMEDAY_CATEGORIES, notes editor with auto-save
- ✅ Empty states: "incubation list" instructional text present in All view

**Key integrations verified:**
- `somedayMaybeState.loadItems()` called in route onMount
- `addSomedayItem()` called from inline form (title-only)
- `promoteSomedayToActive()` called from promote buttons (with type parameter)
- `updateItem()` called for notes blur and category assignment
- `deleteItem()` called with confirmation prompt

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

1. **Title-only inline capture**: Inline form only requires title field, no category dropdown. Rationale: GTD fast capture principle - get ideas out of head quickly, organize later during review. Category assignment available in expanded view.

2. **Button group for promotion (not dropdown)**: Two adjacent buttons "Project" and "Action" with icons, not a dropdown menu. Rationale: Only two equally important options, button group is simpler and more discoverable than dropdown.

3. **Left sidebar for category filter**: Follows ContextList pattern with All button at top, categories below. Rationale: Established pattern users already familiar with, consistent with ActionList layout.

4. **Toggle-based category assignment**: Click category button to assign, click again to unassign. Rationale: Simpler than radio buttons (can unassign), clearer than checkbox (single category per item implied by UI).

## Testing Notes

**Manual verification performed:**
- TypeScript compilation passes
- Build succeeds (1.51s)
- All imports and exports verified via grep
- Component structure matches ProjectItem/ActionItem patterns
- Empty state text verified present

**Suggested follow-up testing (in integration plan):**
- Test promotion flow: someday item → project (should appear in /projects)
- Test promotion flow: someday item → action (should appear in /actions)
- Test category filter: click category, verify only items with that category show
- Test category assignment: assign category, verify badge appears and filter updates
- Test inline add with empty title (should be prevented by disabled button)
- Verify category counts update after promotion/deletion

## Next Phase Readiness

**Blockers:** None

**Concerns:** None

**Ready for next plans:**
- ✅ 05-04 (ProcessingFlow integration) - Someday/Maybe UI complete, ready for quick-add from processing
- ✅ 05-05 (Weekly review) - List view ready for review workflow integration

**Suggested enhancements (future):**
- Search/filter by keyword within someday/maybe items
- Bulk promotion (select multiple items, promote all at once)
- Sort options (by date, by category, alphabetical)

## Performance

**Execution:** 2.70 min (2 tasks)
- Task 1 (SomedayMaybeItem): ~1.35 min
- Task 2 (SomedayMaybeList + route): ~1.35 min

**Build time:** 1.51s (baseline: ~1.43s, slight increase expected with new route)

## Commits

| Hash    | Type | Description |
|---------|------|-------------|
| ae9dc38 | feat | Create SomedayMaybeItem component |
| beb5cba | feat | Create SomedayMaybeList component and /someday route |

## Lessons Learned

**What went well:**
- Following established patterns (ProjectItem, ActionList, ContextList) made implementation straightforward
- Two-column sidebar layout pattern reused successfully
- Category filtering via derived state (from 05-01 data layer) worked perfectly
- Button group for promotion proved simpler than dropdown approach

**What to improve:**
- None - execution was smooth and pattern reuse effective

## Knowledge for Future Phases

**For ProcessingFlow integration (05-04):**
- Import `addSomedayItem(title)` for quick someday capture
- No category required during add - users can categorize later during review
- Promotion functions available: `promoteSomedayToActive(id, 'project')` or `promoteSomedayToActive(id, 'next-action')`

**For weekly review (05-05):**
- Route available at /someday for review workflow
- Category filtering via `somedayMaybeState.selectCategory(category)`
- Expanded view provides full context for review decisions
- Promotion is one-click action, no multi-step wizard needed

**UI patterns established:**
- Category pill badge: `bg-gray-100 dark:bg-gray-700, text-gray-600 dark:text-gray-300, text-xs, rounded-full, px-2 py-0.5`
- Promote button styling: colored bg (purple for project, blue for action), icon + text label
- Empty state teaching: use descriptive text to explain GTD concepts (incubation, review, etc.)
