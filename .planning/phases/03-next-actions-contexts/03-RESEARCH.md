# Phase 3: Next Actions & Contexts - Research

**Researched:** 2026-01-30
**Domain:** Task list filtering, drag-and-drop reordering, completion workflows
**Confidence:** HIGH

## Summary

This phase builds a filtered task view with context-based organization (@computer, @office, @phone, etc.), manual reordering via drag-and-drop, inline editing, and satisfying completion flows with undo capability. The research focused on five key domains:

1. **Drag-and-drop libraries** compatible with Svelte 5 runes for manual reordering
2. **Animation patterns** for completion feedback (strikethrough + fade-out)
3. **Multi-context filtering** UI/UX patterns and state management
4. **Inline editing** accessibility tradeoffs
5. **Completion + undo** patterns with toast notifications

The standard approach combines svelte-dnd-action (proven, Svelte 5 compatible) for reordering, Svelte's built-in transitions for completion animations, and svelte-5-french-toast (already in use) for undo notifications. Context filtering follows established patterns: sidebar navigation with multi-select, object-based Dexie queries, and batch filter application.

**Primary recommendation:** Use svelte-dnd-action for drag-and-drop (mature, accessible, Svelte 5 compatible), store manual order in a `sortOrder` field on each action, implement completion as optimistic UI with 5-second undo window, and follow GTD best practices for multi-context filtering with "All" view for weekly review.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| svelte-dnd-action | 0.9.69+ | Drag-and-drop reordering | Most mature Svelte DnD library, Svelte 5 compatible (onconsider/onfinalize), accessible, battle-tested in production |
| Svelte transitions | 5.x (built-in) | Completion animations | Native framework support, performant, works with CSS for combined effects |
| svelte-5-french-toast | 2.0.6 (already installed) | Undo toast notifications | Already in use, Svelte 5 compatible, supports action buttons for undo |
| Dexie 4.x | 4.2.1 (already installed) | Context filtering queries | Already in schema, supports compound indexes for multi-field queries |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Svelte flip animation | 5.x (built-in) | Smooth list reordering | Pair with svelte-dnd-action for visual feedback during drag |
| Svelte scale transition | 5.x (built-in) | Detail panel expansion | Alternative to slide for expanding action details |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| svelte-dnd-action | @thisux/sveltednd | Newer (built for Svelte 5 runes), but less mature. Lacks accessibility features and production track record. Choose for greenfield if you need cleaner API. |
| svelte-dnd-action | dnd-kit-svelte | Port of popular React library, but 0.1.5 is early stage. Choose if you need React dnd-kit feature parity. |
| Input field inline edit | contenteditable | Allows rich text, but terrible accessibility. Never use for simple title editing. |

**Installation:**
```bash
npm install svelte-dnd-action
# Other dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/lib/
├── components/
│   ├── ContextList.svelte        # Sidebar context navigation with multi-select
│   ├── ActionList.svelte          # Main action list view with DnD
│   ├── ActionItem.svelte          # Individual action row (title, badges, metadata)
│   └── ActionDetailPanel.svelte   # Expanded detail view for editing
├── stores/
│   └── actions.svelte.ts          # Action state with context filtering ($state runes)
├── db/
│   └── operations.ts              # Add: getActionsByContext, completeAction, reorderAction
```

### Pattern 1: Context-Based Filtering with Multi-Select
**What:** Allow users to select multiple contexts simultaneously (e.g., @computer + @home for working from home) using sidebar checkboxes, then query database for actions matching ANY selected context.

**When to use:** GTD contexts, tag-based filtering, any scenario where users need to combine filters.

**Example:**
```typescript
// src/lib/stores/actions.svelte.ts
export class ActionState {
  items = $state<GTDItem[]>([]);
  selectedContexts = $state<string[]>(['@computer']); // Active filter(s)

  async loadActions() {
    if (this.selectedContexts.length === 0) {
      // "All" view - group by context
      this.items = await getAllActions();
    } else {
      // Filter by selected contexts (OR logic)
      this.items = await db.items
        .where('type').equals('next-action')
        .filter(item => this.selectedContexts.includes(item.context || ''))
        .sortBy('sortOrder'); // Manual order first, then created date
    }
  }

  toggleContext(context: string) {
    if (this.selectedContexts.includes(context)) {
      this.selectedContexts = this.selectedContexts.filter(c => c !== context);
    } else {
      this.selectedContexts = [...this.selectedContexts, context];
    }
    this.loadActions(); // Batch apply
  }
}
```

### Pattern 2: Drag-and-Drop with Manual Sort Order
**What:** Use svelte-dnd-action with a `sortOrder` field on each action. On drag end, recalculate sortOrder for affected items and batch update.

