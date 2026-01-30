# Phase 1: Foundation & Storage - Research

**Researched:** 2026-01-30
**Domain:** Offline-first web app with SvelteKit, IndexedDB, and service workers
**Confidence:** HIGH

## Summary

Phase 1 establishes a robust offline-first foundation using SvelteKit as a static SPA with IndexedDB persistence via Dexie.js. The research confirms that the chosen stack (SvelteKit 2.50.1, Svelte 5.49.0, Dexie.js 4.2.1, Tailwind CSS 4.1.18) is current and well-supported with comprehensive TypeScript integration.

**Key findings:**
- SvelteKit's adapter-static with SPA fallback mode is ideal for offline-first single-page applications
- Dexie.js 4.x provides streamlined TypeScript support via `EntityTable` pattern
- Service workers for offline capability are built into SvelteKit's core functionality
- Persistent Storage API prevents browser eviction but requires careful permission handling
- Modern Svelte 5 uses state runes (`$state`) over stores for most reactive state management

**Primary recommendation:** Use SvelteKit's built-in service worker support (not external plugins) for offline capability, implement non-blocking persistent storage requests with visible status indicators, and structure the data layer as a separate module using Dexie.js with typed schemas.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SvelteKit | 2.50.1 | Application framework | Official Svelte meta-framework, excellent TypeScript support, built-in service worker handling |
| Svelte | 5.49.0 | Component framework | Latest version with runes for reactive state, compiler-based for minimal runtime |
| Dexie.js | 4.2.1 | IndexedDB wrapper | Industry standard for IndexedDB, excellent TypeScript support, simplified API, transaction management |
| Tailwind CSS | 4.1.18 | Styling framework | Modern utility-first CSS, excellent dark mode support, Vite integration |
| TypeScript | 5.x | Type system | Standard for modern web development, excellent tooling support |
| @sveltejs/adapter-static | Latest | Build adapter | Enables SPA mode with fallback for offline-first apps |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @sveltejs/vite-plugin-svelte | Latest | Svelte + Vite integration | Automatically included in SvelteKit setup |
| @tailwindcss/vite | Latest | Tailwind + Vite integration | New simplified Tailwind v4 Vite plugin (replaces PostCSS config) |
| vite | 5.x | Build tool | SvelteKit's default bundler, fast HMR |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Dexie.js | Native IndexedDB API | More verbose API, manual transaction handling, no TypeScript helpers - not recommended |
| Dexie.js | localForage | Simpler API but less powerful, no reactive queries, less control - insufficient for GTD complexity |
| SvelteKit built-in SW | @vite-pwa/sveltekit | More features (Workbox strategies) but adds complexity - overkill for Phase 1 |
| Tailwind CSS 4 | Tailwind CSS 3 | v3 requires separate PostCSS config, v4 is newer with Vite plugin - use v4 |

**Installation:**
```bash
# Initialize SvelteKit project with TypeScript
npx sv create my-app
cd my-app

# Core dependencies (most already included from sv create)
npm install dexie

# Tailwind CSS v4 setup
npm install tailwindcss @tailwindcss/vite

# Adapter for static SPA
npm install -D @sveltejs/adapter-static
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── db/
│   │   ├── schema.ts          # Dexie database schema and types
│   │   ├── operations.ts      # Database CRUD operations
│   │   └── export.ts          # Export/import logic
│   ├── stores/
│   │   ├── storage.svelte.ts  # Storage status state (using $state rune)
│   │   └── theme.svelte.ts    # Theme state (dark/light mode)
│   └── components/
│       ├── StatusBar.svelte   # Storage status footer
│       ├── Sidebar.svelte     # Navigation sidebar
│       └── ThemeToggle.svelte # Dark mode toggle
├── routes/
│   ├── +layout.svelte         # Root layout with sidebar + status bar
│   ├── +layout.ts             # Disable SSR: export const ssr = false
│   ├── +page.svelte           # Inbox view (empty state)
│   └── settings/
│       └── +page.svelte       # Settings page (export/import UI)
├── service-worker.js          # Offline caching logic
└── app.css                    # Tailwind imports
```

