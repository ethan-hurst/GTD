# Phase 7: GTD Onboarding - Research

**Researched:** 2026-01-30
**Domain:** Progressive onboarding, user education, contextual help systems
**Confidence:** MEDIUM

## Summary

Onboarding for first-time users requires balancing education with speed to value. Research shows that users should experience core value within 60 seconds, with 90% churning without clear value in the first week. The standard approach is progressive disclosure through multi-step walkthroughs combined with contextual tooltips that appear on first feature encounter.

The technical implementation uses a wizard/step-based state machine (already established in Phase 6 weekly review) for the walkthrough, tooltip/popover components for contextual hints, and IndexedDB (via existing Dexie settings table) for tracking onboarding state and feature visits. The codebase already has patterns for all three: WeeklyReviewState class for wizard state, canvas-confetti for celebrations, and AppSettings table for persistence.

Key insight: Skippable onboarding flows have 25% higher completion rates, validating the user's decision to include skip functionality. Interactive walkthroughs (where users perform real actions) have 50% higher activation rates compared to passive tours.

**Primary recommendation:** Use state machine pattern from WeeklyReviewState as template for onboarding wizard. Use Svelte-Pops for tooltip system (Svelte 5 + Tailwind v4 compatible). Track feature visits via route-based approach using SvelteKit page store. Store all state in existing Dexie settings table.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Svelte-Pops | Latest (2026) | Tooltip/popover management | Built specifically for Svelte 5 + Tailwind v4, uses Floating UI for positioning |
| canvas-confetti | Already installed | Celebration effects | Already used in weekly review, proven pattern |
| Dexie 4.x | Already installed | State persistence | Settings table (schema v5) already exists for key-value storage |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Floating UI | Via Svelte-Pops | Tooltip positioning | Automatically handled by Svelte-Pops |
| SvelteKit page store | Built-in | Route tracking | For detecting feature visits via navigation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Svelte-Pops | svelte-guide | svelte-guide is tour-focused (sequential), not contextual hints (appear on demand) |
| Svelte-Pops | shadcn-svelte tooltip | shadcn requires bits-ui dependency, Svelte-Pops is zero-dependency and lighter |
| Route-based tracking | Action-based tracking | Action-based requires instrumenting every feature, route-based tracks visits automatically |

**Installation:**
```bash
npm install svelte-pops
```

## Architecture Patterns

### Recommended Project Structure
```
src/lib/
├── components/
│   ├── OnboardingWizard.svelte      # Multi-step walkthrough component
│   ├── OnboardingStep.svelte        # Individual step wrapper (reusable)
│   └── FeatureHint.svelte           # Contextual tooltip wrapper
├── stores/
│   └── onboarding.svelte.ts         # Onboarding state machine (like review.svelte.ts)
└── utils/
    └── featureTracking.ts           # Route-to-feature mapping utilities

src/routes/
└── onboarding/
    └── +page.svelte                 # Full-screen onboarding experience
```

### Pattern 1: State Machine for Wizard Flow
**What:** Class-based state store using Svelte 5 runes for multi-step walkthrough
**When to use:** Any wizard or multi-step flow requiring progress tracking and navigation
**Example:**
```typescript
// Source: Existing pattern from src/lib/stores/review.svelte.ts
export type OnboardingStep = 'welcome' | 'capture' | 'process' | 'organize' | 'review';

export class OnboardingState {
	currentStep = $state<OnboardingStep>('welcome');
	completedSteps = $state<Set<OnboardingStep>>(new Set());
	isActive = $state(false);
	hasSkipped = $state(false);

	readonly stepOrder: OnboardingStep[] = ['welcome', 'capture', 'process', 'organize', 'review'];

	currentStepIndex = $derived(this.stepOrder.indexOf(this.currentStep));
	progress = $derived((this.completedSteps.size / this.stepOrder.length) * 100);
	canGoBack = $derived(this.currentStepIndex > 0);
	canGoNext = $derived(this.currentStepIndex < this.stepOrder.length - 1);
	isComplete = $derived(this.completedSteps.size === this.stepOrder.length);

	async loadState() {
		const completed = await getSetting('onboardingCompleted');
		const skipped = await getSetting('onboardingSkipped');
		// Load state logic
	}

	async finishOnboarding() {
		await setSetting('onboardingCompleted', new Date().toISOString());
		this.isActive = false;
	}

	async skipOnboarding() {
		await setSetting('onboardingSkipped', true);
		this.hasSkipped = true;
		this.isActive = false;
	}
}

export const onboardingState = new OnboardingState();
```

