# Phase 4: Projects Management - Research

**Researched:** 2026-01-30
**Domain:** GTD Project Management, Svelte 5 UI Patterns, Dexie.js Queries
**Confidence:** HIGH

## Summary

Phase 4 implements GTD project management on top of the existing data model. The good news: **no schema migration needed**. The `GTDItem` table already supports `type='project'`, `projectId` linking, `completedAt` tracking, and `type='someday'` transitions.

The core work involves:
1. Creating project CRUD operations and a `/projects` route following the established `/actions` pattern
2. Implementing stalled project detection using Dexie.js in-memory filtering (projects with no active next actions)
3. Visual warning indicators using Tailwind CSS badge patterns (yellow/amber for stalled state)
4. Project selection UI in ProcessingFlow and ActionDetailPanel (native select or simple dropdown)
5. Project-action relationship display

**Primary recommendation:** Follow the established patterns from Phase 3 (ActionState store, route structure, list component pattern) and adapt them for projects. Use Dexie.js in-memory filtering for stalled detection since IndexedDB lacks native JOIN operations.

## Standard Stack

All required libraries are already in the project. No new dependencies needed.

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Dexie 4.x | 4.x | IndexedDB operations | Type-safe EntityTable already used throughout |
| Svelte 5 | 5.x | UI framework | $state runes pattern established in Phase 3 |
| Tailwind CSS | v4 | Styling | Badge/indicator utilities for stalled warnings |
| svelte-5-french-toast | Latest | Notifications | Toast pattern for undo operations |

### Supporting (Already Installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| svelte-dnd-action | Latest | Drag-and-drop | If project reordering needed (optional for Phase 4) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native select | shadcn-svelte Combobox | Combobox has known Svelte 5 issues; native select works fine for small project lists |
| Dexie in-memory filter | Custom indexing | IndexedDB lacks JOIN support; in-memory is standard pattern |

**Installation:**
No new packages needed. All dependencies already installed.

## Architecture Patterns

### Recommended Project Structure

Follow the Phase 3 pattern for consistency:

```
src/
├── lib/
│   ├── db/
│   │   ├── operations.ts          # Add project operations here
│   │   └── schema.ts               # No changes needed
│   ├── stores/
│   │   └── projects.svelte.ts     # New: ProjectState class (mirrors ActionState)
│   └── components/
│       ├── ProjectList.svelte      # New: mirrors ActionList pattern
│       ├── ProjectItem.svelte      # New: mirrors ActionItem pattern
│       └── ProjectDetailPanel.svelte # New: mirrors ActionDetailPanel pattern
└── routes/
    └── projects/
        └── +page.svelte            # New: mirrors /actions route pattern
```

### Pattern 1: State Store Class (Established in Phase 3)

**What:** Svelte 5 $state runes in a class instance for reactive state management
**When to use:** All list views with filtering and selection

**Example:**
```typescript
// src/lib/stores/projects.svelte.ts
import { getAllProjects, getProjectsByType } from '../db/operations';
import type { GTDItem } from '../db/schema';

export class ProjectState {
  items = $state<GTDItem[]>([]);
  selectedIds = $state<number[]>([]);
  expandedId = $state<number | null>(null);

  // Derived state
  itemCount = $derived(this.items.length);
  stalledProjects = $derived(
    this.items.filter(p => /* logic for stalled detection */)
  );

  async loadProjects() {
    this.items = await getAllProjects();
  }

  expandItem(id: number) {
    this.expandedId = this.expandedId === id ? null : id;
  }
}

export const projectState = new ProjectState();
```

### Pattern 2: Route + Component Separation

**What:** Minimal route page that delegates to component
**When to use:** All major views

**Example:**
```svelte
<!-- src/routes/projects/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import ProjectList from '$lib/components/ProjectList.svelte';
  import { projectState } from '$lib/stores/projects.svelte';

  onMount(async () => {
    await projectState.loadProjects();
  });
</script>

<ProjectList />
```

### Pattern 3: Stalled Project Detection (Dexie.js Pattern)

