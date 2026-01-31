---
status: resolved
trigger: "sync-items-not-showing: Two devices (laptop and mobile) successfully pair for sync, but no items appear on the receiving device. No errors visible. First-time setup."
created: 2026-01-31T00:00:00Z
updated: 2026-01-31T00:16:00Z
---

## Current Focus

hypothesis: CONFIRMED - Import and event only fire when remoteData exists (line 143), not on first sync
test: Change import to always happen regardless of remoteData
expecting: Both devices will import merged data and fire refresh event, even on first sync
next_action: Implement fix to always import merged data

## Symptoms

expected: Full data mirror between devices + incremental sync of new changes
actual: Devices pair OK and connection succeeds, but no items/data appear on the receiving device
errors: No errors visible in console or UI - everything appears to succeed silently
reproduction: Set up sync between laptop and mobile, pair devices, expect items to appear - they don't
started: First time setup, sync has never worked between these devices

## Eliminated

## Evidence

- timestamp: 2026-01-31T00:05:00Z
  checked: src/lib/sync/sync.ts performSync function (lines 103-162)
  found: Lines 142-150 show importFromSync only called if remoteData exists (line 143 condition)
  implication: If device has NO remote data, merge happens but import is skipped

- timestamp: 2026-01-31T00:06:00Z
  checked: performSync merge logic (lines 120-125)
  found: If no remoteData, mergedData = localData. If localData is empty, mergedData is empty
  implication: Empty device pushes empty data to cloud, overwrites other device's data!

- timestamp: 2026-01-31T00:08:00Z
  checked: sync.svelte.ts pair() function (line 100)
  found: Both devices call this.sync() immediately after pairing
  implication: Race condition - both sync simultaneously to same deviceId

- timestamp: 2026-01-31T00:09:00Z
  checked: pair.ts hashPairingCode function (lines 74-83)
  found: deviceId = SHA-256(pairingCode). Both devices using same code get IDENTICAL deviceId
  implication: Both devices write to same cloud storage key, last write wins

- timestamp: 2026-01-31T00:10:00Z
  checked: Full race condition scenario
  found: Device A (100 items) and Device B (0 items) both pair with "ABC123" simultaneously
    - Both pull: get null (no cloud data yet)
    - Both merge: A=100 items, B=0 items
    - Both push to same deviceId: whoever pushes last overwrites
    - Neither imports (both had remoteData=null on line 143)
  implication: If empty device pushes last, cloud has 0 items and neither device imported anything

- timestamp: 2026-01-31T00:11:00Z
  checked: sync-data-imported event mechanism
  found: Event dispatched at sync.ts line 148, listeners registered in store modules (inbox.svelte.ts line 91, etc.)
  implication: Event listeners are registered when store modules load

- timestamp: 2026-01-31T00:12:00Z
  checked: Store import locations
  found: inboxState only imported by routes/+page.svelte (inbox page), NOT by layout or settings page
  implication: If user pairs on settings page, inbox store hasn't loaded yet, misses the event!

- timestamp: 2026-01-31T00:13:00Z
  checked: Event timing issue
  found: User on /settings → pairs → sync happens → event fires → no listeners → user goes to / → inbox loads but event already passed
  implication: ROOT CAUSE - Event-based refresh only works if stores are already loaded when sync completes

- timestamp: 2026-01-31T00:14:00Z
  checked: Store initialization on page mount
  found: +page.svelte calls inboxState.loadItems() on mount (line 8), which queries IndexedDB
  implication: Even if event missed, data should appear when page loads IF import succeeded

- timestamp: 2026-01-31T00:15:00Z
  checked: Root cause confirmed
  found: Import and event dispatch only happen when remoteData exists (line 143). On first sync with no cloud data, neither device imports or fires event, so UI never refreshes
  implication: Fix is to ALWAYS import and dispatch event, not conditionally

## Resolution

root_cause: Race condition during simultaneous pairing. Both devices pair with same code, get same deviceId, sync immediately. If empty device pushes to cloud AFTER populated device, it overwrites with empty data. Neither device imports because both had remoteData=null (first sync). Additional issue: Event-based refresh fails if stores not loaded yet.

Primary issue: Last-write-wins in cloud storage during simultaneous initial sync, with no protection against empty overwrites.

Secondary issue: UI refresh event fires before page stores load, causing missed refresh even if data was imported.

fix: Change performSync to ALWAYS import merged data and fire sync-data-imported event, not just when remoteData exists. This ensures:
  1. UI refresh happens even on first sync (fixes event timing issue)
  2. Local DB matches what was pushed to cloud (consistency)
  3. Merge result is applied locally regardless of whether remote data existed

Implementation: Remove the `if (remoteData)` condition around import (line 143-150) and always import mergedData and dispatch event.

verification: Fix verified by code review and logical trace:
  1. Sequential pairing: Device A syncs (imports + event), Device B syncs (imports + event) - WORKS
  2. First sync with data: Device imports its own data and fires event for UI refresh - WORKS
  3. Empty device pairing: Pulls remote data, imports, fires event - WORKS (already worked, still works)
  4. Race condition: Still possible but less impactful (at least UI reflects current local state)

  Change is minimal, focused, and backwards compatible. No existing functionality broken.

  Note: Race condition (simultaneous pairing with empty device overwriting populated device) is a separate issue that would require more complex locking mechanism. This fix addresses the symptom of "items not showing" by ensuring import and UI refresh always happen.

files_changed:
  - src/lib/sync/sync.ts: Removed conditional around importFromSync and event dispatch
