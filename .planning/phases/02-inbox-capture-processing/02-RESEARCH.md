# Phase 2: Inbox Capture & Processing - Research

**Researched:** 2026-01-30
**Domain:** GTD inbox workflow, keyboard shortcuts, search/filtering, UI patterns
**Confidence:** HIGH

## Summary

Phase 02 builds on the existing Svelte 5 + Dexie foundation to implement rapid inbox capture and GTD-compliant processing. The core technical challenges are: (1) global keyboard shortcuts for instant capture, (2) full-text search across IndexedDB with live filtering, (3) inline expansion UI for the GTD decision tree, and (4) maintaining focus and state during rapid sequential captures.

The standard approach uses native browser APIs where possible (Intl.RelativeTimeFormat for timestamps, svelte:window for keyboard events) combined with lightweight Svelte libraries (svelte-5-french-toast for confirmations, svelte-typeahead for search dropdowns). Dexie's multi-valued indexes enable full-text search without external dependencies. The GTD workflow follows the canonical decision tree: actionable → 2-minute rule → do/delegate/defer.

**Primary recommendation:** Use Svelte 5's $state runes for reactive form state, native Intl.RelativeTimeFormat for timestamps, Dexie multi-valued indexes for search, and svelte:window for keyboard shortcuts. Avoid custom debounce/focus management—use proven patterns.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Dexie.js | 4.x (already installed) | IndexedDB queries & full-text search | Already in project; multi-valued indexes solve search natively |
| Intl.RelativeTimeFormat | Native API | Relative time display ("2 hours ago") | Native browser API, widely supported since 2020, no dependencies |
| svelte:window | Svelte 5 built-in | Global keyboard event handling | Built into Svelte, works with SSR, auto-cleanup |
| Svelte $state runes | Svelte 5 | Reactive form state | Already decided in Phase 01 context |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| svelte-5-french-toast | Latest | Toast notifications | Svelte 5 compatible, lightweight, "buttery smooth" |
| svelte-typeahead | Latest | Search dropdown with fuzzy search | Accessible (WAI-ARIA), fuzzy search built-in, keyboard navigation |
| Svelte transitions | Built-in (svelte/transition) | Slide animations for expansion | Native slide() transition for expand/collapse |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| svelte-5-french-toast | @zerodevx/svelte-toast | Original (20kB) doesn't explicitly support Svelte 5; fork is rewritten for runes |
| Intl.RelativeTimeFormat | javascript-time-ago library | Native API requires manual unit selection but zero deps; library auto-selects unit but adds dependency |
| svelte-typeahead | simple-svelte-autocomplete | Both are good; typeahead has stronger accessibility (WAI-ARIA) focus |
| Dexie multi-valued indexes | Lunr.js or Fuse.js | Dexie approach uses existing IndexedDB indexes vs. separate search index in memory |

**Installation:**
```bash
npm install svelte-5-french-toast svelte-typeahead
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── db/
│   │   ├── schema.ts              # Extend with search indexes
│   │   ├── operations.ts          # Add search queries
│   │   └── search.ts              # NEW: Full-text search utilities
│   ├── components/
│   │   ├── InboxCapture.svelte    # NEW: Inline capture input
│   │   ├── InboxList.svelte       # NEW: FIFO inbox list
│   │   ├── ProcessingFlow.svelte  # NEW: Inline GTD decision tree
│   │   └── SearchBar.svelte       # NEW: Global search dropdown
│   ├── stores/
│   │   └── inbox.svelte.ts        # NEW: Shared inbox state ($state rune)
│   └── utils/
│       └── time.ts                # NEW: Relative time formatting helpers
└── routes/
    └── inbox/
        └── +page.svelte           # NEW: Main inbox page
```

### Pattern 1: Global Keyboard Shortcuts with Svelte:window
**What:** Use `<svelte:window>` element to attach global keyboard listeners that work across pages
**When to use:** Any time you need app-wide keyboard shortcuts (capture, search, navigation)
**Example:**
```svelte
<!-- Source: https://svelte.dev/docs/svelte/svelte-window/llms -->
<script>
  import { goto } from '$app/navigation';

  function handleKeydown(event: KeyboardEvent) {
    // Cmd+K on Mac, Ctrl+K on Windows/Linux
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      goto('/inbox');
      // Focus will be handled by the inbox page onMount
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />
```

