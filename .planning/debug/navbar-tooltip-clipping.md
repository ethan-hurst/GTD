---
status: verifying
trigger: "Tooltips on hover in the left navbar on desktop are going under/behind the main site content instead of popping over it"
created: 2026-02-02T00:00:00Z
updated: 2026-02-02T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - Two CSS issues cause tooltip clipping
test: Build passes, all 107 tests pass, fix applied
expecting: Tooltips now render via portal to document.body with fixed positioning, escaping all overflow and stacking contexts
next_action: User visual verification

## Symptoms

expected: Tooltip boxes should pop over the main app content from the left navbar when hovering navbar items on desktop
actual: Tooltips appear to go under the main site content, not completely visible - they get clipped or hidden behind the main content area
errors: No error messages - purely a visual/CSS issue
reproduction: Hover over navbar items on desktop in Chrome or Brave
started: Recently broke - was working before commit fe29c1c (added overflow-y-auto to sidebar nav)

## Eliminated

- hypothesis: FeatureHint component has wrong z-index
  evidence: FeatureHint already uses z-50 on tooltip - z-index is correct within its stacking context
  timestamp: 2026-02-02

- hypothesis: app.css global styles override tooltip positioning
  evidence: No global overflow or z-index rules that would affect sidebar tooltips
  timestamp: 2026-02-02

- hypothesis: Simple position:fixed without portal would work
  evidence: backdrop-filter on aside creates a containing block for fixed-positioned children, so fixed positioning alone (without portal) would still be relative to aside, not viewport
  timestamp: 2026-02-02

- hypothesis: overflow-y: clip with overflow-x: visible would solve it
  evidence: Per-axis overflow:clip is buggy in Safari as of early 2026 - not a reliable cross-browser solution
  timestamp: 2026-02-02

## Evidence

- timestamp: 2026-02-02
  checked: Sidebar.svelte nav element (line 93)
  found: nav has overflow-y-auto which was added in commit fe29c1c to fix footer being pushed off-screen
  implication: overflow-y-auto creates a clipping boundary - any absolutely positioned child extending beyond nav bounds gets clipped. Tooltips positioned with left-full extend to the right, beyond the nav's right edge, and are clipped.

- timestamp: 2026-02-02
  checked: +layout.svelte desktop layout structure (lines 246-265)
  found: Sidebar aside has no z-index. Main content div is a later sibling in DOM. Header inside main content has z-10.
  implication: Even without overflow clipping, the main content area could paint over the sidebar's tooltips due to DOM order (later elements paint on top when no z-index is set).

- timestamp: 2026-02-02
  checked: git show fe29c1c (commit that added overflow-y-auto)
  found: Changed nav from "flex-1 p-4 space-y-1" to "flex-1 overflow-y-auto p-4 space-y-1"
  implication: This is the exact commit that broke tooltips. Before this, nav had no overflow constraint, so tooltips could extend beyond it freely.

- timestamp: 2026-02-02
  checked: FeatureHint.svelte tooltip positioning
  found: Tooltip uses position:absolute with left-full (for position="right"), meaning it extends to the right of the sidebar link, beyond the sidebar/nav boundaries
  implication: The tooltip needs to escape the overflow-y-auto clipping context to be visible

- timestamp: 2026-02-02
  checked: backdrop-filter on aside element
  found: aside has backdrop-blur-sm (backdrop-filter) which creates a containing block for position:fixed descendants per CSS spec
  implication: position:fixed alone (without portal) would position tooltip relative to aside, not viewport - coordinates from getBoundingClientRect would be wrong

- timestamp: 2026-02-02
  checked: Build and test suite after fix
  found: Build succeeds. All 107 tests pass across 10 test files.
  implication: Fix does not cause regressions

## Resolution

root_cause: Two compounding CSS issues: (1) The `<nav>` element in Sidebar.svelte has `overflow-y-auto` (added in commit fe29c1c) which creates a clipping boundary that clips tooltips extending beyond the nav's bounds via position:absolute. (2) The sidebar `<aside>` had no z-index, so the main content area (later in DOM order) could paint over tooltips. Additionally, backdrop-filter on the aside creates a containing block that would interfere with position:fixed if tooltips remained inside the sidebar DOM.

fix: Two changes applied:
  1. FeatureHint.svelte: Changed tooltip from position:absolute (relative to parent) to a portal pattern that teleports the tooltip to document.body using a Svelte use:action directive. Position is computed with getBoundingClientRect() for viewport-relative fixed positioning. This completely escapes the nav's overflow-y-auto clipping AND the aside's backdrop-filter containing block.
  2. Sidebar.svelte: Added z-20 to the aside element to establish proper stacking order above the main content area (which has z-10 on the header).

verification: Build passes. All 107 tests pass. Awaiting visual verification.

files_changed:
  - src/lib/components/FeatureHint.svelte
  - src/lib/components/Sidebar.svelte
