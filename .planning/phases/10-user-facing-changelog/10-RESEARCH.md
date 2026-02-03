# Phase 10: User-Facing Changelog - Research

**Researched:** 2026-02-03
**Domain:** Changelog UI/UX, data management, and SvelteKit integration
**Confidence:** HIGH

## Summary

User-facing changelogs in 2026 follow well-established patterns centered around the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) standard. The dominant approach uses **static Markdown or TypeScript/JSON files** for data storage, providing excellent offline-first PWA compatibility while keeping developer workflow simple. For SvelteKit applications, JSON imports with TypeScript types offer the best balance of type safety, ease of updates, and runtime performance.

The standard changelog format organizes entries in reverse chronological order with six core categories: Added, Changed, Deprecated, Removed, Fixed, and Security. Modern UI patterns emphasize scannable, minimalist designs with color-coded category badges, date-based grouping, and subtle "new" indicators for unseen changes. Industry leaders like Linear, Vercel, and Todoist demonstrate that effective changelogs balance detail with scannability through hierarchical typography and progressive disclosure.

For this GTD application's requirements (subtle nav placement, offline-first, easy developer updates), the recommended approach is: **TypeScript data file** (`changelog.ts`) with structured entries, imported in a standard SvelteKit route, with localStorage tracking for "new" badges.

**Primary recommendation:** Use a typed TypeScript data file for changelog entries, place a subtle link in the Sidebar footer section (below Settings, above Feedback), and implement localStorage-based "last seen" tracking for a "New" badge indicator.

## Standard Stack

The established libraries/tools for changelog pages in SvelteKit:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SvelteKit | 2.x | Routing & page rendering | Native static data import, file-based routing, no external dependencies needed |
| TypeScript | 5.x | Data type definitions | Type-safe changelog entries, excellent DX for schema enforcement |
| JSON/TS imports | Native | Data storage | Vite native support, zero-config, excellent for static data |

### Supporting (Optional)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| mdsvex | 0.12+ | Markdown parsing | If using Markdown files instead of JSON/TS |
| remark/rehype | Latest | Markdown processing | If rendering Markdown content within entries |
| @vite-pwa/sveltekit | 0.6+ | PWA offline caching | Already in use - ensure changelog cached for offline |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Static JSON/TS | Markdown files | Markdown more human-friendly but requires parsing overhead, less type-safe |
| Static data | CMS/Database | CMS adds complexity, requires backend, breaks offline-first principle |
| Manual updates | Git commit automation | Automation can miss context, requires well-structured commits, adds tooling complexity |

**Installation:**
```bash
# No additional packages required for basic JSON/TS approach
# Optional: if using Markdown
npm install mdsvex remark rehype
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   └── data/
│       └── changelog.ts        # Typed changelog entries
├── routes/
│   └── changelog/
│       └── +page.svelte        # Changelog page
└── components/
    └── ChangelogEntry.svelte   # Reusable entry component (optional)
```

### Pattern 1: Static TypeScript Data File
**What:** Define changelog entries as a typed TypeScript array exported from a static file.
**When to use:** Best for most use cases - type-safe, simple, offline-first, zero build overhead.
**Example:**
```typescript
// src/lib/data/changelog.ts
export interface ChangelogEntry {
  id: string;              // Unique ID for tracking "last seen"
  date: string;            // ISO format: "2026-02-03"
  version?: string;        // Optional version number: "1.2.0"
  categories: {
    added?: string[];
    changed?: string[];
    fixed?: string[];
    improved?: string[];
    deprecated?: string[];
    removed?: string[];
    security?: string[];
  };
}

export const changelog: ChangelogEntry[] = [
  {
    id: "2026-02-03-outlook-sync",
    date: "2026-02-03",
    version: "1.2.0",
    categories: {
      added: [
        "Outlook Calendar integration for syncing events",
        "Calendar picker for selecting Outlook calendars"
      ],
      improved: [
        "Sync status indicator now shows last sync time"
      ]
    }
  },
  // ... more entries
];
```

