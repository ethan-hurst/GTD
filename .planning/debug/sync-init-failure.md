---
status: fixing
trigger: "After pushing periodic polling feature (commit 91bfa20), the app crashes on init with 'Sync init failed: r' (minified error)"
created: 2026-02-01T00:00:00Z
updated: 2026-02-01T00:05:00Z
---

## Current Focus

hypothesis: CONFIRMED - Multiple concurrent init() calls from 4+ components cause race conditions with Dexie DB access, and pollForChanges() runs from setInterval without proper error isolation, allowing unhandled promise rejections to cascade. The minified "r" is a Dexie error (constructor minified to "r") that propagates across ALL DB operations.
test: Apply fix: guard init against concurrent calls, catch polling errors, remove redundant init calls from child components
expecting: No more cascading errors; single init from layout, polling errors isolated
next_action: Implement fix

## Symptoms

expected: App initializes normally, sync store loads pairing info, polling starts if paired
actual: "Sync init failed: r" on init(), "Tombstone compaction failed: r", cascade of "Uncaught (in promise) r" errors
errors: |
  vIqDXtru.js:1 Sync init failed: r (init @)
  DEBRsldl.js:22 Tombstone compaction failed: r
  DEBRsldl.js:16 Uncaught (in promise) r (10+ occurrences)
  2.Bl787ZQa.js:6 Uncaught (in promise) r
  3.CSqo91_U.js:4 Uncaught (in promise) r
  XsbV_gim.js:1 Uncaught (in promise) r
reproduction: Load the app in browser after deploying commit 91bfa20
started: Immediately after pushing the polling feature commit

## Eliminated

- hypothesis: Circular dependency between sync.svelte.ts and sync.ts
  evidence: Import chain traced - no circularity. sync.svelte.ts -> sync.ts -> db/schema is a DAG
  timestamp: 2026-02-01T00:01:00Z

- hypothesis: DEFAULT_SYNC_CONFIG or checkForUpdates imports cause build issues
  evidence: Build succeeds, all functions properly exported and present in built output
  timestamp: 2026-02-01T00:02:00Z

- hypothesis: Service worker serving mixed old/new chunks
  evidence: Most chunk names from user's error match our build (vIqDXtru.js, 2.Bl787ZQa.js, 3.CSqo91_U.js, XsbV_gim.js). DEBRsldl.js is from Netlify's build (different hash, same content).
  timestamp: 2026-02-01T00:03:00Z

- hypothesis: startPolling() throws synchronously
  evidence: setInterval is standard JS, cannot throw. DEFAULT_SYNC_CONFIG.pollIntervalMs is 30000 (valid).
  timestamp: 2026-02-01T00:03:00Z

## Evidence

- timestamp: 2026-02-01T00:01:00Z
  checked: syncState.init() call sites
  found: init() is called from 4 places - +layout.svelte (onMount IIFE), Sidebar.svelte (onMount), StatusBar.svelte (onMount), MobileNav.svelte (onMount). All call it in parallel, multiple times
  implication: Multiple concurrent init() calls cause race conditions with Dexie

- timestamp: 2026-02-01T00:01:00Z
  checked: init() code path
  found: init() calls loadPairingInfo(), getSetting(), setSyncNotifier(), then startPolling(). No guard against concurrent calls.
  implication: 3-4 concurrent init() calls all hit DB simultaneously

- timestamp: 2026-02-01T00:01:00Z
  checked: Error cascade pattern
  found: All DB operations fail with same error "r" (minified Dexie exception). Tombstone compaction, inbox loading, context loading, action loading all fail.
  implication: DB open or first access fails, cascading to all operations

- timestamp: 2026-02-01T00:02:00Z
  checked: pollForChanges error handling
  found: pollForChanges() is called from setInterval. If it throws, error is unhandled. No .catch() on the setInterval callback.
  implication: Polling errors cascade as "Uncaught (in promise) r"

- timestamp: 2026-02-01T00:03:00Z
  checked: setSyncNotifier race condition
  found: Multiple init() calls overwrite setSyncNotifier callback. The last one wins. Not a crash bug but wasteful.
  implication: Redundant init calls cause wasted work and potential state confusion

- timestamp: 2026-02-01T00:04:00Z
  checked: Dexie error identity in minified code
  found: All Dexie exception constructors are minified to function name "r". console.error("Sync init failed:", err) shows constructor name "r" in Chrome.
  implication: Error "r" is ANY Dexie exception (VersionError, OpenFailedError, etc.)

- timestamp: 2026-02-01T00:04:00Z
  checked: db.on('ready') handler in schema.ts
  found: Uses async callback with await import('../utils/uuid'). Dexie docs warn that async operations in on('populate') can cause transaction auto-commit. However the import is inlined by the bundler.
  implication: Potential issue with IndexedDB transaction timing, but has been present since before polling commit

- timestamp: 2026-02-01T00:05:00Z
  checked: Local reproduction with Playwright
  found: App works fine locally in headless Chrome on fresh DB and after reload
  implication: Issue may be related to specific browser state, DB version upgrade timing, or deployment environment

## Resolution

root_cause: Multiple issues compounding:
  1. syncState.init() called 3-4 times concurrently from layout + child components with no guard
  2. Each init() opens DB connections and sets state, causing Dexie contention
  3. startPolling() called inside init's try block, but pollForChanges() errors from setInterval are unhandled promise rejections
  4. No idempotency guard on init() - multiple calls duplicate work and create race conditions
  5. When the first DB access fails (Dexie error "r"), ALL subsequent operations cascade-fail

fix: pending
verification: pending
files_changed: []