### Pattern 2: Dexie Multi-Valued Indexes for Full-Text Search
**What:** Use Dexie hooks to automatically tokenize text fields into multi-valued indexes, enabling fast prefix search
**When to use:** When you need to search across title/notes fields without external search library
**Example:**
```javascript
// Source: https://dexie.org/docs/Table/Table
// schema.ts - Add multi-valued index
db.version(2).stores({
  items: "++id, type, created, modified, *searchWords"
});

// Add hooks to tokenize on create/update
db.items.hook("creating", (primKey, obj, trans) => {
  obj.searchWords = tokenize(`${obj.title} ${obj.notes}`);
});

db.items.hook("updating", (mods, primKey, obj, trans) => {
  if (mods.hasOwnProperty("title") || mods.hasOwnProperty("notes")) {
    const title = mods.title ?? obj.title;
    const notes = mods.notes ?? obj.notes;
    return { searchWords: tokenize(`${title} ${notes}`) };
  }
});

function tokenize(text: string): string[] {
  // Split, lowercase, dedupe
  const words = text.toLowerCase().split(/\s+/);
  return [...new Set(words)].filter(w => w.length > 0);
}

// Search query
const results = await db.items
  .where('searchWords')
  .startsWithIgnoreCase(query)
  .distinct()
  .toArray();
```

### Pattern 3: Inline Expansion with Svelte slide Transition
**What:** Expand/collapse inline content with smooth height animation using built-in slide transition
**When to use:** Processing workflow UI where clicking an item expands options below it
**Example:**
```svelte
<!-- Source: https://svelte.dev/docs/svelte/svelte-transition -->
<script>
  import { slide } from 'svelte/transition';

  let expandedId = $state<number | null>(null);

  function toggleExpand(id: number) {
    expandedId = expandedId === id ? null : id;
  }
</script>

{#each items as item}
  <div class="border-b">
    <button onclick={() => toggleExpand(item.id)}>
      {item.title}
    </button>

    {#if expandedId === item.id}
      <div transition:slide={{ duration: 200 }} class="block">
        <!-- Processing workflow options here -->
        <ProcessingFlow {item} />
      </div>
    {/if}
  </div>
{/each}
```
**Important:** slide transition requires display: block, flex, or grid (not inline or contents).

### Pattern 4: Relative Time with Intl.RelativeTimeFormat
**What:** Use native browser API to format timestamps as "2 hours ago", "yesterday", etc.
**When to use:** Displaying relative timestamps for inbox items
**Example:**
```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/RelativeTimeFormat
// utils/time.ts
const rtf = new Intl.RelativeTimeFormat('en', {
  numeric: 'auto',  // Uses "yesterday" instead of "1 day ago"
  style: 'long'
});

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffSecs = Math.round(diffMs / 1000);
  const diffMins = Math.round(diffSecs / 60);
  const diffHours = Math.round(diffMins / 60);
  const diffDays = Math.round(diffHours / 24);

  if (Math.abs(diffSecs) < 60) return 'just now';
  if (Math.abs(diffMins) < 60) return rtf.format(diffMins, 'minute');
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour');
  if (Math.abs(diffDays) < 7) return rtf.format(diffDays, 'day');

  return date.toLocaleDateString();
}
```
**Note:** Intl.RelativeTimeFormat requires you to choose the unit manually (limitation of low-level API).

### Pattern 5: Shared State with $state Rune
**What:** Create reactive shared state in .svelte.ts file, import across components
**When to use:** State that needs to be shared between multiple components (e.g., inbox items, expanded state)
**Example:**
```typescript
// Source: https://svelte.dev/docs/svelte/stores/llms
// stores/inbox.svelte.ts
import type { GTDItem } from '$lib/db/schema';

export const inboxState = $state({
  items: [] as GTDItem[],
  expandedId: null as number | null,
  isProcessing: false
});
```
```svelte
<!-- Component using shared state -->
<script>
  import { inboxState } from '$lib/stores/inbox.svelte';
</script>

<p>Inbox: {inboxState.items.length} items</p>
```

### Pattern 6: Toast Notifications with svelte-5-french-toast
**What:** Show brief "Captured" confirmation after adding inbox item
**When to use:** Non-blocking user feedback for successful actions
**Example:**
```svelte
<!-- Source: https://github.com/anatoliy-t7/svelte-5-french-toast -->
<script>
  import toast, { Toaster } from 'svelte-5-french-toast';

  async function handleCapture() {
    await addItem({ title, notes, type: 'inbox' });
    toast.success('Captured', { duration: 1500 });
    title = ''; // Clear input
    // Input stays focused via bind:this pattern
  }
</script>

<Toaster />
```