### Pattern 2: Page Layout with Category Badges
**What:** Display entries in reverse chronological order with visual category indicators.
**When to use:** Standard pattern for all changelog pages.
**Example:**
```svelte
<!-- src/routes/changelog/+page.svelte -->
<script lang="ts">
  import { changelog } from '$lib/data/changelog';
  import { onMount } from 'svelte';

  // Track last seen for "new" badge
  let lastSeenId = $state('');
  const STORAGE_KEY = 'changelog-last-seen';

  onMount(() => {
    lastSeenId = localStorage.getItem(STORAGE_KEY) || '';
  });

  function markAllSeen() {
    if (changelog.length > 0) {
      localStorage.setItem(STORAGE_KEY, changelog[0].id);
      lastSeenId = changelog[0].id;
    }
  }

  // Auto-mark as seen after viewing
  onMount(() => {
    const timer = setTimeout(markAllSeen, 2000);
    return () => clearTimeout(timer);
  });

  function hasUnseen(): boolean {
    if (!lastSeenId || changelog.length === 0) return true;
    const lastSeenIndex = changelog.findIndex(e => e.id === lastSeenId);
    return lastSeenIndex !== 0; // True if newer entries exist
  }
</script>

<div class="max-w-3xl mx-auto px-4 py-8">
  <h1 class="text-3xl font-bold mb-2">What's New</h1>
  <p class="text-gray-600 dark:text-gray-400 mb-8">
    Recent improvements and updates to your GTD app.
  </p>

  <div class="space-y-6">
    {#each changelog as entry (entry.id)}
      <article class="border-b border-gray-200 dark:border-gray-800 pb-6">
        <div class="flex items-center gap-2 mb-3">
          <time class="text-sm font-medium text-gray-900 dark:text-gray-100">
            {new Date(entry.date).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric'
            })}
          </time>
          {#if entry.version}
            <span class="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              v{entry.version}
            </span>
          {/if}
        </div>

        <!-- Categories -->
        {#if entry.categories.added}
          <div class="mb-3">
            <span class="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400 mb-1">
              <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              Added
            </span>
            <ul class="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
              {#each entry.categories.added as item}
                <li>{item}</li>
              {/each}
            </ul>
          </div>
        {/if}

        <!-- Repeat for other categories: improved, fixed, changed, etc. -->
      </article>
    {/each}
  </div>
</div>
```

### Pattern 3: Sidebar Integration (Subtle Placement)
**What:** Add changelog link to sidebar footer, below primary navigation but above feedback.
**When to use:** When changelog is secondary feature, not core workflow.
**Example:**
```svelte
<!-- In Sidebar.svelte footer section, add between Settings and Feedback -->
<div class="mt-3">
  <a href="/changelog" class="flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-1 {$page.url.pathname === '/changelog' ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100 font-semibold' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/70'}">
    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <span>What's New</span>
    {#if hasUnseenChanges}
      <span class="w-2 h-2 rounded-full bg-blue-500"></span>
    {/if}
  </a>
</div>
```

### Anti-Patterns to Avoid
- **Hardcoding entries in component markup:** Makes updates tedious and error-prone. Always use separate data file.
- **Using complex CMS for simple changelogs:** Adds unnecessary complexity, requires backend, breaks offline-first.
- **Mixing changelog with blog/announcements:** Keep changelog focused on product changes only.
- **Vague entries like "Various improvements":** Users want specifics - what changed, what was fixed.
- **Forgetting mobile responsiveness:** Changelog must work in mobile drawer navigation too.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown parsing | Custom MD parser | mdsvex or unified/remark/rehype | Edge cases (nested lists, code blocks, HTML), XSS safety, maintained ecosystem |
| Date formatting | String manipulation | `Intl.DateTimeFormat` or `Date.toLocaleDateString()` | Handles locales, timezones, browser inconsistencies automatically |
| Category badges | Custom CSS classes | Tailwind utilities + design tokens | Consistent with app theme, dark mode support built-in |
| "New" badge tracking | Custom state management | localStorage + Svelte state | Browser native, persists across sessions, simple API |

**Key insight:** Changelog infrastructure is well-solved - stick to JSON/TS data files and standard rendering patterns. Custom solutions introduce maintenance burden without benefits.

## Common Pitfalls

