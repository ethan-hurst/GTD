---
phase: quick
plan: 001
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/components/ActionItem.svelte
  - src/lib/components/ActionDetailPanel.svelte
  - src/lib/components/ProcessingFlow.svelte
  - src/lib/components/SearchBar.svelte
autonomous: true

must_haves:
  truths:
    - "No stale placeholder or TODO comments remain in the four identified files"
    - "Search result selection navigates to the correct page based on item type"
  artifacts:
    - path: "src/lib/components/ActionItem.svelte"
      provides: "Project badge rendering without stale placeholder comment"
    - path: "src/lib/components/ActionDetailPanel.svelte"
      provides: "Project selector without stale Phase 4 comment"
    - path: "src/lib/components/ProcessingFlow.svelte"
      provides: "Reference function without stale Phase 5 TODO"
    - path: "src/lib/components/SearchBar.svelte"
      provides: "Type-aware navigation in navigateToItem()"
  key_links:
    - from: "src/lib/components/SearchBar.svelte"
      to: "SvelteKit routes"
      via: "navigateToItem() type-to-route mapping"
      pattern: "window\\.location\\.href.*/(actions|projects|waiting|someday)"
---

<objective>
Clean up all 4 v1 tech debt items identified in the milestone audit: remove 3 stale comments and fix search navigation to route by item type.

Purpose: Close out v1 tech debt so the milestone ships clean with no misleading comments or suboptimal UX.
Output: Four updated Svelte components with no stale comments and correct search navigation routing.
</objective>

<execution_context>
@/Users/annon/.claude/get-shit-done/workflows/execute-plan.md
@/Users/annon/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/v1-MILESTONE-AUDIT.md
@src/lib/db/schema.ts (GTDItem.type: 'inbox' | 'next-action' | 'project' | 'waiting' | 'someday')
@src/lib/components/ActionItem.svelte
@src/lib/components/ActionDetailPanel.svelte
@src/lib/components/ProcessingFlow.svelte
@src/lib/components/SearchBar.svelte
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove 3 stale placeholder/TODO comments</name>
  <files>
    src/lib/components/ActionItem.svelte
    src/lib/components/ActionDetailPanel.svelte
    src/lib/components/ProcessingFlow.svelte
  </files>
  <action>
    Remove these outdated comments from 3 files:

    1. **ActionItem.svelte line 146**: Remove the comment `<!-- Project badge (placeholder) -->` and replace it with `<!-- Project badge -->`. The project badge is fully implemented (Phase 4 complete) -- the "(placeholder)" qualifier is misleading.

    2. **ActionDetailPanel.svelte line 132**: The comment `<!-- Project ID (placeholder for Phase 4) -->` does NOT exist at line 132. The actual comment near the Project section is around line 139-142. Search for any comment containing "placeholder" or "Phase 4" in this file and remove/update it. Looking at the code, there is no such comment in the template -- the original audit may have been referencing an earlier version. Scan the entire file for any stale placeholder comments. If none found, this item is already clean -- skip it.

    3. **ProcessingFlow.svelte line 87**: Remove or update the comment `// TODO Phase 5+: implement reference material category` in the `reference()` function. Phase 5 is complete. Replace with `// Reference items stored as someday type` to explain the current behavior (reference items are saved as type 'someday' since there is no dedicated reference type).

    Do NOT change any functional code. Only modify comments.
  </action>
  <verify>
    Run: `grep -rn "placeholder\|TODO Phase 5\|Phase 4" src/lib/components/ActionItem.svelte src/lib/components/ActionDetailPanel.svelte src/lib/components/ProcessingFlow.svelte`
    Expected: No matches for stale placeholder/TODO comments. The only match should be the updated "Project badge" comment (without "placeholder").
  </verify>
  <done>All 3 stale comments removed or updated. No functional code changed.</done>
</task>

<task type="auto">
  <name>Task 2: Fix SearchBar navigateToItem() to route by item type</name>
  <files>src/lib/components/SearchBar.svelte</files>
  <action>
    Update the `navigateToItem()` function in SearchBar.svelte (currently lines 75-80) to route to the correct page based on `item.type`.

    Current code:
    ```typescript
    function navigateToItem(item: GTDItem) {
      // For now, all items go to inbox (only page that exists)
      // In future phases, this will route to appropriate page based on item.type
      window.location.href = '/';
      close();
    }
    ```

    Replace with:
    ```typescript
    function navigateToItem(item: GTDItem) {
      const typeRoutes: Record<GTDItem['type'], string> = {
        'inbox': '/',
        'next-action': '/actions',
        'project': '/projects',
        'waiting': '/waiting',
        'someday': '/someday'
      };
      window.location.href = typeRoutes[item.type] ?? '/';
      close();
    }
    ```

    This maps all 5 GTDItem types to their corresponding SvelteKit routes:
    - inbox -> / (inbox page)
    - next-action -> /actions
    - project -> /projects
    - waiting -> /waiting
    - someday -> /someday

    Remove the stale comments about "only page that exists" and "future phases" since all pages now exist.
  </action>
  <verify>
    1. Run: `grep -n "navigateToItem" src/lib/components/SearchBar.svelte` -- should show the updated function with type-based routing.
    2. Run: `grep -n "only page that exists\|future phases" src/lib/components/SearchBar.svelte` -- should return no matches (stale comments removed).
    3. Run: `npm run build` -- should complete with no TypeScript errors (the Record type ensures exhaustive type coverage).
  </verify>
  <done>SearchBar navigateToItem() routes to /actions for next-action, /projects for project, /waiting for waiting, /someday for someday, and / for inbox. No stale comments remain. Build passes.</done>
</task>

</tasks>

<verification>
1. `grep -rn "placeholder\|TODO Phase" src/lib/components/ActionItem.svelte src/lib/components/ActionDetailPanel.svelte src/lib/components/ProcessingFlow.svelte src/lib/components/SearchBar.svelte` returns no stale comments.
2. `npm run build` passes with no errors.
3. SearchBar.svelte contains a type-to-route mapping covering all 5 GTDItem types.
</verification>

<success_criteria>
- All 4 tech debt items from v1-MILESTONE-AUDIT.md are resolved
- Zero stale placeholder/TODO comments in the 4 identified files
- Search navigation routes to type-specific pages instead of always routing to /
- Build passes cleanly
</success_criteria>

<output>
After completion, create `.planning/quick/001-clean-up-v1-tech-debt/001-SUMMARY.md`
</output>