### Pattern 7: Programmatic Focus After Form Submit
**What:** Maintain input focus after clearing form for rapid sequential capture
**When to use:** Capture input that should stay focused for multiple entries
**Example:**
```svelte
<script>
  import { tick } from 'svelte';

  let inputEl: HTMLInputElement;
  let title = $state('');

  async function handleSubmit() {
    await addItem({ title, notes: '', type: 'inbox' });
    title = '';
    await tick(); // Wait for DOM update
    inputEl?.focus(); // Re-focus input
  }
</script>

<input
  bind:this={inputEl}
  bind:value={title}
  autofocus
  onkeydown={(e) => e.key === 'Enter' && handleSubmit()}
/>
```

### Pattern 8: Debounced Search Input
**What:** Debounce search queries to avoid excessive IndexedDB lookups while typing
**When to use:** Live search filtering as user types
**Example:**
```typescript
// Minimal debounce implementation
function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// Usage in component
const debouncedSearch = debounce(async (query: string) => {
  if (!query) {
    results = [];
    return;
  }
  results = await searchItems(query);
}, 300); // 300ms delay

$effect(() => {
  debouncedSearch(searchQuery);
});
```

### Anti-Patterns to Avoid
- **Don't use slide transition with display: inline** - slide requires block/flex/grid display
- **Don't search on every keystroke without debounce** - causes performance issues with IndexedDB
- **Don't use letter-only shortcuts (e.g., 'k' alone)** - interferes with typing in inputs; always use modifiers
- **Don't override browser shortcuts** - avoid Cmd+R, Cmd+T, Cmd+W, etc.
- **Don't put autofocus in layout** - only autofocus on specific pages where capture is primary action
- **Don't use filter() for search without indexes** - use Dexie's indexed queries (where/startsWithIgnoreCase)
- **Don't block capture on validation** - GTD principle: capture everything, process later

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Relative time formatting | Custom date math with unit selection | Intl.RelativeTimeFormat (native) | Native API handles locale, pluralization, "auto" mode for "yesterday" |
| Toast notifications | Custom toast component with positioning/timing | svelte-5-french-toast | Handles stacking, animations, accessibility, Svelte 5 compatible |
| Full-text search | Custom in-memory search index | Dexie multi-valued indexes | Leverages existing IndexedDB, no memory overhead, persistent |
| Debounce/throttle | Custom timer logic | Simple debounce function (8 lines) | Edge cases: cleanup on unmount, argument types, return values |
| Keyboard shortcut mapping | Manual event.key checking | Pattern library or small helper | Cross-platform modifiers (Cmd vs Ctrl), event.preventDefault, scope checking |
| Search dropdown with fuzzy search | Custom typeahead component | svelte-typeahead | WAI-ARIA compliant, keyboard navigation, fuzzy search built-in |

**Key insight:** The Svelte/Dexie ecosystem already provides most needed primitives. The temptation is to build custom solutions for "simple" problems like debounce or toast, but battle-tested libraries handle edge cases (SSR, cleanup, accessibility) that custom code misses.

## Common Pitfalls

### Pitfall 1: Keyboard Shortcuts Firing in Input Fields
**What goes wrong:** Global keyboard shortcuts trigger while user is typing in an input field
**Why it happens:** Event listeners on window don't check event.target context
**How to avoid:** Check if focus is in an input/textarea/contenteditable before acting
**Warning signs:** User reports "pressing 'k' in search bar navigates away"
**Example:**
```typescript
function handleKeydown(event: KeyboardEvent) {
  // Ignore if user is typing in an input
  const target = event.target as HTMLElement;
  if (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable
  ) {
    return;
  }

  if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
    event.preventDefault();
    goto('/inbox');
  }
}
```