### Pitfall 1: Putting Changelog in Primary Navigation
**What goes wrong:** Changelog placed alongside core features (Inbox, Actions, etc.) draws too much attention, violates user's stated "subtle" requirement.
**Why it happens:** Developer enthusiasm for new feature; copying patterns from feature-focused SaaS apps.
**How to avoid:** Place in footer section with Settings/Feedback, use "What's New" label (friendlier than "Changelog"), add small "new" dot when unseen entries exist.
**Warning signs:** Users clicking changelog frequently when they should be using core GTD features.

### Pitfall 2: Complex Data Source (CMS, Database, API)
**What goes wrong:** Adds backend dependency, breaks offline-first PWA model, requires deployment coordination.
**Why it happens:** Premature optimization thinking "we might need API access later."
**How to avoid:** Start with static TypeScript/JSON file. It's versioned with code, updates happen in same commit as features, works offline perfectly.
**Warning signs:** Needing server deployment for simple changelog text updates.

### Pitfall 3: Forgetting to Update Changelog
**What goes wrong:** Changelog becomes stale, users lose trust, defeats purpose of transparency.
**Why it happens:** No workflow integration, changelog is "extra" step.
**How to avoid:** Make changelog update part of PR template/checklist. Add entry BEFORE merging feature. Consider changelog entry as documentation requirement.
**Warning signs:** Months-old "latest" entry despite active development.

### Pitfall 4: Inconsistent Category Usage
**What goes wrong:** Mixing "Added" vs "New", unclear what's bug fix vs improvement, users confused.
**Why it happens:** No clear definitions, multiple contributors interpreting differently.
**How to avoid:** Document category definitions in code comment:
- **Added:** Wholly new feature that didn't exist before
- **Improved:** Enhancement to existing feature (better UX, faster, more options)
- **Fixed:** Bug correction
- **Changed:** Modification to existing behavior (might require user adjustment)
- **Deprecated:** Still works but will be removed (include timeline)
- **Removed:** Feature no longer available
- **Security:** Vulnerability patches
**Warning signs:** Debating which category during updates, user confusion about what changed.

### Pitfall 5: Over-Engineering "New" Badge Logic
**What goes wrong:** Complex version comparison, per-entry seen tracking, database storage - too much for simple feature.
**Why it happens:** Over-thinking edge cases, wanting perfect tracking.
**How to avoid:** Simple approach: localStorage with single "last seen ID". If latest entry's ID doesn't match, show badge. Mark all as seen on page view. Edge case (cleared localStorage) is acceptable - shows badge, user clicks, all good.
**Warning signs:** More code for badge logic than actual changelog rendering.

### Pitfall 6: Poor Mobile Experience
**What goes wrong:** Changelog not in mobile nav drawer, or layout breaks on mobile, or text too small.
**Why it happens:** Desktop-first development, forgetting mobile has separate nav component.
**How to avoid:** Add changelog link to BOTH `Sidebar.svelte` (desktop) AND `MobileNav.svelte` (mobile drawer). Test on actual mobile viewport. Use responsive text sizing (`text-sm tablet:text-base`).
**Warning signs:** Mobile users can't find changelog or it's unusable on small screens.

## Code Examples

Verified patterns based on Keep a Changelog standard and SvelteKit best practices:

### Complete TypeScript Data File
```typescript
// src/lib/data/changelog.ts
// Source: Keep a Changelog format adapted for TypeScript

export interface ChangelogEntry {
  id: string;              // Unique identifier (date-based recommended)
  date: string;            // ISO 8601 date: "2026-02-03"
  version?: string;        // Semantic version: "1.2.0" (optional)
  categories: {
    added?: string[];      // New features
    improved?: string[];   // Enhancements (not in standard but common)
    fixed?: string[];      // Bug fixes
    changed?: string[];    // Changes to existing functionality
    deprecated?: string[]; // Soon-to-be removed features
    removed?: string[];    // Removed features
    security?: string[];   // Security fixes
  };
}

export const changelog: ChangelogEntry[] = [
  {
    id: "2026-02-03",
    date: "2026-02-03",
    version: "1.2.0",
    categories: {
      added: [
        "Outlook Calendar integration for viewing and syncing calendar events",
        "Calendar picker in Settings for selecting which Outlook calendars to sync",
        "What's New changelog page accessible from sidebar"
      ],
      improved: [
        "Sync status indicator now shows detailed sync progress",
        "Mobile navigation drawer includes new changelog link"
      ],
      fixed: [
        "Dark mode styling for Settings page sections",
        "Mobile calendar view layout on small screens"
      ]
    }
  },
  {
    id: "2026-01-28",
    date: "2026-01-28",
    version: "1.1.0",
    categories: {
      added: [
        "Device sync with pairing code for multi-device support",
        "Feedback modal for reporting issues and suggestions"
      ],
      improved: [
        "Weekly Review wizard now tracks completion history",
        "Search performance for large action lists"
      ]
    }
  }
];

// Helper: Get unseen count
export function getUnseenCount(lastSeenId: string): number {
  if (!lastSeenId || changelog.length === 0) return changelog.length;
  const lastSeenIndex = changelog.findIndex(e => e.id === lastSeenId);
  if (lastSeenIndex === -1) return changelog.length; // Not found = all unseen
  return lastSeenIndex; // Number of entries before this one
}

// Helper: Get category color classes (Tailwind)
export function getCategoryStyle(category: string): { dot: string, text: string } {
  const styles = {
    added: { dot: 'bg-green-500', text: 'text-green-700 dark:text-green-400' },
    improved: { dot: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-400' },
    fixed: { dot: 'bg-orange-500', text: 'text-orange-700 dark:text-orange-400' },
    changed: { dot: 'bg-purple-500', text: 'text-purple-700 dark:text-purple-400' },
    deprecated: { dot: 'bg-yellow-500', text: 'text-yellow-700 dark:text-yellow-400' },
    removed: { dot: 'bg-red-500', text: 'text-red-700 dark:text-red-400' },
    security: { dot: 'bg-red-600', text: 'text-red-800 dark:text-red-300' }
  };
  return styles[category] || { dot: 'bg-gray-500', text: 'text-gray-700 dark:text-gray-400' };
}
```

### Complete Changelog Page Component
```svelte
<!-- src/routes/changelog/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { changelog, getCategoryStyle, type ChangelogEntry } from '$lib/data/changelog';

  const STORAGE_KEY = 'gtd-changelog-last-seen';
  let lastSeenId = $state('');

  onMount(() => {
    // Load last seen from localStorage
    lastSeenId = localStorage.getItem(STORAGE_KEY) || '';

    // Mark current top entry as seen after 2 seconds
    const timer = setTimeout(() => {
      if (changelog.length > 0) {
        localStorage.setItem(STORAGE_KEY, changelog[0].id);
        lastSeenId = changelog[0].id;
      }
    }, 2000);

    return () => clearTimeout(timer);
  });

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  function isNewEntry(entryId: string): boolean {
    if (!lastSeenId) return true;
    const entryIndex = changelog.findIndex(e => e.id === entryId);
    const lastSeenIndex = changelog.findIndex(e => e.id === lastSeenId);
    return entryIndex < lastSeenIndex || lastSeenIndex === -1;
  }

  const categoryOrder = ['added', 'improved', 'fixed', 'changed', 'deprecated', 'removed', 'security'];
  const categoryLabels = {
    added: 'Added',
    improved: 'Improved',
    fixed: 'Fixed',
    changed: 'Changed',
    deprecated: 'Deprecated',
    removed: 'Removed',
    security: 'Security'
  };
</script>

<div class="max-w-3xl mx-auto px-4 tablet:px-6 py-6 tablet:py-8">
  <!-- Header -->
  <div class="mb-8">
    <h1 class="text-2xl tablet:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
      What's New
    </h1>
    <p class="text-sm tablet:text-base text-gray-600 dark:text-gray-400">
      Recent improvements and updates to your GTD app.
    </p>
  </div>

  <!-- Entries -->
  <div class="space-y-8">
    {#each changelog as entry (entry.id)}
      <article class="relative border-b border-gray-200 dark:border-gray-800 pb-8 last:border-b-0">
        <!-- "New" indicator -->
        {#if isNewEntry(entry.id)}
          <div class="absolute -left-2 top-0">
            <span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          </div>
        {/if}

        <!-- Date and version -->
        <div class="flex items-center gap-2 mb-4">
          <time class="text-sm tablet:text-base font-semibold text-gray-900 dark:text-gray-100">
            {formatDate(entry.date)}
          </time>
          {#if entry.version}
            <span class="text-xs px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium">
              v{entry.version}
            </span>
          {/if}
        </div>

        <!-- Categories -->
        <div class="space-y-4">
          {#each categoryOrder as category}
            {#if entry.categories[category] && entry.categories[category].length > 0}
              <div>
                <div class="flex items-center gap-1.5 mb-2">
                  <span class="w-1.5 h-1.5 rounded-full {getCategoryStyle(category).dot}"></span>
                  <span class="text-xs tablet:text-sm font-semibold uppercase tracking-wide {getCategoryStyle(category).text}">
                    {categoryLabels[category]}
                  </span>
                </div>
                <ul class="list-disc list-inside text-sm tablet:text-base text-gray-700 dark:text-gray-300 space-y-1 ml-3">
                  {#each entry.categories[category] as item}
                    <li>{item}</li>
                  {/each}
                </ul>
              </div>
            {/if}
          {/each}
        </div>
      </article>
    {/each}
  </div>

  <!-- Empty state -->
  {#if changelog.length === 0}
    <div class="text-center py-12">
      <p class="text-gray-500 dark:text-gray-400">No updates yet.</p>
    </div>
  {/if}
</div>
```