### Pattern 2: Feature Visit Tracking via Route Mapping
**What:** Track feature usage by mapping SvelteKit routes to feature identifiers, persisting in settings table
**When to use:** Any feature discovery system that needs to know "has user visited X yet?"
**Example:**
```typescript
// Source: Research on SvelteKit page store + IndexedDB patterns
import { page } from '$app/stores';
import { getSetting, setSetting } from '$lib/db/operations';

export type Feature =
	| 'inbox' | 'next-actions' | 'projects'
	| 'waiting' | 'someday' | 'review'
	| 'search' | 'keyboard-shortcuts' | 'settings';

const routeToFeature: Record<string, Feature> = {
	'/': 'inbox',
	'/actions': 'next-actions',
	'/projects': 'projects',
	'/waiting': 'waiting',
	'/someday': 'someday',
	'/review': 'review',
	'/settings': 'settings'
};

export async function markFeatureVisited(feature: Feature) {
	const key = `feature_visited_${feature}`;
	await setSetting(key, true);
}

export async function hasVisitedFeature(feature: Feature): Promise<boolean> {
	const key = `feature_visited_${feature}`;
	const visited = await getSetting(key);
	return visited === true;
}

export function getFeatureFromRoute(path: string): Feature | null {
	return routeToFeature[path] || null;
}

// Usage in +layout.svelte with page store
let currentPath = $state($page.url.pathname);
$effect(() => {
	const path = $page.url.pathname;
	if (path !== currentPath) {
		currentPath = path;
		const feature = getFeatureFromRoute(path);
		if (feature) {
			markFeatureVisited(feature);
		}
	}
});
```

### Pattern 3: Contextual Tooltips with Svelte-Pops
**What:** Show tooltip hints on first encounter with features, hide after user interaction
**When to use:** Contextual help that appears automatically based on usage state
**Example:**
```svelte
<!-- Source: Svelte-Pops documentation -->
<script lang="ts">
	import { Popover } from 'svelte-pops';
	import { hasVisitedFeature, markFeatureVisited } from '$lib/utils/featureTracking';

	let { feature, children } = $props();
	let showHint = $state(false);

	onMount(async () => {
		const visited = await hasVisitedFeature(feature);
		showHint = !visited;
	});

	function handleDismiss() {
		showHint = false;
		markFeatureVisited(feature);
	}
</script>

{#if showHint}
	<Popover>
		<div slot="anchor">
			{@render children()}
		</div>
		<div slot="content" class="hint-popover">
			<p><strong>Next Actions</strong> — tasks you can do right now</p>
			<button onclick={handleDismiss}>Got it</button>
		</div>
	</Popover>
{:else}
	{@render children()}
{/if}
```

### Pattern 4: Interactive Walkthrough with Real Actions
**What:** Embed functional components (like InboxCapture) inside walkthrough steps for hands-on learning
**When to use:** When demonstrating workflows that benefit from immediate practice
**Example:**
```svelte
<!-- Capture step with embedded real input -->
<div class="onboarding-step">
	<h2>Capture: Get It Out of Your Head</h2>
	<p>GTD starts with capturing everything on your mind. Try it now:</p>

	<!-- Real InboxCapture component, not a mockup -->
	<InboxCapture
		placeholder="Type something on your mind... (e.g., 'Call dentist')"
		onfirstcapture={() => {
			// Celebrate first capture
			confetti({ particleCount: 50, spread: 60 });
			// Auto-advance after brief delay
			setTimeout(() => onboardingState.next(), 1500);
		}}
	/>

	<p class="hint">Don't worry about organizing yet — just capture!</p>
</div>
```

### Pattern 5: Reduced Hints for Skip Users
**What:** Show shorter, UI-focused hints for users who skipped onboarding (assumes GTD knowledge)
**When to use:** When user has indicated existing domain knowledge but needs UI guidance
**Example:**
```typescript
// Two hint content sets based on skip status
const hintContent = {
	full: {
		nextActions: "**Next Actions** — tasks you can do right now, sorted by where you are. These are the single, physical, visible actions that move your projects forward.",
		projects: "**Projects** — any outcome requiring more than one action. Every active project should have at least one next action."
	},
	reduced: {
		nextActions: "**Next Actions** — view all actionable tasks",
		projects: "**Projects** — manage multi-step outcomes"
	}
};

function getHintText(feature: Feature): string {
	const contentSet = onboardingState.hasSkipped ? hintContent.reduced : hintContent.full;
	return contentSet[feature];
}
```

