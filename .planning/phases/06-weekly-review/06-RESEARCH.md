# Phase 6: Weekly Review - Research

**Researched:** 2026-01-30
**Domain:** Guided workflow UI, GTD weekly review methodology, completion tracking
**Confidence:** HIGH

## Summary

This research investigates how to implement a guided weekly review workflow for GTD practitioners. The weekly review is called the "critical success factor" by David Allen (GTD creator) - it's what keeps the entire GTD system current and trustworthy.

The standard approach uses a **step-by-step checklist wizard pattern** that guides users through three phases: Get Clear (process inbox), Get Current (review all lists), and Get Creative (review someday/maybe). Best practices emphasize progress indication, non-linear navigation (back button), and completion celebration to reinforce the habit.

For persistence, the pattern is a **settings/metadata table in Dexie** storing key-value pairs like `lastReviewCompletedAt` timestamp. For celebration, **canvas-confetti** is the industry standard - framework-agnostic, performant, respects reduced motion preferences, and requires zero configuration.

**Primary recommendation:** Build a step-based state machine (like ProcessingFlow.svelte) with 8 GTD-official review steps, track completion percentage with $derived, persist completion timestamp to a new `settings` table in Dexie, and trigger canvas-confetti on final step completion.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Svelte 5 $state runes | 5.x | Step state management | Already in use, perfect for wizard flows |
| Dexie EntityTable | 4.x | Metadata persistence | Already in use, simple key-value storage |
| canvas-confetti | 1.9.4+ | Completion celebration | Industry standard, 7.8k GitHub stars, framework-agnostic |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| svelte-5-french-toast | current | Progress notifications | Already in use for success messages |
| Tailwind v4 | 4.x | Progress bar styling | Already in use for all UI |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| canvas-confetti | tsParticles | tsParticles is more customizable but heavier bundle, overkill for simple celebration |
| Dexie settings table | localStorage | localStorage works but lacks IndexedDB query capabilities and type safety |
| Custom progress bar | shadcn-svelte Progress | shadcn adds dependency for single component, custom is 3 lines of code |

**Installation:**
```bash
npm install canvas-confetti
npm install --save-dev @types/canvas-confetti
```

## Architecture Patterns

### Recommended Project Structure
```
src/lib/
├── components/
│   └── WeeklyReviewWizard.svelte     # Main wizard component
├── stores/
│   └── review.svelte.ts              # Review state store singleton
├── db/
│   ├── schema.ts                     # Add settings table (v5 migration)
│   └── operations.ts                 # Add settings CRUD
```

### Pattern 1: Step-Based Wizard with State Machine
**What:** Sequential steps with progress tracking, back/skip navigation, and completion persistence
**When to use:** Multi-step workflows where user needs guidance and progress visibility
**Example:**
```typescript
// Similar to ProcessingFlow.svelte pattern
type ReviewStep =
  | 'inbox'           // Step 1: Empty inbox
  | 'calendar-past'   // Step 2: Review past calendar
  | 'calendar-future' // Step 3: Review upcoming calendar
  | 'actions'         // Step 4: Review next actions
  | 'waiting'         // Step 5: Review waiting-for
  | 'projects'        // Step 6: Review projects
  | 'someday'         // Step 7: Review someday/maybe
  | 'creative';       // Step 8: Capture new ideas

export class ReviewState {
  currentStep = $state<ReviewStep>('inbox');
  completedSteps = $state<Set<ReviewStep>>(new Set());
  startedAt = $state<Date | null>(null);

  // Derived progress percentage
  progress = $derived(
    (this.completedSteps.size / 8) * 100
  );

  // Step navigation
  stepOrder: ReviewStep[] = [
    'inbox', 'calendar-past', 'calendar-future',
    'actions', 'waiting', 'projects', 'someday', 'creative'
  ];

  get currentStepIndex() {
    return this.stepOrder.indexOf(this.currentStep);
  }

  canGoBack = $derived(this.currentStepIndex > 0);
  canGoNext = $derived(this.currentStepIndex < 7);
  isComplete = $derived(this.completedSteps.size === 8);
}
```