### Sidebar Integration with "New" Badge
```svelte
<!-- Add to Sidebar.svelte in the footer section, between Settings and Feedback -->

<!-- In <script> section -->
import { changelog } from '$lib/data/changelog';
import { onMount } from 'svelte';

let lastSeenChangelogId = $state('');

onMount(() => {
  lastSeenChangelogId = localStorage.getItem('gtd-changelog-last-seen') || '';
});

function hasUnseenChangelog(): boolean {
  if (changelog.length === 0) return false;
  if (!lastSeenChangelogId) return true;
  return changelog[0].id !== lastSeenChangelogId;
}

<!-- In expanded sidebar navigation (after Settings) -->
<a href="/changelog" class="flex items-center justify-between px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-1 {$page.url.pathname === '/changelog' ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100 font-semibold' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/70'}">
  <div class="flex items-center gap-2">
    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <span>What's New</span>
  </div>
  {#if hasUnseenChangelog()}
    <span class="w-2 h-2 rounded-full bg-blue-500"></span>
  {/if}
</a>

<!-- In collapsed sidebar (icon-only mode, after Settings icon) -->
<a href="/changelog" class="relative flex items-center justify-center p-2 rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40 {$page.url.pathname === '/changelog' ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/70 hover:text-gray-700 dark:hover:text-gray-200'}" title="What's New">
  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
  {#if hasUnseenChangelog()}
    <span class="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
  {/if}
</a>
```

