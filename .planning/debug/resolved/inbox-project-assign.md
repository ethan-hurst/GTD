---
status: resolved
trigger: "When processing inbox items, users cannot assign items to existing projects. The project selector UI element exists but is disabled/greyed out/non-functional."
created: 2026-02-03T00:00:00Z
updated: 2026-02-03T00:02:00Z
---

## Current Focus

hypothesis: CONFIRMED AND FIXED
test: Build, type-check, and test suite all pass
expecting: N/A - resolved
next_action: Archive

## Symptoms

expected: There should be a way to select an existing project and assign the inbox item to it during inbox processing
actual: The project assignment option exists in the UI but is greyed out or non-functional - cannot select existing projects
errors: No error messages reported
reproduction: Process any inbox item and try to assign it to an existing project
started: User is unsure if this ever worked - may have never been fully implemented

## Eliminated

- hypothesis: getAllProjects() function has a bug returning wrong data
  evidence: Code review shows correct query (type='project', !completedAt, !deleted). Operations test suite passes.
  timestamp: 2026-02-03T00:00:30Z

- hypothesis: Svelte 5 reactivity issue with async state update in initiateProject()
  evidence: Both projects and step are $state variables. Assignment after await works correctly in Svelte 5. No type errors.
  timestamp: 2026-02-03T00:00:35Z

- hypothesis: "It's part of a project" button is disabled
  evidence: Button at line 298-303 has NO disabled attribute. It's fully interactive with onclick={initiateProject}.
  timestamp: 2026-02-03T00:00:40Z

- hypothesis: TypeScript compilation error prevents rendering
  evidence: svelte-check shows only accessibility warnings for ProcessingFlow.svelte, no errors.
  timestamp: 2026-02-03T00:00:45Z

## Evidence

- timestamp: 2026-02-03T00:00:20Z
  checked: ProcessingFlow.svelte select-project step (lines 354-415)
  found: When projects array is empty, {#each} renders nothing. Only visible elements are "Create new project:" input with greyed-out "Create & Link" button (disabled={!newProjectTitle.trim()}) and "Skip (no project)". No empty-state message exists.
  implication: User with no existing projects sees a greyed-out button and no explanation, creating perception of broken feature.

- timestamp: 2026-02-03T00:00:25Z
  checked: ProcessingFlow.svelte initiateProject() function (lines 119-122)
  found: Function correctly calls getAllProjects() and sets step. The async function works as onclick handler.
  implication: Data loading path is correct.

- timestamp: 2026-02-03T00:00:30Z
  checked: db/operations.ts getAllProjects() (lines 264-270)
  found: Correctly queries items with type='project', filters out completed and deleted items.
  implication: Data layer is correct.

- timestamp: 2026-02-03T00:00:50Z
  checked: All components that use project selectors (ProcessingFlow, ActionDetailPanel, EventForm)
  found: Three separate components load projects independently. ProcessingFlow uses button-list, others use <select> dropdown. All use getAllProjects().
  implication: Issue is isolated to the UX presentation, not data flow.

- timestamp: 2026-02-03T00:01:30Z
  checked: Fix applied and verified
  found: Build succeeds, svelte-check passes (no new errors), all 233 tests pass.
  implication: Fix is safe and non-breaking.

## Resolution

root_cause: The select-project step in ProcessingFlow.svelte had no empty-state UI feedback when no projects exist. When the user clicked "It's part of a project" and had no existing projects, the {#each projects} block rendered nothing, leaving only a "Create new project" section with a disabled/greyed-out "Create & Link" button (opacity-50, cursor-not-allowed). This gave the appearance that the entire project assignment feature was non-functional. The underlying data layer and logic were correct -- the issue was purely a missing empty-state UX pattern.
fix: Restructured the select-project step UI with three changes: (1) Added an "Existing projects" section header when projects are available, with improved hover states (blue highlight) for project buttons; (2) Added an explicit empty-state message ("No existing projects yet. Create one below, or skip to save as a standalone action.") when no projects exist; (3) Changed the create section label to "Or create a new project:" for clearer hierarchy.
verification: Build succeeds, svelte-check passes with no new errors, all 233 unit tests pass.
files_changed:
  - src/lib/components/ProcessingFlow.svelte