**What:** In-memory filtering to find projects without active next actions
**When to use:** Computing relationships that IndexedDB can't query

**Example from Dexie.js community:**
```typescript
// Source: https://github.com/dexie/Dexie.js/issues/666
async function getStalledProjects(): Promise<GTDItem[]> {
  // Get all projects
  const projects = await db.items
    .where('type')
    .equals('project')
    .filter(p => !p.completedAt) // Only active projects
    .toArray();

  // Get all active next actions
  const actions = await db.items
    .where('type')
    .equals('next-action')
    .filter(a => !a.completedAt && a.projectId !== undefined)
    .toArray();

  // Create set of project IDs that have actions
  const projectsWithActions = new Set(
    actions.map(a => a.projectId).filter(Boolean)
  );

  // Return projects NOT in that set (stalled projects)
  return projects.filter(p => !projectsWithActions.has(p.id));
}
```

### Pattern 4: Visual Warning Indicator

**What:** Tailwind CSS badge with warning colors for stalled state
**When to use:** Status indicators requiring user attention

**Example from Flowbite patterns:**
```svelte
{#if isStalled}
  <span class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/30 rounded">
    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"/>
    </svg>
    No next action
  </span>
{/if}
```

### Anti-Patterns to Avoid

- **Don't create a separate projects table:** Projects are GTDItems with `type='project'`
- **Don't use client-side JOIN libraries:** Dexie in-memory filtering is the standard pattern
- **Don't over-engineer project selection:** Native `<select>` works fine; avoid complex combobox libraries with Svelte 5 compatibility issues
- **Don't duplicate store patterns:** ProjectState should mirror ActionState structure for consistency

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop reordering | Custom mouse handlers | svelte-dnd-action | Accessibility, touch support, edge cases already handled. Already used in Phase 3. |
| Toast notifications | Custom dismissible alerts | svelte-5-french-toast | Undo pattern, stacking, timing already implemented |
| Date formatting | Manual date string logic | Intl.DateTimeFormat | Already used in ActionDetailPanel (see line 60-64) |
| Finding items without relationships | Custom SQL-like queries | Dexie in-memory filtering | IndexedDB has no JOIN support; this is the standard pattern |

**Key insight:** Dexie.js doesn't support SQL-like JOINs. The established pattern is to query both tables, create a Set of IDs, then filter in memory. This is more efficient than trying to work around IndexedDB's limitations.

## Common Pitfalls

### Pitfall 1: Forgetting $state.snapshot() for svelte-dnd-action

**What goes wrong:** Svelte 5 proxy objects break svelte-dnd-action's internal array manipulation, causing runtime errors or flickering

**Why it happens:** Svelte 5 wraps reactive state in Proxy objects; svelte-dnd-action expects plain arrays

**How to avoid:** Always use `$state.snapshot()` when passing reactive arrays to dndzone

**Warning signs:** Drag-and-drop flickering, "Cannot create property" errors during drag operations

**Example from Phase 3 (ActionList.svelte:11-16):**
```typescript
let dragItems = $state<GTDItem[]>([]);

$effect(() => {
  dragItems = $state.snapshot(actionState.items) as GTDItem[];
});
```

### Pitfall 2: Inefficient Stalled Project Detection

**What goes wrong:** Running separate database queries for each project to check for actions (N+1 query problem)

**Why it happens:** Intuitive to check "does this project have actions?" per project

**How to avoid:** Query all projects and all actions once, then filter in memory using a Set

**Warning signs:** Slow project list loading, multiple database calls in waterfall

**Correct approach:**
```typescript
// GOOD: 2 queries total
const projects = await db.items.where('type').equals('project').toArray();
const actions = await db.items.where('type').equals('next-action').toArray();
const projectsWithActions = new Set(actions.map(a => a.projectId));
const stalled = projects.filter(p => !projectsWithActions.has(p.id));

// BAD: N+1 queries (1 for projects + 1 per project for actions)
for (const project of projects) {
  const hasActions = await db.items
    .where('projectId').equals(project.id).count() > 0;
}
```