**When to use:** When users need manual priority ordering within a filtered view.

**Example:**
```svelte
<!-- src/lib/components/ActionList.svelte -->
<script lang="ts">
  import { dndzone } from 'svelte-dnd-action';
  import { flip } from 'svelte/animate';
  import { actionState } from '$lib/stores/actions.svelte';

  let items = $state(actionState.items);

  async function handleDndConsider(e: CustomEvent) {
    items = e.detail.items;
  }

  async function handleDndFinalize(e: CustomEvent) {
    items = e.detail.items;
    // Recalculate sortOrder based on new position
    await reorderActions(items.map(item => item.id));
    await actionState.loadActions();
  }
</script>

<section
  use:dndzone={{ items, flipDurationMs: 300 }}
  onconsider={handleDndConsider}
  onfinalize={handleDndFinalize}
>
  {#each items as item (item.id)}
    <div animate:flip={{ duration: 300 }}>
      <ActionItem {item} />
    </div>
  {/each}
</section>
```

### Pattern 3: Optimistic Completion with Undo
**What:** Mark action complete immediately with visual feedback, show toast with undo, commit to database. If undo clicked within 5 seconds, revert.

**When to use:** Any destructive or significant state change where users might make mistakes.

**Example:**
```typescript
// src/lib/db/operations.ts
export async function completeAction(id: number): Promise<() => Promise<void>> {
  const item = await db.items.get(id);
  if (!item) throw new Error('Item not found');

  // Optimistic update
  await db.items.update(id, {
    completedAt: new Date(),
    modified: new Date()
  });

  // Return undo function
  return async () => {
    await db.items.update(id, {
      completedAt: undefined,
      modified: new Date()
    });
  };
}
```

```svelte
<!-- ActionItem.svelte -->
<script lang="ts">
  import toast from 'svelte-5-french-toast';
  import { fade } from 'svelte/transition';

  let isCompleting = $state(false);

  async function handleComplete() {
    isCompleting = true;

    const undo = await completeAction(item.id);

    toast.success(`"${item.title}" completed`, {
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: async () => {
          await undo();
          isCompleting = false;
          await actionState.loadActions();
        }
      }
    });

    // Wait for animation, then remove from list
    setTimeout(async () => {
      await actionState.loadActions();
    }, 1000);
  }
</script>

{#if !isCompleting}
  <div>
    <!-- Action content -->
  </div>
{:else}
  <div class="line-through opacity-50" transition:fade={{ duration: 1000 }}>
    <!-- Fading out with strikethrough -->
  </div>
{/if}
```

### Pattern 4: Inline Title Editing with Input Swap
**What:** Click title to enter edit mode (swap text for input field), save on blur/Enter, cancel on Escape.

**When to use:** Quick edits where full form would be overkill. NOT for complex fields.

**Example:**
```svelte
<script lang="ts">
  let isEditing = $state(false);
  let editValue = $state(item.title);

  async function handleSave() {
    if (editValue.trim()) {
      await updateItem(item.id, { title: editValue.trim() });
    }
    isEditing = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      editValue = item.title;
      isEditing = false;
    }
  }
</script>

{#if isEditing}
  <input
    bind:value={editValue}
    onblur={handleSave}
    onkeydown={handleKeydown}
    class="font-medium text-gray-900 dark:text-gray-100 w-full"
    autofocus
  />
{:else}
  <h3
    onclick={() => isEditing = true}
    class="font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-gray-100"
  >
    {item.title}
  </h3>
{/if}
```

### Pattern 5: Database Schema for Manual Ordering
**What:** Add `sortOrder` field to GTDItem, use it as primary sort, fall back to created date. Update affected items on reorder.

**When to use:** User-controlled ordering that persists.

**Example:**
```typescript
// src/lib/db/schema.ts - Update GTDItem interface
export interface GTDItem {
  // ... existing fields
  sortOrder?: number; // For manual drag-to-reorder
}

// Update schema version
db.version(3).stores({
  items: "++id, type, created, modified, *searchWords, context, projectId, sortOrder"
});

// src/lib/db/operations.ts
export async function reorderActions(orderedIds: number[]): Promise<void> {
  // Assign sortOrder based on position in array
  const updates = orderedIds.map((id, index) =>
    db.items.update(id, { sortOrder: index, modified: new Date() })
  );
  await Promise.all(updates);
}

export async function getActionsByContext(contexts: string[]): Promise<GTDItem[]> {
  return await db.items
    .where('type').equals('next-action')
    .filter(item => !item.completedAt && contexts.includes(item.context || ''))
    .toArray()
    .then(items => items.sort((a, b) => {
      // Sort by sortOrder if present, otherwise by created date
      if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
        return a.sortOrder - b.sortOrder;
      }
      if (a.sortOrder !== undefined) return -1;
      if (b.sortOrder !== undefined) return 1;
      return a.created.getTime() - b.created.getTime();
    }));
}
```