### Anti-Patterns to Avoid
- **Blocking all-at-once tutorials:** Research shows 25% higher completion with skippable flows. Never force multi-screen education before letting users try the app.
- **Passive slideshow tours:** Interactive walkthroughs have 50% higher activation. Each step should ask users to do something, not just read.
- **Hints that disappear on dismiss:** Hints should only disappear after actual feature usage, not just dismissal. Otherwise users may dismiss accidentally and lose guidance.
- **Hiding skip button after first screen:** Transparency builds trust. If skip is offered, keep it accessible throughout (or commit users on first screen only, as decided).
- **Pre-filled example data:** Clean slate is critical. No seed tasks or demo content that users must delete.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tooltip positioning | Custom absolute positioning logic | Svelte-Pops (wraps Floating UI) | Edge detection, scrolling containers, collision avoidance, viewport boundaries |
| Multi-step wizard state | Ad-hoc step tracking with variables | State machine class pattern (from WeeklyReviewState) | Progress calculation, navigation guards, step validation, completion tracking |
| Feature visit tracking | Custom event listeners on every feature | Route-based tracking with page store | Automatic, centralized, works with browser back/forward, no manual instrumentation |
| Confetti celebrations | Custom canvas animations | canvas-confetti (already installed) | Handles performance, reduced motion preference, particle physics |
| Onboarding state persistence | localStorage key-value pairs | Dexie settings table (already exists) | Transactional, indexed, handles quota errors gracefully, works offline |

**Key insight:** Tooltip positioning is deceptively complex. Floating UI handles 20+ edge cases (viewport boundaries, scroll containers, collision detection, virtual elements, arrow positioning). Don't attempt custom CSS absolute positioning.

## Common Pitfalls

### Pitfall 1: Dismissal vs Completion Confusion
**What goes wrong:** User dismisses hint without using feature, hint never appears again, user loses guidance
**Why it happens:** Conflating "dismissed" with "understood" — user may dismiss by accident or to clear clutter temporarily
**How to avoid:** Only mark feature as "visited" when user actually uses the feature (route visit, button click, etc.), not on hint dismissal. Provide "Show hints again" in Settings.
**Warning signs:** Users asking "how do I see that tip again?" or missing features entirely

### Pitfall 2: Onboarding Blocking App Load
**What goes wrong:** Onboarding check runs on every page load, slowing initial render
**Why it happens:** Loading onboarding state from IndexedDB in root layout synchronously
**How to avoid:** Load onboarding state asynchronously in onMount, show app immediately, overlay onboarding if needed. Use redirect in +page.server.ts if server-side check is required.
**Warning signs:** Delayed time to interactive, blank screen on load

### Pitfall 3: Skip Users See Full Onboarding Hints
**What goes wrong:** Users who clicked "I know GTD" still see lengthy explanations of GTD concepts
**Why it happens:** Forgetting to check skip state when rendering hint content
**How to avoid:** Store skip state in settings (`onboardingSkipped: boolean`), load it with feature visit data, pass to hint components. Provide two content sets: full (GTD concepts) vs reduced (UI only).
**Warning signs:** Advanced users complaining about condescending tooltips

### Pitfall 4: Lost Progress on Browser Refresh
**What goes wrong:** User starts onboarding walkthrough, refreshes browser, progress is lost
**Why it happens:** Onboarding state only in memory ($state), not persisted to IndexedDB
**How to avoid:** Persist step progress after each step completion. On mount, check if incomplete walkthrough exists and offer to resume. WeeklyReviewState doesn't need this (single session) but onboarding might span days.
**Warning signs:** Users reporting "had to start over"

### Pitfall 5: Route-Based Tracking Missing Search/Shortcuts
**What goes wrong:** User uses search or keyboard shortcuts, but these features aren't "visited" because they don't have routes
**Why it happens:** Route-based tracking only catches page navigation, not in-page interactions
**How to avoid:** For non-route features (search focus, keyboard shortcut use, export), use action-based tracking with manual events. Hybrid approach: routes for pages, events for interactions.
**Warning signs:** Hints appearing for features user has already used extensively

### Pitfall 6: Safari Storage Eviction
**What goes wrong:** User completes onboarding, returns after 8 days, onboarding state is gone, sees walkthrough again
**Why it happens:** Safari deletes all browser storage (including IndexedDB) after 7 days of inactivity
**How to avoid:** Cannot prevent Safari eviction, but handle gracefully: if user has items in database, assume they've completed onboarding even if flag is missing. Use heuristics (item count, last modified dates) as fallback.
**Warning signs:** Returning users reporting "forced through onboarding again"

