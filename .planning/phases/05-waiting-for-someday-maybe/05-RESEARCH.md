# Phase 5: Waiting For & Someday/Maybe - Research

**Researched:** 2026-01-30
**Domain:** GTD methodology for delegation tracking and idea incubation
**Confidence:** HIGH

## Summary

This phase implements two core GTD list types: Waiting For (tracking delegated items and dependencies) and Someday/Maybe (parking future ideas without cluttering active lists). The research focused on GTD methodology best practices, data model requirements, and UI patterns that align with the existing codebase.

GTD best practices are clear: Waiting For items must capture who, what, and when delegated, with regular review as the primary follow-up mechanism. The format "[Person] [Task with details] [Date]" is standard. Follow-up dates can be tracked but are secondary to weekly review discipline. Visual indicators (color-coding overdue items) help prioritize review attention.

Someday/Maybe lists are flexible by design—the GTD methodology emphasizes permission to capture anything without restrictions. Categorization helps organization but should not create friction during capture. Most practitioners use simple categories like "Projects," "Learning," "Travel," "Hobbies," and add optional notes/details when helpful. Weekly review is the mechanism for promoting items to active status.

**Primary recommendation:** Use the existing GTD item model (already has delegatedTo field), add followUpDate field for optional tracking, implement simple category field for someday/maybe items, and follow the established list/store/operations pattern from phases 3-4.

## Standard Stack

No new libraries needed. This phase extends the existing stack established in phases 1-4.

### Core (Already Established)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Dexie 4.x | 4.x | IndexedDB ORM with EntityTable | Already in use, handles date queries well |
| Svelte 5 | 5.x | UI framework with $state runes | Project standard |
| Tailwind v4 | 4.x | Styling | Project standard |
| svelte-dnd-action | Latest | Drag-and-drop for reordering | Already used in ActionList |
| svelte-5-french-toast | Latest | Toast notifications | Already used for undo flows |

### Supporting
No additional libraries needed.

### Alternatives Considered
None. This phase extends existing patterns rather than introducing new technology.

## Architecture Patterns

### Recommended Data Model Extensions

The GTDItem interface already has most fields needed. Add these optional fields:

```typescript
export interface GTDItem {
  // ... existing fields ...
  delegatedTo?: string;        // Already exists
  followUpDate?: Date;         // NEW: Optional follow-up reminder date
  category?: string;           // NEW: For someday/maybe organization
}
```

### Pattern 1: Waiting For List Store

**What:** Reactive state management for waiting-for list with overdue detection
**When to use:** For the /waiting route
**Example:**
```typescript
// Source: Existing pattern from actions.svelte.ts and projects.svelte.ts
export class WaitingForState {
  items = $state<GTDItem[]>([]);
  overdueIds = $state<Set<number>>(new Set());
  expandedId = $state<number | null>(null);

  itemCount = $derived(this.items.length);
  overdueCount = $derived(this.overdueIds.size);

  async loadItems() {
    this.items = await getAllWaitingFor();
    this.overdueIds = new Set(
      this.items
        .filter(item => item.followUpDate && item.followUpDate < new Date())
        .map(item => item.id)
    );
  }

  isOverdue(id: number): boolean {
    return this.overdueIds.has(id);
  }
}
```

### Pattern 2: Someday/Maybe List Store with Categories

**What:** Reactive state with predefined category filtering
**When to use:** For the /someday route
**Example:**
```typescript
// Source: Existing pattern from actions.svelte.ts (context filtering)
export class SomedayMaybeState {
  items = $state<GTDItem[]>([]);
  selectedCategory = $state<string | null>(null);  // null = "All" view
  expandedId = $state<number | null>(null);

  itemCount = $derived(this.items.length);

  async loadItems() {
    this.items = await getAllSomedayMaybe();
  }

  get filteredItems(): GTDItem[] {
    if (!this.selectedCategory) return this.items;
    return this.items.filter(item => item.category === this.selectedCategory);
  }

  selectCategory(category: string | null) {
    this.selectedCategory = category;
  }
}
```

### Pattern 3: Database Operations Following Established Conventions