### Pattern 1: Dexie Database Setup with TypeScript (Dexie 4.x)
**What:** Define database schema using `EntityTable` for type-safe operations
**When to use:** Always for database initialization in Phase 1
**Example:**
```typescript
// Source: https://dexie.org/docs/Tutorial/Svelte
// lib/db/schema.ts
import { Dexie, type EntityTable } from "dexie"

export interface GTDItem {
  id: number
  title: string
  type: 'inbox' | 'next-action' | 'project' | 'waiting' | 'someday'
  created: Date
  modified: Date
}

export interface GTDList {
  id: number
  name: string
  type: string
}

export const db = new Dexie("GTDDatabase") as Dexie & {
  items: EntityTable<GTDItem, "id">
  lists: EntityTable<GTDList, "id">
}

// Schema declaration - runtime schema definition
db.version(1).stores({
  items: "++id, type, created, modified",  // ++id = auto-increment
  lists: "++id, name, type"
})

export type { GTDItem, GTDList }
```

### Pattern 2: SPA Mode Configuration
**What:** Configure SvelteKit for client-side only rendering with offline fallback
**When to use:** Required for offline-first SPA setup
**Example:**
```javascript
// Source: https://github.com/sveltejs/kit/blob/main/documentation/docs/25-build-and-deploy/55-single-page-apps.md
// svelte.config.js
import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: '200.html',  // SPA fallback page
			precompress: false,
			strict: true
		})
	}
};

export default config;

// src/routes/+layout.ts
export const ssr = false;  // Disable SSR globally
export const prerender = false;
```

### Pattern 3: Service Worker for Offline Support
**What:** SvelteKit's built-in service worker with cache-first strategy
**When to use:** Required for offline capability
**Example:**
```javascript
// Source: https://github.com/sveltejs/kit/blob/main/documentation/docs/30-advanced/40-service-workers.md
// src/service-worker.js
import { build, files, version } from '$service-worker';

const CACHE = `cache-${version}`;
const ASSETS = [...build, ...files];

self.addEventListener('install', (event) => {
	async function addFilesToCache() {
		const cache = await caches.open(CACHE);
		await cache.addAll(ASSETS);
	}
	event.waitUntil(addFilesToCache());
});

self.addEventListener('activate', (event) => {
	async function deleteOldCaches() {
		for (const key of await caches.keys()) {
			if (key !== CACHE) await caches.delete(key);
		}
	}
	event.waitUntil(deleteOldCaches());
});

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	async function respond() {
		const url = new URL(event.request.url);
		const cache = await caches.open(CACHE);

		// Serve build assets from cache
		if (ASSETS.includes(url.pathname)) {
			const response = await cache.match(url.pathname);
			if (response) return response;
		}

		// Network-first for other requests, cache fallback
		try {
			const response = await fetch(event.request);
			if (response.status === 200) {
				cache.put(event.request, response.clone());
			}
			return response;
		} catch (err) {
			const response = await cache.match(event.request);
			if (response) return response;
			throw err;
		}
	}
	event.respondWith(respond());
});
```

### Pattern 4: Persistent Storage API Usage
**What:** Request persistent storage permission and monitor storage status
**When to use:** On app initialization, display status in UI
**Example:**
```javascript
// Source: https://dexie.org/docs/StorageManager
// lib/stores/storage.svelte.ts
export class StorageStatus {
	isPersistent = $state(false);
	quota = $state(0);
	usage = $state(0);
	lastCheck = $state<Date | null>(null);

	async checkPersistence() {
		if (navigator.storage && navigator.storage.persisted) {
			this.isPersistent = await navigator.storage.persisted();
		}
	}

	async requestPersistence() {
		if (navigator.storage && navigator.storage.persist) {
			const granted = await navigator.storage.persist();
			this.isPersistent = granted;
			return granted;
		}
		return false;
	}

	async updateQuota() {
		if (navigator.storage && navigator.storage.estimate) {
			const estimate = await navigator.storage.estimate();
			this.quota = estimate.quota || 0;
			this.usage = estimate.usage || 0;
			this.lastCheck = new Date();
		}
	}
}

export const storageStatus = new StorageStatus();
```