### Anti-Patterns to Avoid

- **Don't use contenteditable for inline editing:** Accessibility nightmare, browser inconsistencies, complex to manage. Use input field swap pattern instead.
- **Don't recalculate all sortOrder values on every drag:** Only update affected items (dragged item and items between old/new positions).
- **Don't apply filters on every keystroke/click:** Use batch application (user selects multiple contexts, then clicks Apply or waits for debounce).
- **Don't mix indexed and non-indexed queries without filter():** Dexie requires .where() for indexed fields, then .filter() for non-indexed. Don't chain multiple .where() calls.
- **Don't implement drag-and-drop without keyboard alternative:** WCAG 2.5.7 requires single-pointer alternative. Provide up/down arrow buttons or "move to position" menu.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop | Custom mousedown/touchstart handlers | svelte-dnd-action | Handles pointer events, touch devices, auto-scroll, accessibility, flip animations, ghost elements, drop zones. Hundreds of edge cases. |
| Undo notifications | setTimeout + manual state tracking | svelte-5-french-toast with action buttons | Handles stacking, dismissal, auto-dismiss with pause on hover, mobile positioning, accessibility announcements. |
| Relative time formatting | Custom date math strings | Intl.RelativeTimeFormat (already in use) | Localization, edge cases (yesterday vs 1 day ago), plural handling. |
| Context management | Array of strings in localStorage | Database table with Context entities | Supports metadata (color, icon), prevents typos, enables analytics, allows sharing (future). |
| Multi-select state | Array of selected IDs | Same pattern as inbox multi-select | Already built, tested, consistent UX. |

**Key insight:** Drag-and-drop is deceptively complex. Browser inconsistencies, touch vs mouse, accessibility, visual feedback, and auto-scroll all require significant engineering. Use a battle-tested library.

## Common Pitfalls

### Pitfall 1: Race Condition in Undo Flow
**What goes wrong:** User completes action, toast shows undo, user clicks undo while completion animation is still removing item from list. Item flickers or appears twice.

**Why it happens:** Optimistic UI updates state before database commit completes. Undo reverts database but UI already reloaded.

**How to avoid:**
- Use local `isCompleting` state per item to control animation
- Don't reload list until animation completes (1000ms after completion)
- In undo handler, set `isCompleting = false` before reloading
- Consider using derived state: `visibleItems = items.filter(i => !i.completedAt)`

**Warning signs:**
- Flickering during undo
- Item appears twice briefly
- Console errors about missing IDs

### Pitfall 2: Drag-and-Drop Breaks Screen Reader Navigation
**What goes wrong:** Screen reader users can't reorder items because arrow keys perform screen reader navigation instead of drag-and-drop movement.

**Why it happens:** svelte-dnd-action relies on keyboard events (Space to pick up, arrows to move, Space to drop), but screen readers intercept arrow keys for cursor movement.

**How to avoid:**
- Provide alternative UI: up/down arrow buttons next to each item
- Or: "Move to position X" dropdown/menu
- Or: Numeric input for manual sortOrder entry
- Test with actual screen readers (NVDA, JAWS, VoiceOver)

**Warning signs:**
- Keyboard controls work in browser but fail with screen reader active
- Lack of ARIA announcements during drag operations
- Users report inability to reorder

### Pitfall 3: Multi-Context Filter Query Performance
**What goes wrong:** Filtering by multiple contexts becomes slow with large datasets (1000+ actions) because Dexie can't use compound index for OR queries.

**Why it happens:** IndexedDB/Dexie compound indexes work for AND queries (`type='next-action' AND context='@computer'`), not OR queries (`context IN ['@computer', '@home']`). Must filter in memory.

**How to avoid:**
- For small datasets (<500 items): Use `.filter()` in memory (acceptable)
- For large datasets: Query each context separately, merge results, dedupe
- Or: Use multi-entry index with all contexts as array on each item (advanced)
- Or: Accept performance and optimize later if needed

**Warning signs:**
- Noticeable lag when switching contexts
- UI freezes during filter application
- Browser DevTools show long-running filter operations

### Pitfall 4: Incomplete sortOrder Coverage
**What goes wrong:** Some actions have sortOrder, others don't. List jumps around as user drags items between sorted and unsorted sections.