### Pattern 2: Metadata Persistence with Dexie Settings Table
**What:** Simple key-value table for app metadata like timestamps
**When to use:** Storing non-entity data (settings, flags, last-run timestamps)
**Example:**
```typescript
// Source: Dexie.org API Reference
// Add to schema.ts v5:
export interface AppSettings {
  id: number;
  key: string;
  value: any;
  updatedAt: Date;
}

db.version(5).stores({
  items: "++id, type, created, modified, *searchWords, context, projectId, sortOrder, completedAt, followUpDate, category",
  lists: "++id, name, type",
  contexts: "++id, name, sortOrder",
  settings: "++id, &key, updatedAt"  // & prefix = unique constraint
});

// operations.ts
export async function setSetting(key: string, value: any) {
  const existing = await db.settings.where('key').equals(key).first();
  if (existing) {
    await db.settings.update(existing.id, { value, updatedAt: new Date() });
  } else {
    await db.settings.add({ key, value, updatedAt: new Date() });
  }
}

export async function getSetting(key: string): Promise<any | null> {
  const setting = await db.settings.where('key').equals(key).first();
  return setting?.value ?? null;
}

// Usage:
await setSetting('lastReviewCompletedAt', new Date().toISOString());
const lastReview = await getSetting('lastReviewCompletedAt');
```

### Pattern 3: Celebration with canvas-confetti
**What:** Performant confetti animation triggered on review completion
**When to use:** Completion celebrations, achievements, positive reinforcement
**Example:**
```typescript
// Source: https://github.com/catdad/canvas-confetti
import confetti from 'canvas-confetti';

async function completeReview() {
  await setSetting('lastReviewCompletedAt', new Date().toISOString());

  // Trigger celebration
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    disableForReducedMotion: true  // Accessibility
  });

  toast.success('Weekly review complete! 🎉');
}
```

### Pattern 4: Progress Indicator (Custom)
**What:** Simple progress bar showing completion percentage
**When to use:** Multi-step processes where visual progress reduces abandonment
**Example:**
```svelte
<!-- Source: Existing Tailwind patterns in codebase -->
<div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
  <div
    class="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
    style="width: {reviewState.progress}%"
  ></div>
</div>
<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
  {reviewState.completedSteps.size} of 8 steps complete ({Math.round(reviewState.progress)}%)
</p>
```

### Pattern 5: Time-Since-Last Display
**What:** Human-readable timestamp showing when review was last completed
**When to use:** Nudging users to maintain weekly cadence
**Example:**
```typescript
// Utility function
function timeSince(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  const days = Math.floor(seconds / 86400);

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'Last week';
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

// Usage in component:
{#if lastReviewDate}
  <p class="text-sm text-gray-600 dark:text-gray-400">
    Last review: {timeSince(lastReviewDate)}
  </p>
{:else}
  <p class="text-sm text-gray-600 dark:text-gray-400">
    Never completed
  </p>
{/if}
```

### Anti-Patterns to Avoid
- **Modal for review:** Weekly review is 8 steps and takes 30-60 minutes - should be full-page view, not modal
- **Linear-only flow:** Users may need to skip steps or go back - allow non-linear navigation
- **No persistence:** If user closes browser mid-review, progress is lost - save completedSteps to session
- **Forced completion:** User may pause review - allow "Save & Exit" to resume later
- **No celebration:** Completing review is an achievement - celebrate to reinforce habit

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Confetti animation | Custom canvas particle system | canvas-confetti library | Handles performance, reduced motion, cross-browser, multi-burst patterns - 100+ config options |
| Time ago formatting | Manual date math strings | Built-in Intl.RelativeTimeFormat | Locale-aware, handles edge cases, standardized |
| Progress percentage | Manual calculation in component | $derived in state store | Reactive, tested, follows codebase pattern |
| Settings storage | Custom localStorage wrapper | Dexie settings table | Type-safe, queryable, follows existing DB pattern |