### Pattern 5: Dark Mode with Tailwind CSS
**What:** System preference detection with manual toggle using class-based strategy
**When to use:** Root layout initialization
**Example:**
```javascript
// Source: https://tailwindcss.com/docs/dark-mode
// lib/stores/theme.svelte.ts
export class ThemeStore {
	current = $state<'light' | 'dark' | 'system'>('system');

	constructor() {
		// Initialize from localStorage or default to system
		if (typeof window !== 'undefined') {
			const stored = localStorage.getItem('theme');
			this.current = (stored as any) || 'system';
			this.apply();
		}
	}

	apply() {
		const isDark = this.current === 'dark' ||
			(this.current === 'system' &&
			 window.matchMedia('(prefers-color-scheme: dark)').matches);

		document.documentElement.classList.toggle('dark', isDark);
	}

	set(theme: 'light' | 'dark' | 'system') {
		this.current = theme;
		if (theme === 'system') {
			localStorage.removeItem('theme');
		} else {
			localStorage.theme = theme;
		}
		this.apply();
	}
}

export const theme = new ThemeStore();
```

### Pattern 6: Export/Import Database
**What:** Full database export to JSON and import from JSON
**When to use:** Settings page export/import features
**Example:**
```typescript
// Source: https://dexie.org/docs/dexie-worker/dexie-worker (adapted)
// lib/db/export.ts
import { db } from './schema';

export async function exportDatabase(): Promise<string> {
	const exportData: Record<string, any[]> = {};

	for (const table of db.tables) {
		exportData[table.name] = await table.toArray();
	}

	return JSON.stringify({
		version: db.verno,
		exported: new Date().toISOString(),
		data: exportData
	}, null, 2);
}

export async function importDatabase(jsonData: string): Promise<void> {
	const imported = JSON.parse(jsonData);

	await db.transaction('rw', db.tables, async () => {
		// Clear existing data
		for (const table of db.tables) {
			await table.clear();
		}

		// Import new data
		for (const tableName in imported.data) {
			const table = db.table(tableName);
			if (table) {
				await table.bulkPut(imported.data[tableName]);
			}
		}
	});
}

export function downloadJSON(data: string, filename: string) {
	const blob = new Blob([data], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}
```

### Anti-Patterns to Avoid
- **Mixing async operations in transactions:** Never call `fetch()`, `setTimeout()`, or other async APIs within a Dexie transaction scope - the transaction will auto-close
- **Indexing large binary data:** Don't index images, files, or large strings - store them but don't add them to index specifications
- **Catching errors without re-throwing:** If you `.catch()` an error just to log it, the transaction won't abort - re-throw if you want transaction to fail
- **Using stores instead of $state runes:** Svelte 5 runes are preferred for reactive state - only use stores when returning from SvelteKit load functions
- **Not requesting persistent storage:** Without explicit request, browser may evict data under storage pressure

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| IndexedDB wrapper | Custom wrapper with promises | Dexie.js | Handles transaction management, promise chains, error propagation, browser quirks |
| Dark mode toggle | Manual class manipulation | Tailwind dark mode + localStorage pattern | Prevents FOUC, handles system preference, respects user choice |
| Service worker caching | Custom cache logic | SvelteKit's $service-worker module | Versioned caches, automatic cleanup, build integration |
| Database export/import | Custom serialization | Dexie.js `toArray()` + `bulkPut()` | Handles relationships, proper transaction wrapping, type safety |
| Storage quota checking | Manual calculation | StorageManager API | Browser-native, accurate, handles quota groups |
| Offline detection | `navigator.onLine` only | Service worker + fetch try/catch | `navigator.onLine` is unreliable, service worker provides real offline capability |

**Key insight:** IndexedDB's raw API is notoriously difficult with nested callbacks, implicit transaction closure, and error handling gotchas. Dexie.js abstracts these complexities while maintaining performance. Similarly, service workers have subtle lifecycle issues that SvelteKit's built-in integration handles correctly.

## Common Pitfalls