### Pitfall 3: Project vs. Someday/Maybe Confusion

**What goes wrong:** Users unsure when to mark projects complete vs. move to someday/maybe

**Why it happens:** GTD methodology distinction isn't obvious in UI

**How to avoid:** Clear UI copy and separate actions for different transitions

**Warning signs:** User questions about "what's the difference?" or incorrect state transitions

**GTD guidance (from official sources):**
- **Complete:** Outcome achieved, project done
- **Someday/Maybe:** Not committed to working on it now, may reconsider later
- **Stalled → Someday:** If a project has no next action and you're not actively planning to work on it

### Pitfall 4: Missing Weekly Review Context

**What goes wrong:** Projects remain stalled indefinitely without user awareness

**Why it happens:** No reminder to review and update projects regularly

**How to avoid:** Visual stalled indicators + documentation about weekly review importance

**Warning signs:** Growing list of inactive projects, user never notices stalled state

**GTD best practice:** "The Someday/Maybe list must be reviewed weekly. The value disappears when you don't review and update it regularly." - FacileThings

## Code Examples

Verified patterns from existing codebase and official sources:

### Project Operations (New)

```typescript
// src/lib/db/operations.ts
// Add these functions following the existing pattern

export async function getAllProjects(): Promise<GTDItem[]> {
  return await db.items
    .where('type')
    .equals('project')
    .filter(item => !item.completedAt)
    .sortBy('created');
}

export async function getActionsByProject(projectId: number): Promise<GTDItem[]> {
  return await db.items
    .where('projectId')
    .equals(projectId)
    .filter(item => !item.completedAt)
    .toArray();
}

export async function getStalledProjects(): Promise<GTDItem[]> {
  // Get all active projects
  const projects = await db.items
    .where('type')
    .equals('project')
    .filter(p => !p.completedAt)
    .toArray();

  // Get all active actions with projectId
  const actions = await db.items
    .where('type')
    .equals('next-action')
    .filter(a => !a.completedAt && a.projectId !== undefined)
    .toArray();

  // Create Set of project IDs that have actions
  const projectsWithActions = new Set(
    actions.map(a => a.projectId).filter(Boolean)
  );

  // Return projects without actions
  return projects.filter(p => !projectsWithActions.has(p.id));
}

export async function completeProject(id: number): Promise<() => Promise<void>> {
  await db.items.update(id, {
    completedAt: new Date(),
    modified: new Date()
  });

  // Return undo function (follows Phase 3 pattern)
  return async () => {
    await db.items.update(id, {
      completedAt: undefined,
      modified: new Date()
    });
  };
}

export async function moveProjectToSomeday(id: number): Promise<void> {
  await db.items.update(id, {
    type: 'someday',
    modified: new Date()
  });
}
```

### Project Selection Dropdown (Simple Pattern)

```svelte
<!-- In ActionDetailPanel.svelte or ProcessingFlow.svelte -->
<script lang="ts">
  import { getAllProjects } from '$lib/db/operations';
  import type { GTDItem } from '$lib/db/schema';

  let projects = $state<GTDItem[]>([]);
  let selectedProjectId = $state<number | undefined>(undefined);

  onMount(async () => {
    projects = await getAllProjects();
  });
</script>

<label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
  Project (optional)
</label>
<select
  bind:value={selectedProjectId}
  class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
>
  <option value={undefined}>No project</option>
  {#each projects as project (project.id)}
    <option value={project.id}>{project.title}</option>
  {/each}
</select>
```

### Stalled Indicator Component