**Key insight:** Celebration and progress feedback seem trivial but have subtle UX requirements (accessibility, performance, cross-browser). Use proven libraries that handle edge cases.

## Common Pitfalls

### Pitfall 1: Over-Engineering Step Persistence
**What goes wrong:** Storing entire wizard state (current step, form inputs, timestamps) in database creates sync complexity
**Why it happens:** Developers assume browser might close mid-review and want full recovery
**How to avoid:** Only persist completion timestamp. Use ephemeral ReviewState for in-progress session. If user closes browser, they restart review - it's rare and acceptable
**Warning signs:** Schema includes `reviewInProgress`, `currentReviewStep`, `reviewStartedAt` fields

### Pitfall 2: Confetti on Every Step
**What goes wrong:** Triggering confetti on each completed step causes fatigue and loses impact
**Why it happens:** Developer excitement about the library, thinking "more celebration = better"
**How to avoid:** Confetti ONLY on final step completion (review finished). Use toast.success() for individual steps
**Warning signs:** User complaints about "too much animation" or accessibility concerns

### Pitfall 3: No Reduced Motion Support
**What goes wrong:** Confetti and progress bar transitions cause nausea for users with vestibular disorders
**Why it happens:** Forgetting to check `prefers-reduced-motion` media query
**How to avoid:** canvas-confetti has built-in `disableForReducedMotion: true` option. For custom animations, check media query
**Warning signs:** Accessibility audit failures, user complaints about motion sickness

### Pitfall 4: Treating Review as Linear Process
**What goes wrong:** User can't go back to previous step or skip irrelevant steps (e.g., no waiting-for items)
**Why it happens:** Copying strict wizard patterns from checkout flows
**How to avoid:** Allow back button on all steps. Consider "Skip this step" option. GTD review is flexible, not rigid
**Warning signs:** No back button, or back button only on some steps

### Pitfall 5: Not Showing Empty States
**What goes wrong:** Review step shows "Review your Waiting For items" but user has zero waiting items - confusing UX
**Why it happens:** Assuming all users have items in all categories
**How to avoid:** Show count in step title ("Review Waiting For (3 items)") and render empty state with encouragement ("No waiting items - great!")
**Warning signs:** Steps appear broken when lists are empty

### Pitfall 6: Ambiguous "Last Review" Date
**What goes wrong:** Showing last review as "2025-01-15T08:30:00Z" is not actionable
**Why it happens:** Displaying raw timestamp instead of relative time
**How to avoid:** Use time-since helper ("5 days ago") for recency, show full date on hover
**Warning signs:** User can't quickly tell if they're overdue for review

## Code Examples

Verified patterns from official sources and codebase:

### Weekly Review State Store (Singleton Pattern)
```typescript
// Source: Existing codebase pattern (InboxState, ProjectState, etc.)
import { getSetting, setSetting } from '../db/operations';

type ReviewStep =
  | 'inbox' | 'calendar-past' | 'calendar-future'
  | 'actions' | 'waiting' | 'projects' | 'someday' | 'creative';

export class WeeklyReviewState {
  currentStep = $state<ReviewStep>('inbox');
  completedSteps = $state<Set<ReviewStep>>(new Set());
  isActive = $state(false);
  lastReviewDate = $state<Date | null>(null);

  readonly stepOrder: ReviewStep[] = [
    'inbox', 'calendar-past', 'calendar-future',
    'actions', 'waiting', 'projects', 'someday', 'creative'
  ];

  readonly stepLabels: Record<ReviewStep, string> = {
    'inbox': 'Empty Your Inbox',
    'calendar-past': 'Review Past Calendar',
    'calendar-future': 'Review Upcoming Calendar',
    'actions': 'Review Next Actions',
    'waiting': 'Review Waiting For',
    'projects': 'Review Projects',
    'someday': 'Review Someday/Maybe',
    'creative': 'Capture New Ideas'
  };

  // Derived state
  currentStepIndex = $derived(this.stepOrder.indexOf(this.currentStep));
  progress = $derived((this.completedSteps.size / 8) * 100);
  canGoBack = $derived(this.currentStepIndex > 0);
  canGoNext = $derived(this.currentStepIndex < 7);
  isComplete = $derived(this.completedSteps.size === 8);

  async loadLastReview() {
    const timestamp = await getSetting('lastReviewCompletedAt');
    this.lastReviewDate = timestamp ? new Date(timestamp) : null;
  }

  startReview() {
    this.isActive = true;
    this.currentStep = 'inbox';
    this.completedSteps = new Set();
  }

  completeStep(step: ReviewStep) {
    this.completedSteps.add(step);
  }

  goToStep(step: ReviewStep) {
    this.currentStep = step;
  }

  next() {
    if (this.canGoNext) {
      const nextIndex = this.currentStepIndex + 1;
      this.currentStep = this.stepOrder[nextIndex];
    }
  }

  back() {
    if (this.canGoBack) {
      const prevIndex = this.currentStepIndex - 1;
      this.currentStep = this.stepOrder[prevIndex];
    }
  }

  async finishReview() {
    await setSetting('lastReviewCompletedAt', new Date().toISOString());
    await this.loadLastReview();
    this.isActive = false;
    this.completedSteps = new Set();
  }
}

export const weeklyReviewState = new WeeklyReviewState();
```

### Celebration on Completion
```typescript
// Source: https://github.com/catdad/canvas-confetti
import confetti from 'canvas-confetti';
import { toast } from 'svelte-5-french-toast';

async function handleFinishReview() {
  await weeklyReviewState.finishReview();

  // Confetti celebration
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    disableForReducedMotion: true
  });

  // Toast notification
  toast.success('Weekly review complete! Your GTD system is current. 🎉');
}
```

### Time Since Last Review Display
```typescript
// Source: Community best practice (Intl.RelativeTimeFormat)
function getTimeSinceLastReview(lastReview: Date | null): string {
  if (!lastReview) return 'Never completed';

  const now = new Date();
  const diffMs = now.getTime() - lastReview.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays === 7) return '1 week ago';
  if (diffDays < 14) return 'Last week';
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

  const diffMonths = Math.floor(diffDays / 30);
  return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`;
}

// Usage with warning indicator:
const daysSince = lastReview
  ? Math.floor((Date.now() - lastReview.getTime()) / (1000 * 60 * 60 * 24))
  : Infinity;
const isOverdue = daysSince > 7;