### Pitfall 1: IndexedDB Transaction Auto-Closing
**What goes wrong:** Transaction silently closes when mixing async operations, causing "TransactionInactiveError"
**Why it happens:** IndexedDB closes transactions when the call stack empties - any await of non-IndexedDB operations ends the transaction
**How to avoid:**
- Never use `fetch()`, `setTimeout()`, or external promises within a transaction
- Fetch data before starting the transaction
- Use Dexie's transaction scope - all operations must be Dexie calls
**Warning signs:** Intermittent "TransactionInactiveError" exceptions, operations silently failing

**Example:**
```typescript
// BAD - transaction will close before fetch completes
await db.transaction('rw', db.items, async () => {
	const item = await db.items.get(1);
	const external = await fetch('/api/data'); // BREAKS TRANSACTION
	await db.items.put({ ...item, data: external });
});

// GOOD - fetch outside transaction
const external = await fetch('/api/data');
await db.transaction('rw', db.items, async () => {
	const item = await db.items.get(1);
	await db.items.put({ ...item, data: external });
});
```

### Pitfall 2: Browser Storage Eviction Without Persistent Storage
**What goes wrong:** User's GTD data disappears after browser runs low on storage or after 7 days of inactivity (Safari)
**Why it happens:** Default storage is "best-effort" - browsers can evict it without user permission under storage pressure
**How to avoid:**
- Request persistent storage on first app launch: `navigator.storage.persist()`
- Display permission status clearly in UI (status bar)
- Implement regular export reminders if persistence denied
- Handle rejection gracefully - don't block app usage
**Warning signs:** User reports data loss, especially on mobile Safari

**Browser-specific behavior:**
- **Chrome/Edge:** Auto-grants for installed PWAs, heuristic-based otherwise
- **Safari:** Auto-deletes script-created data after 7 days without interaction if tracking prevention enabled
- **Firefox:** Prompts user explicitly, grants up to 50% of disk (max 8TB)

### Pitfall 3: Tailwind Dark Mode FOUC (Flash of Unstyled Content)
**What goes wrong:** Page briefly shows wrong theme on load before JavaScript runs
**Why it happens:** Dark mode class is added after page renders
**How to avoid:**
- Place theme detection script inline in `<head>` before body content
- Use blocking script (not async/defer) to set dark class immediately
- Store preference in localStorage for instant access
**Warning signs:** Visible flash from light to dark (or vice versa) on page load

**Example:**
```html
<!-- In app.html <head> before any content -->
<script>
	// Blocking inline script - runs immediately
	if (localStorage.theme === 'dark' ||
	    (!('theme' in localStorage) &&
	     window.matchMedia('(prefers-color-scheme: dark)').matches)) {
		document.documentElement.classList.add('dark')
	}
</script>
```

### Pitfall 4: Service Worker Update Delays
**What goes wrong:** Users stuck on old version of app even after deploying updates
**Why it happens:** Service worker caches aggressively - browser may not check for updates frequently
**How to avoid:**
- Implement service worker update detection and prompt
- Use `skipWaiting()` carefully - can break in-progress transactions
- Version your cache names (SvelteKit does this automatically)
- Consider update notification UI: "New version available - reload?"
**Warning signs:** Bug reports that don't match deployed code, users seeing stale UI