**What:** Type-filtered queries with date-based sorting
**When to use:** In operations.ts
**Example:**
```typescript
// Source: Existing getAllNextActions() and getAllProjects() patterns
export async function getAllWaitingFor(): Promise<GTDItem[]> {
  const items = await db.items
    .where('type')
    .equals('waiting')
    .filter(item => !item.completedAt)
    .toArray();

  // Sort by followUpDate (ascending, nulls last), then created
  return items.sort((a, b) => {
    const aDate = a.followUpDate ?? new Date(8640000000000000); // Max date
    const bDate = b.followUpDate ?? new Date(8640000000000000);
    if (aDate.getTime() !== bDate.getTime()) {
      return aDate.getTime() - bDate.getTime();
    }
    return a.created.getTime() - b.created.getTime();
  });
}

export async function getAllSomedayMaybe(): Promise<GTDItem[]> {
  return await db.items
    .where('type')
    .equals('someday')
    .filter(item => !item.completedAt)
    .sortBy('created');
}

export async function resolveWaitingFor(id: number): Promise<void> {
  await db.items.update(id, {
    completedAt: new Date(),
    modified: new Date()
  });
}

export async function promoteSomedayToActive(id: number, newType: 'project' | 'next-action'): Promise<void> {
  await db.items.update(id, {
    type: newType,
    category: undefined,  // Clear category when promoting
    modified: new Date()
  });
}
```

### Pattern 4: Route Structure

**What:** Standard SvelteKit route pattern with store-backed list components
**When to use:** Creating /waiting and /someday routes
**Example:**
```typescript
// src/routes/waiting/+page.svelte
// Source: Existing actions/+page.svelte pattern
<script lang="ts">
  import { onMount } from 'svelte';
  import WaitingForList from '$lib/components/WaitingForList.svelte';
  import { waitingForState } from '$lib/stores/waiting.svelte';

  onMount(async () => {
    await waitingForState.loadItems();
  });
</script>

<WaitingForList />
```

### Pattern 5: Sidebar Navigation Extension

**What:** Add waiting-for and someday/maybe links to sidebar with conditional badges
**When to use:** Extending Sidebar.svelte
**Example:**
```svelte
<!-- Source: Existing sidebar pattern with inbox count and stalled projects count -->
<a href="/waiting"
   class="...">
  <span>Waiting For</span>
  <!-- NO badge per user decision -->
</a>

<a href="/someday"
   class="...">
  <span>Someday/Maybe</span>
  <!-- NO badge per user decision -->
</a>
```

### Pattern 6: Keyboard Shortcuts Extension

**What:** Add 'w' and 's' shortcuts following existing 'n' and 'p' pattern
**When to use:** Extending +layout.svelte handleKeydown
**Example:**
```typescript
// Source: Existing keyboard shortcuts in +layout.svelte
// w: Navigate to Waiting For
if (event.key === 'w') {
  event.preventDefault();
  goto('/waiting');
  return;
}

// s: Navigate to Someday/Maybe
if (event.key === 's') {
  event.preventDefault();
  goto('/someday');
  return;
}
```

### Anti-Patterns to Avoid

- **Building custom date-picker components:** Use native `<input type="date">` which works well on all platforms and follows established form patterns in this project
- **Complex category hierarchies:** GTD methodology emphasizes simple, flat categories to avoid analysis paralysis
- **Automatic follow-up reminders:** GTD relies on weekly review, not tickler-file automation. Follow-up dates are reference points for review, not automatic reminders
- **Badge inflation:** User explicitly requested no badges for these lists—they're review-time concerns, not urgent action lists

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date comparison | Custom date utilities | Native JavaScript Date with getTime() | Simple, reliable, already used in codebase (see operations.ts) |
| Overdue detection | Complex date math | Simple comparison: `item.followUpDate < new Date()` | Clear, testable, no edge cases |
| Toast notifications | Custom notification system | svelte-5-french-toast (already in use) | Already handles undo flows in ActionList |
| Drag-and-drop | Custom DnD logic | svelte-dnd-action (already in use) | If reordering needed, pattern established |
| List filtering | Custom filter UI | Existing context-filter pattern from ActionList | Proven pattern in codebase |

**Key insight:** This phase extends existing patterns rather than introducing new infrastructure. Every UI pattern, state management approach, and database operation has a working example in phases 1-4.

## Common Pitfalls

### Pitfall 1: Over-engineering Follow-up Date Logic
**What goes wrong:** Implementing automatic reminders, calendar sync, or complex tickler-file systems
**Why it happens:** Misunderstanding GTD methodology—delegated items are managed through weekly review, not automatic ticklers
**How to avoid:** Make followUpDate an optional reference field for weekly review, not a trigger for automatic actions
**Warning signs:** Planning notification systems, cron jobs, or "smart" follow-up logic