<div class="flex items-center gap-2">
  <span class:text-red-600={isOverdue} class:text-gray-600={!isOverdue}>
    Last review: {getTimeSinceLastReview(lastReview)}
  </span>
  {#if isOverdue}
    <span class="text-xs text-red-600">⚠️ Overdue</span>
  {/if}
</div>
```

### Database Schema Migration (v5)
```typescript
// Source: Existing schema.ts pattern
export interface AppSettings {
  id: number;
  key: string;
  value: any;
  updatedAt: Date;
}

export const db = new Dexie("GTDDatabase") as Dexie & {
  items: EntityTable<GTDItem, "id">;
  lists: EntityTable<GTDList, "id">;
  contexts: EntityTable<Context, "id">;
  settings: EntityTable<AppSettings, "id">;  // NEW
};

db.version(5).stores({
  items: "++id, type, created, modified, *searchWords, context, projectId, sortOrder, completedAt, followUpDate, category",
  lists: "++id, name, type",
  contexts: "++id, name, sortOrder",
  settings: "++id, &key, updatedAt"  // & = unique constraint on key
});
```

### Settings CRUD Operations
```typescript
// Source: Dexie.org API Reference
import { db } from './schema';

export async function getSetting(key: string): Promise<any | null> {
  const setting = await db.settings.where('key').equals(key).first();
  return setting?.value ?? null;
}

export async function setSetting(key: string, value: any): Promise<void> {
  const existing = await db.settings.where('key').equals(key).first();

  if (existing) {
    await db.settings.update(existing.id, {
      value,
      updatedAt: new Date()
    });
  } else {
    await db.settings.add({
      key,
      value,
      updatedAt: new Date()
    } as AppSettings);
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Store wizard state in component | Singleton state store with $state runes | Svelte 5 (2024) | Better reactivity, shared state across components |
| localStorage for metadata | IndexedDB via Dexie | 2020+ | Type-safe, queryable, handles large data |
| Custom confetti implementations | canvas-confetti library | 2019+ (stable) | Performance, accessibility, cross-browser |
| Absolute timestamps | Relative time ("3 days ago") | UX standard 2015+ | More actionable, easier to parse at-a-glance |

**Deprecated/outdated:**
- **Svelte stores ($:)**: Replaced by $state/$derived runes in Svelte 5
- **Component-local state for shared data**: State stores are now the pattern
- **Modal wizards for long flows**: Full-page wizards are standard for 5+ steps

## Open Questions

Things that couldn't be fully resolved:

1. **Should review support "pause and resume"?**
   - What we know: GTD review takes 30-60 minutes, users may need to pause
   - What's unclear: Is complexity of persistence worth it? How often do users pause?
   - Recommendation: V1 should NOT persist in-progress state. If user closes tab, they restart. Observe usage in Phase 7 analytics - if users abandon frequently, add pause/resume in Phase 8+

2. **Should steps be skippable?**
   - What we know: Official GTD review expects all 8 steps
   - What's unclear: What if user has zero items in a category (e.g., no waiting-for)?
   - Recommendation: All steps required, but show count in step title and render helpful empty state. Don't allow skip - encourages thoroughness

3. **Should review track completion history (multiple timestamps)?**
   - What we know: Only need "last completed" for time-since display
   - What's unclear: Would history chart (review cadence over time) motivate users?
   - Recommendation: V1 stores single timestamp. If Phase 7+ adds analytics, expand to history array

## Sources

### Primary (HIGH confidence)
- Official GTD Weekly Review Checklist - https://gettingthingsdone.com/wp-content/uploads/2014/10/Weekly_Review_Checklist.pdf
- David Allen GTD Weekly Review Guide - https://gettingthingsdone.com/2018/08/episode-43-the-power-of-the-gtd-weekly-review/
- Dexie.js API Reference - https://dexie.org/docs/API-Reference
- canvas-confetti GitHub - https://github.com/catdad/canvas-confetti
- Nielsen Norman Group: Wizards - https://www.nngroup.com/articles/wizards/

### Secondary (MEDIUM confidence)
- Asian Efficiency GTD Weekly Review Guide - https://www.asianefficiency.com/productivity/gtd-weekly-review/ (verified against official GTD)
- Wizard UI Pattern Design - https://www.eleken.co/blog-posts/wizard-ui-pattern-explained (industry best practices)
- Lollypop Design: Wizard UI Best Practices 2026 - https://lollypop.design/blog/2026/january/wizard-ui-design/
- shadcn-svelte Progress Component - https://www.shadcn-svelte.com/docs/components/progress

### Tertiary (LOW confidence)
- Svelte 5 Patterns (runes, state) - https://fubits.dev/notes/svelte-5-patterns-simple-shared-state-getcontext-tweened-stores-with-runes/ (community blog, unverified)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified via official docs and GitHub repos
- Architecture: HIGH - Patterns from official GTD sources and existing codebase
- Pitfalls: MEDIUM - Based on UX best practices and wizard design research, not GTD-specific testing

**Research date:** 2026-01-30
**Valid until:** 2026-02-28 (30 days - stable domain, GTD methodology unchanged since 2001)