```svelte
<!-- In ProjectItem.svelte -->
<script lang="ts">
  interface ProjectItemProps {
    project: GTDItem;
    isStalled: boolean;
  }

  let { project, isStalled }: ProjectItemProps = $props();
</script>

<div class="flex items-center justify-between">
  <div class="flex-1">
    <h3 class="font-medium text-gray-900 dark:text-gray-100">
      {project.title}
    </h3>
  </div>

  {#if isStalled}
    <span class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/30 rounded">
      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"/>
      </svg>
      No next action
    </span>
  {/if}
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate projects table | Projects as GTDItems with type='project' | Initial design | Simpler schema, easier filtering |
| Writable stores | $state runes in classes | Svelte 5 (2024) | Better TypeScript, less boilerplate |
| Combobox libraries | Native select for small lists | Svelte 5 (2024) | Combobox has compatibility issues with Svelte 5 |
| on:event syntax | onevent syntax | Svelte 5 (2024) | Recommended for runes mode |

**Deprecated/outdated:**
- Svelte stores (writable, derived): Use $state and $derived runes instead
- shadcn-svelte Combobox with Svelte 5: Known compatibility issues per GitHub issue #1270

## Open Questions

### 1. Project reordering priority
- **What we know:** svelte-dnd-action works with Svelte 5 using $state.snapshot() pattern
- **What's unclear:** Whether project reordering is required in Phase 4 success criteria
- **Recommendation:** Implement basic list first, add reordering if time permits (pattern already established)

### 2. Project completion behavior for child actions
- **What we know:** GTD says completing a project means outcome achieved
- **What's unclear:** Should child actions auto-complete, remain as orphans, or warn user?
- **Recommendation:** Start simple - allow orphaned actions, add warning in detail panel. Can enhance in later phases.

### 3. Someday/Maybe list view
- **What we know:** Phase 4 requirements include moving projects to someday/maybe
- **What's unclear:** Whether someday/maybe items need a dedicated list view or just filtering
- **Recommendation:** Use same /projects route with filter toggle (active vs someday/maybe)

## Sources

### Primary (HIGH confidence)

#### Official GTD Guidance:
- [Managing projects with GTD - Getting Things Done](https://gettingthingsdone.com/2017/05/managing-projects-with-gtd/) - David Allen's official guidance on project management
- [Basic GTD: How to manage your projects - FacileThings](https://facilethings.com/blog/en/basics-projects) - Project-action relationships
- [Managing the Someday Maybes with GTD - FacileThings](https://facilethings.com/blog/en/someday-maybes) - Active vs incubated project criteria

#### Technical Documentation:
- [Dexie.js Issue #666: Filter collection by related-table's collection](https://github.com/dfahlander/Dexie.js/issues/666) - Standard pattern for finding items without relationships
- Existing codebase (ActionState pattern, operations.ts, schema.ts) - Established patterns to mirror

### Secondary (MEDIUM confidence)

#### UI Patterns:
- [Tailwind CSS Badges - Flowbite](https://flowbite.com/docs/components/badge/) - Warning badge patterns
- [Carbon Design System - Status indicators](https://carbondesignsystem.com/patterns/status-indicator-pattern/) - Visual warning patterns
- [svelte-dnd-action Svelte 5 compatibility](https://github.com/sveltejs/svelte/issues/10115) - Known flickering issue and $state.snapshot() fix

#### Community Guidance:
- [GTD Forums: Deciding what goes in Projects vs. Someday/Maybe](https://forum.gettingthingsdone.com/threads/deciding-what-goes-in-projects-vs-someday-maybe.16528/) - User decision criteria
- [The GTD Approach to Linking Next Actions and Projects](https://gettingthingsdone.com/2020/06/the-gtd-approach-to-linking-next-actions-and-projects/) - Relationship patterns

### Tertiary (LOW confidence)
- WebSearch results for combobox libraries - Many show Svelte 5 compatibility issues; recommend native select instead

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and proven in Phase 3
- Architecture patterns: HIGH - Mirroring established Phase 3 patterns
- Stalled detection: HIGH - Dexie.js community pattern is standard approach
- GTD guidance: MEDIUM - Multiple credible sources agree, but user interpretation may vary
- UI patterns: MEDIUM - Standard design system patterns, adapted to existing codebase

**Research date:** 2026-01-30
**Valid until:** 2026-02-28 (30 days - stable domain, proven patterns)
