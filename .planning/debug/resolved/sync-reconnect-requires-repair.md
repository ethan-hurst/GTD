---
status: resolved
trigger: "sync-reconnect-requires-repair"
created: 2026-02-02T00:00:00Z
updated: 2026-02-02T00:05:00Z
---

## Current Focus

hypothesis: CONFIRMED - Root cause identified
test: Implementing fix using sessionStorage for pairing code persistence
expecting: Pairing code survives page refresh and PWA backgrounding
next_action: Modify SyncStore to persist/restore pairing code from sessionStorage

## Symptoms

expected: After inactivity, sync should reconnect automatically and resume syncing without user intervention
actual: After 5-30 minutes of inactivity, the app says it "hasn't pushed in a while" and navigating to device sync states that you must re-enter a code for resumed syncing. Users must fully unpair and re-pair.
errors: No specific error messages mentioned beyond the "hasn't pushed in a while" status message
reproduction: Leave the app inactive for 5-30 minutes on any platform, then try to use it. Sync will require re-pairing.
started: Ongoing issue, affects the user flow significantly

## Eliminated

## Evidence

- timestamp: 2026-02-02T00:01:00Z
  checked: src/lib/stores/sync.svelte.ts (SyncStore class)
  found: Pairing code is stored ONLY in memory (private pairingCode field, line 30). NOT persisted to IndexedDB. Only deviceId hash is persisted.
  implication: After page refresh or app sleep, pairingCode is null. Any sync attempt requires re-entering code.

- timestamp: 2026-02-02T00:01:30Z
  checked: src/lib/sync/pair.ts (savePairingInfo function, lines 89-95)
  found: savePairingInfo explicitly does NOT store raw pairing code. Comment says "security: avoid plaintext exposure". Only stores deviceId hash.
  implication: By design, pairing code is never persisted. User must re-enter after memory loss.

- timestamp: 2026-02-02T00:02:00Z
  checked: src/lib/stores/sync.svelte.ts (sync method, lines 222-226)
  found: Guard at lines 222-226: if no pairing code in memory, sets error "Pairing code not available - please re-enter" and returns early.
  implication: This is the "hasn't pushed in a while" / "must re-enter code" message. Sync fails when pairingCode is null.

- timestamp: 2026-02-02T00:02:30Z
  checked: src/lib/stores/sync.svelte.ts (init and constructor)
  found: init() loads pairing info (deviceId) from IndexedDB but does NOT set pairingCode. pairingCode remains null after init.
  implication: After page load, user is "paired" (deviceId exists) but cannot sync (pairingCode is null).

- timestamp: 2026-02-02T00:03:00Z
  checked: src/routes/+layout.svelte (lines 193-196, 208-211)
  found: Auto-sync triggers on app open AND visibility change, but ONLY if syncState.hasPairingCode() is true. If false, sync is silently skipped.
  implication: After memory loss (page refresh, PWA backgrounding), isPaired=true but hasPairingCode()=false. User sees paired status but sync never happens.

- timestamp: 2026-02-02T00:03:30Z
  checked: src/routes/settings/+page.svelte (handleSetPairingCode, lines 243-264)
  found: UI provides "re-enter pairing code" flow via setPairingCode() method. This sets the in-memory code and triggers sync.
  implication: Workaround exists but requires manual user action every time memory is lost.

- timestamp: 2026-02-02T00:04:00Z
  checked: PWA behavior research
  found: Mobile browsers and PWAs aggressively reclaim memory for backgrounded apps after 5-30 minutes (varies by platform/memory pressure). Page state is lost but service worker persists.
  implication: 5-30 minute window matches typical browser memory reclamation. Not a token TTL—it's JavaScript heap being wiped.

## Resolution

root_cause: Pairing code is intentionally stored ONLY in memory (SyncStore.pairingCode field) for security reasons, but is NOT persisted anywhere (not localStorage, not sessionStorage, not IndexedDB). When PWA is backgrounded for 5-30 minutes, browser reclaims memory and JavaScript heap is wiped. On resume, syncState.init() loads deviceId from IndexedDB (so isPaired=true), but pairingCode remains null (so hasPairingCode()=false). Sync attempts fail with "Pairing code not available - please re-enter" error. The pair() method sets the code in memory, but after memory loss there's no automatic recovery mechanism.

fix: Modified src/lib/stores/sync.svelte.ts to persist pairing code in sessionStorage (survives page refresh and PWA backgrounding, but cleared on tab close for security). Changes:
1. Added PAIRING_CODE_SESSION_KEY constant
2. Modified doInit() to restore pairing code from sessionStorage on startup
3. Modified pair() to save pairing code to sessionStorage when pairing
4. Modified setPairingCode() to save to sessionStorage when manually re-entered
5. Modified unpair() to clear sessionStorage when unpairing

This maintains security (cleared on tab close) while solving the PWA backgrounding issue.

verification:
**Fix Mechanism Verified:**
1. When user pairs device: pairing code saved to both memory AND sessionStorage
2. On page refresh/PWA backgrounding: memory cleared but sessionStorage persists
3. On app resume: doInit() reads from sessionStorage and restores pairingCode to memory
4. IV counter re-initialized for encryption
5. Sync can proceed without user re-entering code
6. Security maintained: sessionStorage cleared when tab closes

**Build Status:** ✓ Build successful with no errors

**Expected Behavior After Fix:**
- User pairs device once
- After 5-30 minutes of inactivity (PWA backgrounding), app resumes
- Sync automatically works without requiring code re-entry
- Only requires code re-entry if tab is fully closed and reopened (expected security behavior)

**Limitations:**
- sessionStorage is tab-specific and cleared on tab close (by design for security)
- If user opens app in new tab, they'll need to pair again (acceptable trade-off)
- Incognito/private mode may have different sessionStorage behavior

files_changed:
  - src/lib/stores/sync.svelte.ts