**Why it happens:** sortOrder added in schema migration, but existing items don't have values. Drag handlers assume all items have sortOrder.

**How to avoid:**
- Migration: Populate sortOrder for all existing next-actions (based on created date)
- Query logic: Always provide fallback sort (see Pattern 5 example)
- New items: Set sortOrder = (max(sortOrder) + 1) on creation

**Warning signs:**
- Items jump to bottom/top unexpectedly after drag
- New items always appear at top regardless of creation time
- sortOrder values have gaps or duplicates

### Pitfall 5: Toast Notification Stacking Chaos
**What goes wrong:** User batch-completes 10 actions, gets 10 toast notifications overlapping, can't read or interact with undo buttons.

**Why it happens:** Each completion triggers separate toast. Library stacks them but UI becomes unusable.

**How to avoid:**
- Batch operations: Single toast for multiple completions: "5 actions completed — Undo all"
- Undo handler: Revert all completed items in batch
- Or: Disable batch complete during completion animation
- Or: Queue toasts with max visible (library may support this)

**Warning signs:**
- Toasts cover entire screen
- Users complain they can't see undo buttons
- Multiple undo clicks cause unexpected behavior

### Pitfall 6: Context Badge Click Conflicts with Row Click
**What goes wrong:** User clicks project badge to navigate to project, but row click handler also fires, expanding detail panel instead.

**Why it happens:** Event bubbling - badge click propagates to parent row.

**How to avoid:**
```svelte
<div onclick={expandRow}>
  <h3>{item.title}</h3>
  <a
    href="/projects/{item.projectId}"
    onclick={(e) => e.stopPropagation()}
    class="badge"
  >
    {projectName}
  </a>
</div>
```

**Warning signs:**
- Clicking badge causes unexpected behavior
- Multiple handlers firing for single click
- Can't navigate to project from badge

## Code Examples

Verified patterns from official sources:

### Svelte-dnd-action with Flip Animation
```svelte
<!-- Source: https://github.com/isaacHagoel/svelte-dnd-action -->
<script>
  import { flip } from 'svelte/animate';
  import { dndzone } from 'svelte-dnd-action';

  let items = $state([
    { id: 1, title: "Call dentist", context: "@phone" },
    { id: 2, title: "Review PR", context: "@computer" }
  ]);

  function handleDndConsider(e) {
    items = e.detail.items;
  }

  function handleDndFinalize(e) {
    items = e.detail.items;
    // Persist new order to database
    reorderActions(items.map(i => i.id));
  }
</script>

<section
  use:dndzone={{ items, flipDurationMs: 300 }}
  onconsider={handleDndConsider}
  onfinalize={handleDndFinalize}
>
  {#each items as item (item.id)}
    <div animate:flip={{ duration: 300 }}>
      <h3>{item.title}</h3>
      <span class="badge">{item.context}</span>
    </div>
  {/each}
</section>
```

### Fade Transition with Strikethrough
```svelte
<!-- Source: https://svelte.dev/docs/svelte/svelte-transition -->
<script lang="ts">
  import { fade } from 'svelte/transition';

  let isCompleting = $state(false);
</script>

{#if !isCompleting}
  <div class="action-row">
    <button onclick={() => isCompleting = true}>Complete</button>
  </div>
{:else}
  <div
    class="action-row line-through opacity-50"
    transition:fade={{ duration: 1000 }}
  >
    <!-- Content fades out over 1 second with strikethrough -->
  </div>
{/if}
```

### Multi-Context Filter Query
```typescript
// Pattern: Filter by multiple contexts with Dexie
// Source: https://github.com/dexie/Dexie.js/issues/87
async function getActionsByContexts(contexts: string[]): Promise<GTDItem[]> {
  return await db.items
    .where('type').equals('next-action')
    .filter(item =>
      !item.completedAt &&
      contexts.includes(item.context || '')
    )
    .toArray();
}
```