### Mobile Navigation Integration
```svelte
<!-- Add to MobileNav.svelte after Settings link, before Feedback button -->

<!-- In <script> section -->
import { changelog } from '$lib/data/changelog';
import { onMount } from 'svelte';

let lastSeenChangelogId = $state('');

onMount(() => {
  lastSeenChangelogId = localStorage.getItem('gtd-changelog-last-seen') || '';
});

function hasUnseenChangelog(): boolean {
  if (changelog.length === 0) return false;
  if (!lastSeenChangelogId) return true;
  return changelog[0].id !== lastSeenChangelogId;
}

<!-- In navigation links section -->
<a
  href="/changelog"
  onclick={closeDrawer}
  class="flex items-center justify-between px-4 py-3 transition-colors duration-150 {$page.url.pathname === '/changelog' ? 'bg-white dark:bg-gray-800 shadow-sm font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}"
>
  <div class="flex items-center gap-3">
    <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <span>What's New</span>
  </div>
  {#if hasUnseenChangelog()}
    <span class="w-2 h-2 rounded-full bg-blue-500"></span>
  {/if}
</a>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Git commit-based auto-generation | Manual curated entries | ~2023 | Better UX - commits are for devs, changelogs for users; avoids noise |
| Markdown files | TypeScript/JSON with types | ~2024-2025 | Type safety, better DX, easier to query/filter programmatically |
| "New" badge per-entry tracking | Last-seen ID only | Ongoing | Simpler implementation, same UX outcome, less storage |
| Separate changelog tools/services | Built-in app pages | ~2023-2024 | Lower friction for users, no external links, offline support |
| Technical language | User-friendly descriptions | Always evolving | Changelogs for end-users should focus on value, not implementation |

**Deprecated/outdated:**
- **Heavy CMS for changelogs:** Services like Headless CMS for simple changelogs - overkill for most apps, static data is sufficient
- **Automated git-to-changelog tools:** Tools like `conventional-changelog` - good for developer CHANGELOG.md but poor UX for end-users (too technical, too noisy)
- **Markdown files without mdsvex:** Requires manual HTML rendering or parsing - TypeScript/JSON is simpler for static data

**Current 2026 best practice:** Static TypeScript data file with type definitions, imported directly in SvelteKit pages, localStorage for tracking, manual curation for quality.

## Open Questions

Things that couldn't be fully resolved:

1. **Should changelog entries include images/screenshots?**
   - What we know: Some SaaS products (Linear, Superhuman) include screenshots for visual features
   - What's unclear: Whether GTD-focused users want/need visual changelog or prefer scannable text
   - Recommendation: Start text-only (faster to update, lighter), add images later if user feedback requests it

2. **Optimal "last seen" tracking approach for multi-device sync**
   - What we know: localStorage works per-device, not synced across devices
   - What's unclear: Whether users expect "new" badge state to sync via device sync system
   - Recommendation: Keep localStorage-only for now (simpler), evaluate if users request synced badge state

3. **Version numbering scheme**
   - What we know: Semantic versioning is standard for libraries (1.2.3 = major.minor.patch)
   - What's unclear: Whether user-facing PWA needs semantic versioning or simple date-based releases
   - Recommendation: Use optional version field, populate if semantic versioning makes sense for your releases, otherwise date is sufficient

4. **Frequency of updates**
   - What we know: User wants "published with every improvement"
   - What's unclear: Whether every minor bug fix warrants entry or batch weekly/bi-weekly
   - Recommendation: Start with every notable change, consolidate if changelog becomes noisy

## Sources

### Primary (HIGH confidence)
- [Keep a Changelog v1.1.0](https://keepachangelog.com/en/1.1.0/) - Official changelog format standard
- [SvelteKit JSON Import - Rodney Lab](https://rodneylab.com/sveltekit-json-import/) - SvelteKit native JSON import patterns
- [SaaSFrame Changelog Examples 2026](https://www.saasframe.io/categories/changelog) - 15 modern SaaS changelog UI patterns
- [Carbon Design System - Status Indicator Pattern](https://carbondesignsystem.com/patterns/status-indicator-pattern/) - Badge UI best practices
- [Material Design 3 - Badge Guidelines](https://m3.material.io/components/badges/guidelines) - Badge component patterns

### Secondary (MEDIUM confidence)
- [Changelog Best Practices - UserGuiding](https://userguiding.com/blog/changelog-best-practices) - Industry best practices and examples
- [11 Best Practices for Changelogs - Beamer](https://www.getbeamer.com/blog/11-best-practices-for-changelogs) - User-facing changelog guidance
- [Building a Lightweight Changelog System in React - Edvins Antonovs](https://edvins.io/building-a-lightweight-changelog-system-in-react) - localStorage tracking pattern
- [SvelteKit Markdown Blog - Joy of Code](https://joyofcode.xyz/sveltekit-markdown-blog) - mdsvex integration if Markdown approach chosen
- [Common Changelog](https://common-changelog.org/) - Alternative changelog format standard

### Tertiary (LOW confidence)
- Web searches on "SvelteKit changelog 2026" - No specific authoritative guide found
- Web searches on "changelog automation git commits" - Showed tools exist but user-curated preferred

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - SvelteKit native features well-documented, TypeScript/JSON imports proven
- Architecture: HIGH - Keep a Changelog is industry standard, examples from major SaaS products verify patterns
- Pitfalls: MEDIUM - Based on common patterns and user requirements, but some are predictive (not all verified)
- Code examples: HIGH - Based on SvelteKit docs, Keep a Changelog format, and existing codebase patterns

**Research date:** 2026-02-03
**Valid until:** ~60 days (stable domain, standards-based, not rapidly changing tech)

**Notes:**
- No CONTEXT.md existed for this phase - research based on user's stated requirements in phase description
- User requirements are clear: subtle nav placement, end-user focused, updated with every improvement
- Recommendation aligns with offline-first PWA architecture already in use
- TypeScript approach provides best DX while maintaining simplicity