### Pitfall 2: Category Creation Friction During Processing
**What goes wrong:** Forcing users to pick a someday/maybe category during inbox processing
**Why it happens:** Wanting perfect organization upfront
**How to avoid:** User decided category selection happens LATER, not during processing. Processing flow creates items with category: undefined, users categorize during weekly review
**Warning signs:** Category picker in ProcessingFlow.svelte delegate/incubate steps

### Pitfall 3: Treating Waiting-For as Urgent Action Items
**What goes wrong:** Adding badges, notifications, or urgent styling that implies immediate action needed
**Why it happens:** Confusing "overdue" with "urgent"—but delegation follow-up is review-time work
**How to avoid:** Visual indicators for overdue items (color) are for prioritizing review attention, not creating urgency. No sidebar badges per user decision
**Warning signs:** Red badges, notification dots, or "Action Required!" messaging

### Pitfall 4: Complex Promotion Workflows
**What goes wrong:** Building multi-step wizards to promote someday/maybe to active projects
**Why it happens:** Over-thinking the transition
**How to avoid:** Promotion is just a type change: 'someday' → 'project' or 'next-action'. User can edit details after promotion
**Warning signs:** Modal dialogs with multiple fields during promotion flow

### Pitfall 5: Forgetting to Filter Out Completed Items
**What goes wrong:** Completed waiting-for or someday items reappear in lists
**Why it happens:** Copy-paste query code without adding `.filter(item => !item.completedAt)`
**How to avoid:** Every list query (getAllWaitingFor, getAllSomedayMaybe) must filter out completed items, following the established pattern from getAllNextActions and getAllProjects
**Warning signs:** Test data shows completed items in lists

### Pitfall 6: Assuming followUpDate Needs Database Index
**What goes wrong:** Adding followUpDate to schema indexes unnecessarily
**Why it happens:** Premature optimization
**How to avoid:** In-memory sorting is fine for personal GTD app scales (dozens to hundreds of items). Only index if proven slow
**Warning signs:** Complex compound indexes before performance testing

## Code Examples

### Empty State (Instructional)

```svelte
<!-- Source: User requirement for instructional empty states -->
{#if waitingForState.itemCount === 0}
  <div class="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
    <p class="text-lg font-medium mb-2">No waiting-for items yet</p>
    <p class="text-sm text-center max-w-md">
      Use inbox processing to delegate tasks. When you're waiting on someone else
      to complete work, add it to your waiting-for list.
    </p>
  </div>
{/if}
```

### Overdue Visual Treatment

```svelte
<!-- Source: GTD best practices research, WebSearch findings -->
<div class="p-4 rounded-lg {isOverdue(item.id) ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : 'bg-white dark:bg-gray-800'}">
  <h3 class="{isOverdue(item.id) ? 'text-red-900 dark:text-red-100' : 'text-gray-900 dark:text-gray-100'}">
    {item.title}
  </h3>
  <p class="text-sm text-gray-600 dark:text-gray-400">
    Delegated to {item.delegatedTo} on {formatDate(item.created)}
  </p>
  {#if item.followUpDate}
    <p class="text-xs {isOverdue(item.id) ? 'text-red-700 dark:text-red-300' : 'text-gray-500 dark:text-gray-500'}">
      Follow up: {formatDate(item.followUpDate)}
    </p>
  {/if}
</div>
```

### Category Filter Sidebar

```svelte
<!-- Source: Existing ContextList.svelte pattern -->
<div class="space-y-1">
  <button
    class="w-full text-left px-4 py-1.5 text-sm rounded {selectedCategory === null ? 'bg-gray-200 dark:bg-gray-700' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}"
    onclick={() => selectCategory(null)}
  >
    All
  </button>

  {#each SOMEDAY_CATEGORIES as category}
    <button
      class="w-full text-left px-4 py-1.5 text-sm rounded {selectedCategory === category ? 'bg-gray-200 dark:bg-gray-700' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}"
      onclick={() => selectCategory(category)}
    >
      {category}
    </button>
  {/each}
</div>
```

### Predefined Someday/Maybe Categories

