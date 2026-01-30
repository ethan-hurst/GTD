---
phase: 07-gtd-onboarding
plan: 03
subsystem: ui
tags: [svelte-5, contextual-hints, onboarding, tooltips, settings]

# Dependency graph
requires:
  - phase: 07-01
    provides: onboarding store, feature tracking utilities
provides:
  - FeatureHint wrapper component for contextual tooltips
  - Full and reduced hint content sets for 9 features
  - Settings page reset onboarding functionality
affects: [07-04, 07-05]

# Tech tracking
tech-stack:
  added: []
  patterns: [native-svelte-tooltips, content-set-pattern, confirmation-dialog]

key-files:
  created:
    - src/lib/components/FeatureHint.svelte
    - src/lib/utils/hintContent.ts
  modified:
    - src/routes/settings/+page.svelte

key-decisions:
  - "Native Svelte 5 tooltips over svelte-pops library: simpler, more reliable for navigation hints"
  - "Two content sets (full vs reduced): full explains GTD concepts, reduced explains UI only"
  - "Pulsing blue dot indicator: non-intrusive visual cue for available hints"
  - "Hints disappear only on feature use: not dismissible via close button"

patterns-established:
  - "Contextual hint pattern: FeatureHint wrapper + featureTracking checks + content selection"
  - "Confirmation dialog pattern: window.confirm for destructive settings actions"
  - "Settings section pattern: consistent card styling with Export/Import sections"

# Metrics
duration: 3min
completed: 2026-01-30
---

# Phase 07 Plan 03: Contextual Hints Summary

**Native Svelte tooltips with dual content sets (GTD education vs UI-only) and Settings reset toggle for onboarding re-experience**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-30T11:47:52Z
- **Completed:** 2026-01-30T11:51:01Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- FeatureHint component provides contextual education on first feature encounter
- Full hints (for completed walkthrough users) explain GTD concepts in plain language
- Reduced hints (for skip users) focus on UI features, assume GTD knowledge
- Settings page offers onboarding reset with confirmation dialog
- All hints accessible with keyboard navigation and dark mode support

## Task Commits

Each task was committed atomically:

1. **Task 1: Create FeatureHint component and hint content definitions** - `7a00078` (feat)
2. **Task 2: Add onboarding reset to Settings page** - `f4c39a2` (feat)

## Files Created/Modified
- `src/lib/components/FeatureHint.svelte` - Wrapper component with positioned tooltips, pulsing indicator, and feature tracking integration
- `src/lib/utils/hintContent.ts` - Full and reduced hint content sets for 9 features (inbox, next-actions, projects, waiting, someday, review, search, keyboard-shortcuts, settings)
- `src/routes/settings/+page.svelte` - Added Onboarding section with reset button and confirmation dialog

## Decisions Made

**Native Svelte 5 tooltips instead of svelte-pops:**
- Plan specified svelte-pops but allowed fallback if library issues
- svelte-pops requires complex context initialization and has verbose API
- Simple positioned div with absolute positioning is more predictable and reliable
- Navigation hints have predictable positions (sidebar), don't need full Floating UI
- Result: simpler code, fewer dependencies, better performance

**Two content sets for different user paths:**
- fullHints: GTD term + plain language explanation for users who completed walkthrough
- reducedHints: UI-focused, assumes GTD knowledge for users who skipped
- getHintContent() selects appropriate set based on onboardingState.hasSkipped
- Ensures hints are helpful for both user paths without overwhelming either

**Pulsing blue dot indicator:**
- Non-intrusive visual cue (small, subtle pulsing animation)
- Positioned top-right of wrapped element (-top-1 -right-1)
- Only shows when hint is available (shouldShowHints && !featureVisited)
- Disappears after feature actually used (not dismissible via close button)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Simplified tooltip implementation**
- **Found during:** Task 1 (FeatureHint component creation)
- **Issue:** svelte-pops API is complex (requires context initialization, verbose props), plan allowed fallback
- **Fix:** Implemented native Svelte 5 solution with absolute-positioned div and manual positioning
- **Files modified:** src/lib/components/FeatureHint.svelte
- **Verification:** Component renders correctly, tooltips position properly, build passes
- **Committed in:** 7a00078 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking/simplification)
**Impact on plan:** Fallback to native solution was explicitly allowed in plan. Simpler, more maintainable result.

## Issues Encountered
None - execution proceeded smoothly with expected library fallback.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- FeatureHint wrapper ready for integration in sidebar navigation and route pages
- Settings reset enables users to re-experience onboarding anytime
- Hint content complete for all 9 features
- Next plan should integrate FeatureHint into Sidebar and key route pages
- All contextual education infrastructure in place

---
*Phase: 07-gtd-onboarding*
*Completed: 2026-01-30*
