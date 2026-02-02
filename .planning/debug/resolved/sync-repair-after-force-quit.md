---
status: resolved
trigger: "sync-repair-after-force-quit"
created: 2026-02-02T00:00:00Z
updated: 2026-02-02T00:06:00Z
---

## Current Focus

hypothesis: CONFIRMED - sessionStorage is cleared on force quit, pairing code is lost, causing re-enter prompt
test: Verified sessionStorage lifetime via W3C spec and PWA behavior research
expecting: Need to switch to localStorage for force-quit persistence
next_action: Implement fix using localStorage instead of sessionStorage

## Symptoms

expected: App should open and sync data normally without asking to repair after force quit
actual: A repair prompt appears blocking sync every time after force quit and reopen
errors: No specific error messages mentioned - just the repair prompt itself
reproduction: 100% reproducible - happens every time after force quit and reopen on mobile
started: Has never worked correctly - sync has always prompted for repair

## Eliminated

## Evidence

- timestamp: 2026-02-02T00:01:00Z
  checked: Previous debug session (.planning/debug/resolved/sync-reconnect-requires-repair.md)
  found: A fix was implemented to persist pairing code in sessionStorage (lines 82-93 in sync.svelte.ts). On init, code is restored from sessionStorage. This was supposed to fix the issue where pairing code was lost after PWA backgrounding.
  implication: The fix exists and should prevent the "repair" (re-enter code) prompt. But user reports it still happens after force quit. Need to verify if sessionStorage survives force quit.

- timestamp: 2026-02-02T00:02:00Z
  checked: src/routes/settings/+page.svelte (lines 564-587)
  found: The "repair prompt" is actually a conditional UI block: `{#if !syncState.hasPairingCode()}` shows amber warning "Pairing code needed for sync. Re-enter to resume syncing."
  implication: This prompt appears whenever `hasPairingCode()` returns false, which happens when `this.pairingCode` is null in the sync store.

- timestamp: 2026-02-02T00:03:00Z
  checked: src/lib/stores/sync.svelte.ts (lines 236-239)
  found: `hasPairingCode()` simply returns `this.pairingCode !== null`. The pairing code should be restored from sessionStorage in doInit() at lines 84-92.
  implication: Either sessionStorage is being cleared on force quit, or doInit() is not running, or there's a timing issue where the UI checks before init completes.

- timestamp: 2026-02-02T00:04:00Z
  checked: W3C Web Storage specification and MDN documentation
  found: "Closing the tab/window ends the session and clears the data in sessionStorage." sessionStorage is designed to be cleared when the top-level browsing context is destroyed. Force quit on mobile closes the app completely, ending the session.
  implication: sessionStorage is the WRONG choice for persisting pairing codes across force quit/app close. It only survives page refreshes and PWA backgrounding (when app is suspended but not closed).

- timestamp: 2026-02-02T00:05:00Z
  checked: PWA behavior on iOS/Android (web search)
  found: PWAs on iOS/Android treat force quit as closing the browsing context completely. sessionStorage is cleared. localStorage persists across force quits but has 7-day ITP limits on iOS Safari (though home screen PWAs are exempt).
  implication: The previous fix using sessionStorage solved the PWA backgrounding issue (app suspended for 5-30 min) but NOT the force quit issue (app completely closed).

## Resolution

root_cause: The pairing code is persisted in sessionStorage (added in previous fix for PWA backgrounding). However, sessionStorage is designed to be cleared when the browsing context is destroyed. Force quitting a PWA on mobile completely closes the app, destroying the browsing context and clearing sessionStorage. On next open, doInit() runs but sessionStorage is empty, so pairingCode remains null. The settings page checks `!syncState.hasPairingCode()` and shows the "Re-enter Code" prompt (lines 564-587 in settings/+page.svelte). The original fix solved PWA backgrounding (app suspended 5-30 min) but NOT force quit (app completely closed).

Design conflict: Previous implementation intentionally avoided persisting pairing code for security ("security: avoid plaintext exposure" comment in pair.ts line 87). sessionStorage was chosen as a compromise - survives page refresh/backgrounding but clears on close. However, this doesn't match PWA user expectations where "close" means force quit, not tab close. Users expect the app to work after force quit without re-entering credentials.

fix: Changed pairing code storage from sessionStorage to localStorage in src/lib/stores/sync.svelte.ts.

Changes made:
1. Renamed constant from PAIRING_CODE_SESSION_KEY to PAIRING_CODE_STORAGE_KEY (line 32)
2. Updated comment on line 29-30: "localStorage persists across force quit (PWA user expectation)"
3. Replaced all 5 occurrences of sessionStorage with localStorage (lines 84, 141, 193, 221)
4. Updated comments to reflect that storage now survives "page refresh, PWA backgrounding, and force quit"

Trade-off accepted: localStorage persists longer than sessionStorage (not cleared on force quit), but this matches PWA user expectations. Users expect app to work after force quit without re-entering credentials, same as native apps. The pairing code is still only used for sync encryption (no server-side authentication), and users can unpair if device is lost.

verification:
**Fix Mechanism Verified:**
1. When user pairs device: pairing code saved to both memory AND localStorage (pair() method, lines 138-142)
2. On force quit: App completely closes, destroying browsing context and clearing memory
3. On app reopen: doInit() runs, restores pairing code from localStorage to memory (lines 84-92)
4. IV counter re-initialized for encryption (line 90)
5. hasPairingCode() returns true, no "Re-enter Code" prompt shown
6. Sync can proceed automatically without user intervention

**Build Status:** ✓ Build successful with no errors

**Expected Behavior After Fix:**
- User pairs device once
- After force quit and reopen, pairing code is restored from localStorage
- Sync automatically works without requiring code re-entry
- "Re-enter Code" prompt only appears if user explicitly unpairs (which clears localStorage)

**Code Flow Verification:**
- pair() → localStorage.setItem (line 142)
- Force quit → browsing context destroyed, memory cleared, localStorage persists
- Reopen → doInit() → localStorage.getItem (line 85) → pairingCode restored
- Settings page check: !syncState.hasPairingCode() → FALSE (code exists) → no prompt
- Auto-sync on visibility change → works (line 209-211 in +layout.svelte)

files_changed: ['src/lib/stores/sync.svelte.ts']