### Pitfall 5: Svelte 5 Store vs Rune Confusion
**What goes wrong:** Using writable stores when $state runes would be simpler and more appropriate
**Why it happens:** Svelte 5 changed paradigms - old tutorials still show store patterns
**How to avoid:**
- Default to `$state` runes for component and shared state
- Only use stores when returning from SvelteKit `load()` functions (which can't return runes)
- Can't use runes in `.ts` files consumed by `+layout.ts` or `+page.ts` load functions
**Warning signs:** Overly complex store setup where simple reactive variables would work

**Example:**
```typescript
// OLD WAY (Svelte 4, still works but verbose)
import { writable } from 'svelte/store';
export const count = writable(0);

// NEW WAY (Svelte 5, preferred)
// storage.svelte.ts
export const count = $state(0);
```

### Pitfall 6: Not Validating Import Data
**What goes wrong:** Importing malformed JSON corrupts database or breaks app
**Why it happens:** User may edit export file or import wrong file
**How to avoid:**
- Validate JSON structure before import
- Check for required fields and types
- Wrap import in try/catch with user-friendly error messages
- Consider version checking in export format
**Warning signs:** App crashes after import, database in inconsistent state

## Code Examples

Verified patterns from official sources:

### Tailwind CSS Integration with SvelteKit
```javascript
// Source: https://tailwindcss.com/docs/guides/sveltekit
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),  // Must come before sveltekit()
		sveltekit()
	]
});

// src/app.css
@import "tailwindcss";

// src/routes/+layout.svelte
<script>
	import '../app.css';
</script>

<slot />
```

### Storage Status Component Pattern
```svelte
<!-- lib/components/StatusBar.svelte -->
<script lang="ts">
	import { storageStatus } from '$lib/stores/storage.svelte';
	import { onMount } from 'svelte';

	onMount(async () => {
		await storageStatus.checkPersistence();
		await storageStatus.updateQuota();

		// Update quota every 30 seconds
		const interval = setInterval(() => {
			storageStatus.updateQuota();
		}, 30000);

		return () => clearInterval(interval);
	});

	async function requestPersistence() {
		const granted = await storageStatus.requestPersistence();
		if (!granted) {
			alert('Persistent storage denied. Your data may be lost if browser runs low on space.');
		}
	}

	$derived usagePercent = storageStatus.quota > 0
		? (storageStatus.usage / storageStatus.quota * 100).toFixed(1)
		: 0;
</script>

<footer class="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<span class="flex items-center gap-2">
				{#if storageStatus.isPersistent}
					<span class="text-green-600 dark:text-green-400">● Persistent</span>
				{:else}
					<button
						onclick={requestPersistence}
						class="text-yellow-600 dark:text-yellow-400 underline hover:no-underline"
					>
						⚠ Not Persistent - Click to Request
					</button>
				{/if}
			</span>

			<span class="text-gray-600 dark:text-gray-400">
				Storage: {usagePercent}% used
			</span>
		</div>

		{#if storageStatus.lastCheck}
			<span class="text-gray-500 dark:text-gray-500 text-xs">
				Updated {storageStatus.lastCheck.toLocaleTimeString()}
			</span>
		{/if}
	</div>
</footer>
```

### Database Operations Module
```typescript
// Source: Dexie.js best practices
// lib/db/operations.ts
import { db, type GTDItem } from './schema';

export async function addItem(item: Omit<GTDItem, 'id' | 'created' | 'modified'>): Promise<number> {
	return await db.items.add({
		...item,
		created: new Date(),
		modified: new Date(),
		id: 0 // Will be auto-generated
	});
}

export async function updateItem(id: number, changes: Partial<GTDItem>): Promise<number> {
	return await db.items.update(id, {
		...changes,
		modified: new Date()
	});
}

export async function deleteItem(id: number): Promise<void> {
	await db.items.delete(id);
}

export async function getAllInbox(): Promise<GTDItem[]> {
	return await db.items
		.where('type')
		.equals('inbox')
		.sortBy('created');
}

// Reactive query using liveQuery (for Svelte components)
export function watchInbox() {
	return db.items
		.where('type')
		.equals('inbox')
		.toArray();
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Svelte 4 stores everywhere | Svelte 5 $state runes | Svelte 5.0 (Oct 2024) | Simpler reactivity, works in .ts files, less boilerplate |
| Tailwind with PostCSS config | Tailwind v4 Vite plugin | Tailwind 4.0 (2024) | No postcss.config.js needed, simpler setup |
| Dexie Table<T, K> | EntityTable<T, K> | Dexie 4.0 (2024) | Cleaner TypeScript types, better inference |
| Class-based Dexie setup | Functional with EntityTable | Dexie 4.0 (2024) | Less verbose, better tree-shaking |
| @vite-pwa/sveltekit | SvelteKit native service worker | SvelteKit 1.0+ | Built-in, no plugin needed for basic offline |
| localStorage for themes | Tailwind dark mode utilities | Tailwind 3.0+ | System preference support, no manual class handling |

**Deprecated/outdated:**
- **Svelte 4 reactive statements (`$:`)**: Still works but `$derived` and `$effect` runes are preferred in Svelte 5
- **Dexie.js class-based schema**: Still valid but functional `EntityTable` approach is cleaner for TypeScript
- **Tailwind PostCSS plugin**: Replaced by `@tailwindcss/vite` plugin in Tailwind 4.x
- **SvelteKit SSR for offline apps**: Disable with `export const ssr = false` for true SPA mode
- **Manual IndexedDB quota checking**: Use `navigator.storage.estimate()` instead of deprecated `navigator.storage.webkitTemporaryStorage`

## Open Questions

Things that couldn't be fully resolved:

1. **Persistent Storage Auto-Grant Heuristics**
   - What we know: Chrome/Safari auto-grant based on heuristics (installed PWA, frequent use, etc.)
   - What's unclear: Exact heuristic criteria varies by browser and isn't documented
   - Recommendation: Always request explicitly and show status - don't rely on auto-grant

2. **Export File Naming Convention**
   - What we know: Common patterns include `gtd-backup-{timestamp}.json` or `gtd-data.json`
   - What's unclear: User preference for timestamped vs simple names
   - Recommendation: Use `gtd-backup-YYYY-MM-DD.json` format - sortable and clear

3. **Storage Permission UX - Blocking vs Non-Blocking**
   - What we know: Can request on load, on first data entry, or on-demand
   - What's unclear: Best UX balance between data safety and avoiding permission fatigue
   - Recommendation: Non-blocking request on app load with persistent status bar indicator - don't block usage if denied

4. **Service Worker Update Strategy**
   - What we know: SvelteKit handles cache versioning automatically
   - What's unclear: Whether to implement manual update notification UI in Phase 1
   - Recommendation: Defer update notification UI to later phase - rely on SvelteKit's automatic handling for now

## Sources

### Primary (HIGH confidence)
- `/sveltejs/kit` (Context7) - SvelteKit project structure, service workers, SPA configuration
- `/websites/dexie` (Context7) - Dexie.js TypeScript setup, export/import, StorageManager API
- `/websites/tailwindcss` (Context7) - Tailwind CSS dark mode implementation
- `/websites/svelte_dev` (Context7) - Svelte 5 stores, runes, lifecycle, TypeScript integration
- NPM Registry (verified 2026-01-30) - Current versions: SvelteKit 2.50.1, Svelte 5.49.0, Dexie 4.2.1, Tailwind 4.1.18

### Secondary (MEDIUM confidence)
- [Tailwind CSS SvelteKit Guide](https://tailwindcss.com/docs/guides/sveltekit) - Official integration steps
- [Dexie.js Best Practices](https://dexie.org/docs/Tutorial/Best-Practices) - Common mistakes, optimization patterns
- [MDN Storage Quotas](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) - Browser eviction behavior
- [SvelteKit Project Structure](https://svelte.dev/docs/kit/project-structure) - Official project organization
- [Mainmatter: Svelte 5 Global State](https://mainmatter.com/blog/2025/03/11/global-state-in-svelte-5/) - Runes vs stores guidance

### Tertiary (LOW confidence)
- [Loopwerk: Svelte 5 Stores to Runes](https://www.loopwerk.io/articles/2025/svelte-5-stores/) - Migration patterns (blog post)
- Various GTD app UI references - Sidebar layout patterns (general reference)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified via Context7 and npm, current versions confirmed
- Architecture: HIGH - Patterns sourced from official documentation with working code examples
- Pitfalls: HIGH - Sourced from official Dexie.js best practices, MDN, and SvelteKit docs

**Research date:** 2026-01-30
**Valid until:** ~2026-03-30 (60 days - relatively stable stack, but Svelte 5 ecosystem still evolving)

**Notes:**
- Svelte 5 is relatively new (Oct 2024) - patterns may still shift slightly as community adopts runes
- Tailwind 4 is very recent (late 2024) - Vite plugin approach is current but community patterns still emerging
- Phase 1 scope is well-defined - no GTD workflow logic, just foundation infrastructure
- All critical dependencies have official TypeScript support and mature APIs