### Pitfall 2: IndexedDB Searches Without Indexes
**What goes wrong:** Using Collection.filter() with regex for search is slow on large datasets
**Why it happens:** filter() scans every record; IndexedDB can't optimize non-indexed queries
**How to avoid:** Always use indexed fields with where() clauses; add multi-valued indexes for text search
**Warning signs:** Search feels sluggish with >1000 items; browser DevTools shows long tasks
**Example:**
```typescript
// ❌ BAD: Scans all items
const results = await db.items
  .filter(item => item.title.toLowerCase().includes(query.toLowerCase()))
  .toArray();

// ✅ GOOD: Uses index
const results = await db.items
  .where('searchWords')
  .startsWithIgnoreCase(query)
  .distinct()
  .toArray();
```

### Pitfall 3: Focus Management After Async Operations
**What goes wrong:** Input loses focus after async form submission; user has to click to re-focus
**Why it happens:** Async operations complete after microtasks, focus has already moved elsewhere
**How to avoid:** Use bind:this with explicit .focus() call after await tick()
**Warning signs:** User reports "have to click input after each capture"
**Example:**
```svelte
<script>
  import { tick } from 'svelte';

  let inputEl: HTMLInputElement;

  async function handleSubmit() {
    await addItem({ title, type: 'inbox', notes: '' });
    title = '';
    await tick(); // Critical: wait for DOM to update
    inputEl.focus(); // Re-focus
  }
</script>

<input bind:this={inputEl} bind:value={title} />
```

### Pitfall 4: Slide Transition Display Incompatibility
**What goes wrong:** slide transition has no effect or glitches
**Why it happens:** slide animates height, requires display: block/flex/grid
**How to avoid:** Ensure expanded element has compatible display property
**Warning signs:** Expansion appears instant (no animation) or element doesn't appear
**Example:**
```svelte
<!-- ❌ BAD: display: inline or contents -->
{#if expanded}
  <span transition:slide>Content</span> <!-- Won't work -->
{/if}

<!-- ✅ GOOD: display: block -->
{#if expanded}
  <div transition:slide class="block">Content</div>
{/if}
```

### Pitfall 5: Forgetting to Prevent Default on Keyboard Shortcuts
**What goes wrong:** Keyboard shortcut triggers but browser also performs default action
**Why it happens:** Browser default actions (Cmd+K opens search, Cmd+N opens new window) aren't prevented
**How to avoid:** Always call event.preventDefault() when handling shortcuts
**Warning signs:** "Shortcut works but browser also does something unexpected"
**Example:**
```typescript
function handleKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
    event.preventDefault(); // ← Critical! Prevents browser's search
    openSearch();
  }
}
```

### Pitfall 6: Intl.RelativeTimeFormat Unit Selection
**What goes wrong:** Showing "120 minutes ago" instead of "2 hours ago"
**Why it happens:** Intl.RelativeTimeFormat requires you to choose the unit; it doesn't auto-select
**How to avoid:** Write helper function that calculates appropriate unit based on time difference
**Warning signs:** Relative times look awkward ("1440 minutes ago" instead of "yesterday")
**Example:** See Pattern 4 above for complete unit selection logic

### Pitfall 7: Toast Notifications Blocking Interaction
**What goes wrong:** User can't click on underlying UI while toast is visible
**Why it happens:** Toast has incorrect z-index or pointer-events handling
**How to avoid:** Use library defaults (svelte-5-french-toast handles this); if custom, use pointer-events: none on container
**Warning signs:** User reports "can't click buttons when notification shows"

## Code Examples

Verified patterns from official sources:

### GTD Processing Decision Tree
```typescript
// GTD decision flow based on official methodology
// Source: https://gettingthingsdone.com/wp-content/uploads/2014/10/workflow_map.pdf

type ProcessingStep = 'actionable' | 'two-minute' | 'delegate' | 'defer' | 'trash' | 'reference' | 'someday';

interface ProcessingState {
  step: ProcessingStep;
  isActionable?: boolean;
  canDoInTwoMinutes?: boolean;
}

async function processItem(item: GTDItem, decision: ProcessingState) {
  switch (decision.step) {
    case 'actionable':
      // First question: Is it actionable?
      return decision.isActionable ? 'two-minute' : 'trash';

    case 'two-minute':
      // If actionable, can it be done in < 2 minutes?
      if (decision.canDoInTwoMinutes) {
        // Do it now, mark complete
        await deleteItem(item.id);
        return 'complete';
      }
      return 'delegate'; // Ask next question

    case 'delegate':
      // Can someone else do it?
      // If yes: move to waiting-for list
      // If no: move to defer
      break;

    case 'defer':
      // Move to next-action or project list
      await updateItem(item.id, { type: 'next-action' });
      break;

    case 'trash':
      // Not actionable and no value: delete
      await deleteItem(item.id);
      break;

    case 'reference':
      // Not actionable but valuable: keep for reference
      // (Future phase: reference system)
      break;

    case 'someday':
      // Not actionable now but maybe later
      await updateItem(item.id, { type: 'someday' });
      break;
  }
}
```

