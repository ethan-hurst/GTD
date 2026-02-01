---
status: resolved
trigger: "pairing-constraint-error"
created: 2026-02-01T00:00:00Z
updated: 2026-02-01T00:00:06Z
---

## Current Focus

hypothesis: The settings table has a unique index that is receiving duplicate key values during bulkPut operation when pairing devices
test: Find settings table schema definition and the bulkPut call during sync/pairing
expecting: Schema will reveal which index is unique and causing conflict; sync code will show what data is being inserted
next_action: Search for Dexie database schema definition and settings table indexes

## Symptoms

expected: Pairing should complete successfully, syncing settings between devices
actual: Error thrown: "settings.bulkPut(): 2 of 11 operations failed. Error: ConstraintError: Index key is not unique"
errors: ConstraintError - Index key is not unique on settings table bulkPut operation. 2 of 11 operations fail.
reproduction: Attempt to pair two devices using the sync/pairing feature
started: Current issue, likely related to recent sync changes

## Eliminated

## Evidence

- timestamp: 2026-02-01T00:00:01Z
  checked: Database schema (src/lib/db/schema.ts)
  found: settings table has unique index on 'key' field - defined as "++id, &key, updatedAt" where & means unique
  implication: bulkPut will fail if multiple records have same 'key' value

- timestamp: 2026-02-01T00:00:02Z
  checked: Sync import logic (src/lib/sync/sync.ts lines 38-52)
  found: importFromSync() clears table then calls bulkPut(mergedData[tableName])
  implication: The merged data contains duplicate 'key' values in settings array

- timestamp: 2026-02-01T00:00:03Z
  checked: Sync flow (sync.ts performSync function)
  found: Line 125 calls mergeData(localData, remoteData) to combine local and remote settings
  implication: The merge logic may be creating duplicates instead of deduplicating by unique key

- timestamp: 2026-02-01T00:00:04Z
  checked: Merge logic (merge.ts mergeTable function)
  found: mergeTable uses record.id as the merge key (line 74-88) - works for items, contexts, events
  implication: For settings table, id is auto-increment primary key but 'key' field is the unique business key

- timestamp: 2026-02-01T00:00:05Z
  checked: Settings operations (operations.ts setSetting)
  found: Each device generates its own auto-increment id when calling setSetting - same 'key' gets different ids on each device
  implication: Device A has {id:1, key:'sync-iv-counter'}, Device B has {id:1, key:'sync-iv-counter'} - merge keeps both because ids match, bulkPut fails on duplicate 'key'

## Resolution

root_cause: The mergeTable function merges records by 'id' field, which works for most tables but fails for settings table. Settings table uses auto-increment id as primary key but has a unique index on the 'key' field. When Device A has existing settings (e.g. {id:1, key:'onboarding'}, {id:2, key:'feature_x'}, {id:3, key:'sync-pairing'}) and Device B creates fresh settings (e.g. {id:1, key:'sync-pairing'}, {id:2, key:'sync-iv-counter'}), the merge by id causes id:1 from Device B to replace id:1 from Device A, resulting in two records with key:'sync-pairing' (the new id:1 and the original id:3). When bulkPut tries to insert this merged array, it violates the unique constraint on 'key', causing "2 of 11 operations failed" error.

fix: Modified mergeTable to accept a keyFn parameter for custom merge key extraction. Added special handling in mergePayloads to merge settings table by 'key' field instead of 'id'. This ensures settings with the same logical key are deduplicated correctly, preventing constraint violations.

verification: TypeScript compilation passes with no errors. Code review confirms the fix correctly deduplicates settings by key field, resolving the constraint error. The fix preserves Last-Write-Wins semantics based on updatedAt timestamps.

files_changed: ['src/lib/sync/merge.ts']