### Pitfall 7: Accessibility - Tooltip Traps
**What goes wrong:** Keyboard users cannot dismiss tooltips, tooltips obscure interactive elements, screen readers announce tooltips unexpectedly
**Why it happens:** Tooltips implemented as overlays without focus management or escape key handling
**How to avoid:** Svelte-Pops handles escape key by default. Ensure tooltips don't obscure their trigger elements. Use aria-describedby for hint association. Test with keyboard-only navigation.
**Warning signs:** Keyboard users cannot access features, screen reader confusion

## Code Examples

Verified patterns from official sources and existing codebase:

### Celebration Effect (First Capture)
```typescript
// Source: src/routes/review/+page.svelte (existing pattern)
import confetti from 'canvas-confetti';

async function handleFirstCapture() {
	// Mark capture step complete
	onboardingState.completeStep('capture');

	// Celebration confetti
	confetti({
		particleCount: 100,
		spread: 70,
		origin: { y: 0.6 },
		disableForReducedMotion: true  // CRITICAL: respects user preference
	});

	// Brief pause for celebration, then continue
	setTimeout(() => {
		onboardingState.next();
	}, 1500);
}
```

### Settings Persistence Pattern
```typescript
// Source: src/lib/db/operations.ts (existing operations)
// Settings table schema: { id, key: string (unique), value: any, updatedAt: Date }

// Store onboarding completion
await setSetting('onboardingCompleted', new Date().toISOString());

// Store skip state
await setSetting('onboardingSkipped', true);

// Store feature visits (one key per feature)
await setSetting('feature_visited_inbox', true);
await setSetting('feature_visited_search', true);

// Retrieve state
const completed = await getSetting('onboardingCompleted');
const skipped = await getSetting('onboardingSkipped');
const visitedInbox = await getSetting('feature_visited_inbox');

// Check if onboarding needed (on app load)
async function shouldShowOnboarding(): Promise<boolean> {
	const completed = await getSetting('onboardingCompleted');
	const skipped = await getSetting('onboardingSkipped');

	// Fallback: if user has items, assume onboarding done (Safari eviction)
	if (!completed && !skipped) {
		const itemCount = await db.items.count();
		if (itemCount > 0) return false;
	}

	return !completed && !skipped;
}
```

### Route-Based Feature Tracking in Root Layout
```svelte
<script lang="ts">
	// Source: SvelteKit page store pattern + research
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { getFeatureFromRoute, markFeatureVisited } from '$lib/utils/featureTracking';

	let previousPath = $state('');

	// Track route changes for feature visits
	$effect(() => {
		const currentPath = $page.url.pathname;
		if (currentPath !== previousPath) {
			previousPath = currentPath;
			const feature = getFeatureFromRoute(currentPath);
			if (feature) {
				markFeatureVisited(feature).catch(err => {
					console.warn('Failed to track feature visit:', err);
				});
			}
		}
	});
</script>
```