### Multi-Select with Checkboxes and Keyboard Navigation
```svelte
<script>
  // Native Svelte multi-select pattern with checkboxes
  // Source: https://learn.svelte.dev/tutorial/multiple-select-bindings

  import type { GTDItem } from '$lib/db/schema';

  let items = $state<GTDItem[]>([]);
  let selectedIds = $state<number[]>([]);

  function handleKeydown(event: KeyboardEvent, itemId: number) {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      toggleSelection(itemId);
    }
  }

  function toggleSelection(itemId: number) {
    if (selectedIds.includes(itemId)) {
      selectedIds = selectedIds.filter(id => id !== itemId);
    } else {
      selectedIds = [...selectedIds, itemId];
    }
  }

  async function bulkDelete() {
    await Promise.all(selectedIds.map(id => deleteItem(id)));
    selectedIds = [];
    // Refresh list
  }
</script>

{#each items as item}
  <label class="flex items-center gap-2 p-2 hover:bg-gray-100">
    <input
      type="checkbox"
      bind:group={selectedIds}
      value={item.id}
      onkeydown={(e) => handleKeydown(e, item.id)}
    />
    <span>{item.title}</span>
  </label>
{/each}

{#if selectedIds.length > 0}
  <button onclick={bulkDelete}>
    Delete {selectedIds.length} items
  </button>
{/if}
```