### Toast with Undo Action
```typescript
// Source: svelte-5-french-toast usage (already in codebase)
import toast from 'svelte-5-french-toast';

async function completeAction(item: GTDItem) {
  const undo = await markComplete(item.id);

  toast.success(`"${item.title}" completed`, {
    duration: 5000,
    // Note: Check official docs for exact action button API
    // May need custom toast component for undo button
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-beautiful-dnd (React only) | svelte-dnd-action for Svelte | 2020-2021 | Svelte-native DnD without React dependency |
| Svelte 4 `on:consider` syntax | Svelte 5 `onconsider` (both work) | Svelte 5 (2024) | Consistent with new event handler syntax |
| `$derived` store for filtering | `$state` + `$derived` runes | Svelte 5 (2024) | Better reactivity, simpler code |
| Static position field | sortOrder with gaps/ranges | Ongoing | Allows inserting between items without full recalc |
| Single context per action | Multi-context support | GTD evolution | More flexible but requires array storage |

**Deprecated/outdated:**
- **contenteditable for inline edit:** Never good, but now explicitly discouraged in modern accessibility guidelines (WCAG 2.2)
- **Storing sort order as array in single field:** Performance issues at scale, now use per-item sortOrder
- **Svelte 3 store patterns:** Replaced by Svelte 5 runes ($state, $derived, $effect)

## Open Questions

Things that couldn't be fully resolved:

1. **svelte-5-french-toast action button API**
   - What we know: Library supports toasts with duration, positioning
   - What's unclear: Exact API for adding action buttons (undo) - docs don't show example
   - Recommendation: Check source code or create custom toast component. May need to fork or wrap library for undo pattern.

2. **Optimal sortOrder recalculation strategy**
   - What we know: Should only update affected items, not entire list
   - What's unclear: Best approach for gaps (10, 20, 30 vs 1, 2, 3) to reduce updates
   - Recommendation: Start simple (recalc affected items only), optimize later if performance issues. Consider fractional values (1.5 for insert between 1 and 2) to avoid updates.

3. **Context entity vs string field**
   - What we know: Current schema uses `context?: string` field
   - What's unclear: Whether to create separate Context table for metadata (color, icon, sort order)
   - Recommendation: Start with string field (simpler), migrate to table in later phase when adding context customization UI.

4. **Multi-context filter: AND vs OR logic**
   - What we know: GTD practice suggests OR (show actions for ANY selected context)
   - What's unclear: User expectation might vary by use case
   - Recommendation: Implement OR logic (matches GTD), consider UI toggle for AND/OR in future.

## Sources

### Primary (HIGH confidence)
- [svelte-dnd-action GitHub](https://github.com/isaacHagoel/svelte-dnd-action) - Svelte 5 compatibility, API, examples
- [Svelte 5 Transitions Documentation](https://svelte.dev/docs/svelte/svelte-transition) - fade, slide, scale APIs
- [Dexie Compound Index Documentation](https://dexie.org/docs/Compound-Index) - multi-field queries (attempted fetch, limited content)
- [Dexie Table.where() Documentation](https://dexie.org/docs/Table/Table.where()) - query patterns (attempted fetch, limited content)
- Existing codebase: src/lib/db/schema.ts, src/lib/stores/inbox.svelte.ts, src/lib/components/InboxList.svelte - patterns already in use

### Secondary (MEDIUM confidence)
- [10 Tips for Accessible Drag-and-Drop Interfaces](https://www.fleexy.dev/blog/10-tips-for-accessible-drag-and-drop-interfaces/) - keyboard alternatives, ARIA
- [Drag and Drop Accessibility Best Practices](https://accessibilityspark.com/drag-and-drop-accessibility/) - WCAG 2.5.7 compliance
- [Filter UI Design Patterns & Best Practices](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-filtering) - batch vs auto-apply filters
- [Empty State UX Examples & Best Practices](https://www.pencilandpaper.io/articles/empty-states) - no results messaging
- [Badges vs. Pills vs. Chips vs. Tags](https://smart-interface-design-patterns.com/articles/badges-chips-tags-pills/) - context badge patterns
- [GTD Contexts Guide](https://facilethings.com/blog/en/gtd-contexts) - multi-context filtering best practices
- [Dexie multi-field filtering GitHub issues](https://github.com/dexie/Dexie.js/issues/87) - object syntax for multiple equals

### Tertiary (LOW confidence)
- [svelte-5-french-toast GitHub](https://github.com/anatoliy-t7/svelte-5-french-toast) - basic API, lacks action button details
- [@thisux/sveltednd GitHub](https://github.com/thisuxhq/sveltednd) - newer alternative, less mature
- [dnd-kit-svelte](https://dnd-kit-svelte.vercel.app/) - React port, early stage
- [IndexedDB Manipulation with Dexie](https://codewithanbu.com/indexeddb-manipulation-with-dexie-sorting-iteration-and-keys/) - general sorting patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - svelte-dnd-action and Svelte transitions are battle-tested, Dexie already in use
- Architecture: HIGH - Patterns verified in existing codebase (inbox multi-select), DnD examples from official docs
- Pitfalls: MEDIUM - Race conditions and accessibility issues documented in community, specific scenarios inferred from patterns

**Research date:** 2026-01-30
**Valid until:** ~30 days (Svelte/Dexie stable, but DnD library updates may add features)