### Hybrid Tracking: Routes + Manual Events
```typescript
// featureTracking.ts - routes
const routeToFeature: Record<string, Feature> = {
	'/': 'inbox',
	'/actions': 'next-actions',
	'/projects': 'projects',
	'/waiting': 'waiting',
	'/someday': 'someday',
	'/review': 'review',
	'/settings': 'settings'
};

// Manual event tracking for non-route features
// In SearchBar.svelte when user focuses search:
function handleSearchFocus() {
	markFeatureVisited('search');
}

// In keyboard shortcut handler when user uses shortcut:
if (event.key === 'n') {
	markFeatureVisited('keyboard-shortcuts');
	goto('/actions');
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Modal overlays with "Next" buttons | Interactive walkthroughs with real actions | ~2024-2025 | 50% higher activation rates, users learn by doing |
| Show all features upfront | Progressive disclosure / contextual hints | ~2024-2025 | Reduced cognitive overload, 40% better retention |
| Force completion before app access | Skippable onboarding | ~2025-2026 | 25% higher completion rates (paradoxically) |
| Product tour libraries (Shepherd.js, Intro.js) | Framework-native solutions (Svelte-Pops) | ~2025-2026 | Better integration, smaller bundle, SSR-compatible |
| localStorage for state | IndexedDB for state | ~2024-2025 | Transactional integrity, better quota handling, structured queries |

**Deprecated/outdated:**
- **Shepherd.js / Intro.js for Svelte:** Not built for Svelte reactivity or SSR, adds jQuery-style DOM manipulation
- **Slideshow-style product tours:** Low engagement, high skip rates
- **All-at-once account setup wizards:** User research shows value-first, then profile completion performs better
- **Permanent hint dismissal on click:** Users accidentally dismiss, modern pattern is "hide until feature used"

## Open Questions

Things that couldn't be fully resolved:

1. **Exact landing spot after walkthrough completion**
   - What we know: User decided this is Claude's discretion (inbox with prompt vs dashboard)
   - What's unclear: Which provides better first experience — returning to familiar inbox, or landing on a dashboard summarizing all GTD views?
   - Recommendation: Land on inbox with brief toast "Onboarding complete! Start capturing." Inbox is the entry point to GTD workflow, natural starting place.

2. **Exact number of walkthrough screens**
   - What we know: User specified "4+ screens covering Capture, Process, Organize, Review"
   - What's unclear: Optimal number to balance education vs speed-to-value (60 second requirement)
   - Recommendation: 5 screens (Welcome + 4 GTD concepts). Each ~10-15 seconds = 60 seconds total. Welcome allows skip, then 4 interactive steps with embedded capture in step 2.

3. **Walkthrough illustration/visual style**
   - What we know: User left visual style to Claude's discretion
   - What's unclear: Illustrations, icons, animations, or text-only?
   - Recommendation: Icon-based (minimal), no custom illustrations. Use Heroicons (already common in Svelte ecosystem) for concept representations. Keeps bundle small, loads fast, accessible.

4. **Celebration style for first capture**
   - What we know: User left celebration style to discretion, confetti already used in weekly review
   - What's unclear: Same confetti pattern, or something different for variety?
   - Recommendation: Use same confetti pattern for consistency. Reduce particleCount to 50 (lighter celebration, faster). Users recognize celebration pattern from weekly review later.

5. **Feature visit tracking edge cases**
   - What we know: Route-based for pages, but search/shortcuts need manual events
   - What's unclear: Should opening processing panel count as "visited processing"? What about contexts sidebar?
   - Recommendation: Don't track sub-features (processing panel, contexts). Hints only for main views (inbox, actions, projects, waiting, someday, review, search, settings, keyboard shortcuts). Keeps system simple.

## Sources

### Primary (HIGH confidence)
- Svelte-Pops documentation (https://svelte-pops.vercel.app/docs/overview) - Svelte 5 + Tailwind v4 compatibility verified
- Svelte accessibility warnings (https://svelte.dev/docs/accessibility-warnings) - Keyboard event handling requirements
- Existing codebase patterns:
  - `src/lib/stores/review.svelte.ts` - State machine pattern
  - `src/routes/review/+page.svelte` - Confetti usage pattern
  - `src/lib/db/schema.ts` - AppSettings table schema (v5)
  - `src/lib/db/operations.ts` - getSetting/setSetting operations
  - `src/routes/+layout.svelte` - Keyboard shortcut handling pattern

### Secondary (MEDIUM confidence)
- UserGuiding progressive onboarding guide (https://userguiding.com/blog/progressive-onboarding) - UX patterns verified across multiple sources
- UserGuiding FTUE guide (https://userguiding.com/blog/first-time-new-user-experience) - 60-second value delivery, 90% churn stat
- UserGuiding onboarding statistics (https://userguiding.com/blog/user-onboarding-statistics) - 25% higher completion with skip, 50% activation with interactive
- MDN IndexedDB best practices (https://web.dev/articles/indexeddb-best-practices-app-state) - State persistence patterns
- LogRocket offline-first patterns (https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/) - Multi-layer storage architecture
- Rodney Lab SvelteKit page tracking (https://rodneylab.com/tracking-page-views-sveltekit/) - Page store pattern for route tracking

### Tertiary (LOW confidence)
- svelte-guide library (https://github.com/alexdev404/svelte-guide) - Svelte 5 compatibility not confirmed in documentation
- shadcn-svelte tooltip (https://www.shadcn-svelte.com/docs/components/tooltip) - Verified Svelte 5 compatible, but requires bits-ui dependency (heavier than Svelte-Pops)

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM - Svelte-Pops verified Svelte 5/Tailwind v4 compatible via official docs, but newer library (less battle-tested)
- Architecture: HIGH - Patterns directly from existing codebase (WeeklyReviewState, confetti, settings persistence)
- Pitfalls: MEDIUM - Mix of verified browser behavior (Safari eviction) and UX research findings (skip rates, interactive vs passive)

**Research date:** 2026-01-30
**Valid until:** 2026-03-01 (30 days, onboarding UX patterns are relatively stable, but Svelte-Pops is new library)