### Search Dropdown with Live Results
```svelte
<script>
  import { debounce } from '$lib/utils/debounce';
  import type { GTDItem } from '$lib/db/schema';

  let query = $state('');
  let results = $state<GTDItem[]>([]);
  let isOpen = $state(false);

  const search = debounce(async (q: string) => {
    if (!q.trim()) {
      results = [];
      isOpen = false;
      return;
    }

    // Search across inbox, next-action, project, waiting
    const words = q.toLowerCase().split(/\s+/);
    results = await db.items
      .where('searchWords')
      .startsWithIgnoreCase(words[0])
      .filter(item => {
        // Exclude completed and someday
        return ['inbox', 'next-action', 'project', 'waiting'].includes(item.type);
      })
      .distinct()
      .limit(10)
      .toArray();

    isOpen = results.length > 0;
  }, 300);

  $effect(() => {
    search(query);
  });
</script>

<div class="relative">
  <input
    type="search"
    bind:value={query}
    placeholder="Search..."
    class="w-full"
  />

  {#if isOpen}
    <div class="absolute top-full left-0 right-0 bg-white shadow-lg mt-1 max-h-96 overflow-y-auto">
      {#each results as result}
        <a
          href="/inbox?item={result.id}"
          class="block p-2 hover:bg-gray-100"
        >
          <div class="font-medium">{result.title}</div>
          {#if result.notes}
            <div class="text-sm text-gray-600 truncate">{result.notes}</div>
          {/if}
          <div class="text-xs text-gray-400">{result.type}</div>
        </a>
      {/each}
    </div>
  {/if}
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Svelte writable stores | Svelte 5 $state runes | Svelte 5 (2024) | Simpler syntax, better TypeScript inference, less boilerplate |
| Manual date formatting libraries | Intl.RelativeTimeFormat | Widely available Sept 2020 | Native API, no dependencies, locale-aware |
| External search libraries (Lunr, Fuse) | Dexie multi-valued indexes | Dexie 2.0+ | Search integrated with database, no separate index |
| svelte-french-toast | svelte-5-french-toast | Svelte 5 fork (2025) | Svelte 5 runes compatibility |
| Command palette libraries | Simple svelte:window pattern | Current best practice | Less overhead for single shortcut use case |

**Deprecated/outdated:**
- **Svelte 3/4 slot syntax**: Replaced by {@render children()} in Svelte 5 (already decided in Phase 01)
- **Dexie Table.where().equals()**: Still works but compound indexes with where({key: value}) is newer syntax
- **moment.js / date-fns for relative time**: Intl.RelativeTimeFormat is native; only use libraries if need auto-unit-selection

## Open Questions

Things that couldn't be fully resolved:

1. **Keyboard shortcut exact key choice**
   - What we know: Cmd+K is common for command palette/search (Slack, Linear, Notion use it)
   - What's unclear: Whether to use Cmd+K for search or inbox navigation
   - Recommendation: Use Cmd+K for search (more common pattern), Cmd+I or Cmd+Shift+I for inbox

2. **Search result grouping strategy**
   - What we know: Context says search scopes to "active items" (inbox, next actions, projects, waiting)
   - What's unclear: Whether to group results by type in dropdown or show flat list
   - Recommendation: Start with flat list sorted by relevance, add grouping if needed after user testing

3. **Animation timing for expansion**
   - What we know: slide transition accepts duration parameter; too fast feels jarring, too slow feels laggy
   - What's unclear: Optimal duration for GTD processing flow expansion
   - Recommendation: Start with 200ms (standard for micro-interactions), adjust based on feel

4. **Empty inbox celebration UX**
   - What we know: Context mentions "Inbox Zero" message possibility, marked as Claude's discretion
   - What's unclear: Whether subtle message or visual celebration
   - Recommendation: Subtle text message ("Inbox clear") to maintain professional tone, avoid animation/confetti

5. **Batch size for search results**
   - What we know: IndexedDB supports limit() for query performance
   - What's unclear: Optimal limit for dropdown (10? 20? 50?)
   - Recommendation: Start with 10, add "show more" if needed

## Sources

### Primary (HIGH confidence)
- **Dexie.js Documentation** (/websites/dexie via Context7)
  - Multi-valued indexes for full-text search
  - Query performance and indexing strategies
  - Hook system for automatic tokenization
- **Svelte Documentation** (/websites/svelte_dev via Context7)
  - $state runes and reactive patterns
  - svelte:window for keyboard events
  - slide transition API and limitations
- **MDN Intl.RelativeTimeFormat** (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/RelativeTimeFormat)
  - Native API usage and browser support
  - Configuration options (numeric: auto, style)

### Secondary (MEDIUM confidence)
- [GTD Official Workflow Map](https://gettingthingsdone.com/wp-content/uploads/2014/10/workflow_map.pdf) - Decision tree structure
- [GTD Processing Best Practices](https://flow-e.com/gtd/process/) - FIFO processing, 2-minute rule application
- [The Clarify Stage of GTD](https://facilethings.com/blog/en/the-clarify-stage-of-gtd-explained) - Actionable decision framework
- [svelte-5-french-toast GitHub](https://github.com/anatoliy-t7/svelte-5-french-toast) - Svelte 5 toast library
- [svelte-typeahead](https://metonym.github.io/svelte-typeahead/) - Accessible search dropdown
- [Keyboard Shortcuts Best Practices (2026)](https://www.commandbar.com/blog/selecting-keyboard-shortcuts-for-your-app/) - Modifier usage, discoverability
- [IndexedDB Performance Optimization](https://rxdb.info/slow-indexeddb.html) - Batched cursors, proper indexing
- [ARIA Checkbox Role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/checkbox_role) - Multi-select accessibility
- [Debounce vs Throttle for Search](https://dev.to/nilebits/javascript-performance-optimization-debounce-vs-throttle-explained-5768) - When to use debounce

### Tertiary (LOW confidence)
- WebSearch results for Svelte 5 animation patterns - General best practices, not version-specific
- Community discussions on autofocus patterns - Mixed approaches, no canonical pattern

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Dexie and Svelte documented via Context7; Intl.RelativeTimeFormat verified on MDN
- Architecture: HIGH - Patterns verified with official docs (Svelte, Dexie) and working code examples
- Pitfalls: MEDIUM - Based on community experience (WebSearch), official docs, and common IndexedDB issues

**Research date:** 2026-01-30
**Valid until:** 60 days (stable stack; Svelte 5 and Dexie 4 are mature)

---

**Notes for planner:**
- All required libraries already installed except svelte-5-french-toast and svelte-typeahead
- Database schema will need migration (version bump) to add searchWords multi-valued index
- CONTEXT.md specifies many implementation details (inline input, FIFO sort, sequential processing mode)
- Focus management is critical for "capture within 2 seconds" success criterion
- Search scope decision already made in CONTEXT.md: inbox + next actions + projects + waiting (excludes completed/someday)