```typescript
// Source: GTD research, user requirement for predefined categories
export const SOMEDAY_CATEGORIES = [
  'Projects',
  'Learning',
  'Travel',
  'Hobbies',
  'Books & Media',
  'Skills',
  'Places to Visit',
  'Things to Try'
] as const;

export type SomedayCategory = typeof SOMEDAY_CATEGORIES[number];
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Paper-based waiting-for lists | Digital lists with date tracking | Digital GTD apps (~2010s) | Enables automatic overdue detection |
| Single someday/maybe list | Categorized someday/maybe | Modern GTD apps (2015+) | Easier to review by life area during weekly review |
| Manual follow-up reminders in calendar | Follow-up date field in waiting-for item | GTD software evolution | Keeps all delegation context in one place |
| Tickler file for follow-ups | Weekly review discipline | Core GTD methodology | Simpler, more reliable than automation |

**Deprecated/outdated:**
- Automatic email reminders for delegated tasks: GTD methodology relies on weekly review, not automation
- Complex category hierarchies: Modern GTD practice favors 6-8 simple categories over nested taxonomies
- Separate "waiting" and "delegated" lists: These are the same thing—consolidated in modern GTD

## Open Questions

### 1. Someday/Maybe Promotion Flow Details
**What we know:** User wants to promote someday/maybe items to active status
**What's unclear:** Should promotion:
  - Always create a project?
  - Always create a next action?
  - Let user choose at promotion time?
**Recommendation:** Let user choose (button dropdown: "Make Project" / "Make Action"). Projects often start as ideas, but some someday items are one-shot actions. GTD research shows both patterns.

### 2. Overdue Sorting vs Visual-Only
**What we know:** Overdue waiting-for items need visual distinction
**What's unclear:** Should overdue items also be:
  - Sorted to top of list?
  - Or just visually highlighted in natural order?
**Recommendation:** Sort to top. GTD research shows practitioners want overdue items at top for weekly review. Sorting by followUpDate (ascending, nulls last) naturally brings overdue items to top.

### 3. Someday/Maybe Notes Field Prominence
**What we know:** GTD practitioners vary—some use title-only, some add detailed notes
**What's unclear:** Should UI emphasize notes field or treat it as optional detail?
**Recommendation:** Title is primary, notes are optional detail in expanded view. Matches existing pattern from actions and projects. Users can add context during weekly review if needed.

## Sources

### Primary (HIGH confidence)
- [FacileThings: How to delegate actions in GTD](https://facilethings.com/blog/en/delegation) - Delegation workflow, follow-up best practices
- [FacileThings: Managing the Someday Maybes with GTD](https://facilethings.com/blog/en/someday-maybes) - Review process, organization approach
- [GTD Official: What goes on a Someday Maybe list?](https://gettingthingsdone.com/2010/10/what-goes-on-a-someday-maybe-list/) - Types of items, review discipline
- [Dexie.js Documentation: WhereClause](https://dexie.org/docs/WhereClause/WhereClause) - Date comparison queries
- [Dexie.js Documentation: Collection.filter()](https://dexie.org/docs/Collection/Collection.filter()) - Filtering patterns
- Existing codebase: src/lib/db/schema.ts, operations.ts, stores/*.svelte.ts - Established patterns

### Secondary (MEDIUM confidence)
- [GTD in 15 minutes – A Pragmatic Guide](https://hamberg.no/gtd) - Core GTD methodology summary
- [Getting Things Done Forums: Waiting for list vs. Tickler](https://forum.gettingthingsdone.com/threads/waiting-for-list-vs-tickler.10684/) - Follow-up date handling
- [Getting Things Done Forums: Someday/Maybe Projects vs Actions](https://forum.gettingthingsdone.com/threads/someday-maybe-projects-vs-actions.16126/) - Promotion patterns
- [Calm Achiever: How to achieve big goals with Someday/Maybe list](https://calmachiever.com/somedaymaybe-list/) - Note-taking recommendations

### Tertiary (LOW confidence)
- Various GTD app reviews and blog posts - General overdue tracking patterns
- Stack Overflow and Medium articles on Dexie date queries - Technical implementation patterns (verified against official docs)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Extends existing stack, no new libraries needed
- Architecture: HIGH - Direct application of established patterns from phases 3-4
- GTD methodology: HIGH - Multiple authoritative sources agree on core practices
- UI patterns: HIGH - Follows existing codebase conventions
- Open questions: MEDIUM - Planner has enough information to make decisions, but user preference may vary

**Research date:** 2026-01-30
**Valid until:** 2026-02-27 (30 days, stable domain)
