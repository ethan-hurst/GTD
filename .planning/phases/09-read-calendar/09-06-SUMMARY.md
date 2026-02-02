---
phase: 09-read-calendar
plan: 06
subsystem: outlook-integration
tags: [ui, settings, calendar-management, svelte, components]

dependency-graph:
  requires: ["09-02", "09-03", "09-04", "09-05"]
  provides: ["calendar-picker-ui", "settings-outlook-section"]
  affects: ["09-07"]

tech-stack:
  added: []
  patterns: ["conditional-rendering", "component-composition"]

key-files:
  created:
    - src/lib/components/OutlookCalendarPicker.svelte
  modified:
    - src/routes/settings/+page.svelte

decisions:
  - id: default-calendar-badge
    title: "Show 'Default' badge for user's default calendar"
    rationale: "Helps users identify their primary calendar in the list"
    alternatives: ["Show all calendars equally", "Use different visual indicator"]
    chosen: "Text badge with detection logic"

  - id: empty-state-guidance
    title: "Empty state prompts user to sync"
    rationale: "Calendar list is populated after first sync, not at auth time"
    alternatives: ["Auto-discover on auth", "Show loading state"]
    chosen: "Empty state with 'Click Sync Now' message"

  - id: toggle-switch-pattern
    title: "Use Tailwind-styled toggle switches for calendar enable/disable"
    rationale: "Familiar pattern from mobile OS, clear on/off state, touch-friendly"
    alternatives: ["Checkboxes", "Icon buttons"]
    chosen: "Custom toggle with blue-600 active state"

metrics:
  duration: "3.5 minutes"
  completed: "2026-02-02"
---

# Phase 09 Plan 06: Outlook Calendar Picker & Settings UI Summary

**One-liner:** Calendar picker component with toggle switches and full Outlook integration section in Settings page.

## What Was Built

### OutlookCalendarPicker Component
- **Calendar list UI**: Shows all discovered Outlook calendars with names and color dots
- **Toggle switches**: Enable/disable individual calendars (min 44px touch target)
- **Count badge**: Shows "X of Y enabled" in header
- **Default indicator**: Identifies user's default calendar
- **Empty state**: Prompts user to sync when no calendars discovered
- **Dark mode**: Full dark mode support matching Settings page style

### Settings Page Integration
- **Outlook Calendar section**: New full-width card positioned before Storage section
- **Microsoft icon**: Visual branding in section header
- **OutlookAuthButton**: Connect/disconnect account controls
- **Conditional rendering**: Calendar picker and sync controls only shown when authenticated
- **Sync controls row**: SyncStatusIndicator + OutlookSyncButton in horizontal layout
- **Auth initialization**: Added `authState.init()` in `onMount` for SSR-safe auth check

## Technical Implementation

### Component Architecture
```
Settings Page
├── OutlookAuthButton (connect/disconnect)
└── When authenticated:
    ├── OutlookCalendarPicker (calendar list)
    └── Sync Controls
        ├── SyncStatusIndicator (last sync time, status dot)
        └── OutlookSyncButton (manual sync trigger)
```

### State Management
- **outlookSyncState.calendars**: Array of SyncMeta (calendar ID, name, enabled, color)
- **outlookSyncState.toggleCalendar()**: Updates calendar enabled state and refreshes view
- **authState.isAuthenticated**: Controls visibility of calendar picker and sync controls

### UI/UX Patterns
- **Card consistency**: Matches existing Settings cards (rounded-xl, border, shadow-sm hover)
- **Responsive layout**: Single column on mobile, maintains spacing and padding patterns
- **Accessibility**: Toggle switches have ARIA role="switch", sr-only text, focus rings
- **Progressive disclosure**: Only show calendar management when user is authenticated

## Deviations from Plan

None - plan executed exactly as written.

## Verification Completed

- ✅ `npm run build` succeeds
- ✅ `npx svelte-check` passes (no new errors)
- ✅ Settings page shows "Outlook Calendar" card
- ✅ OutlookAuthButton renders in the card
- ✅ Calendar picker and sync controls appear when authenticated
- ✅ Calendar toggles call `outlookSyncState.toggleCalendar`
- ✅ Visual style matches existing Settings sections

## Integration Points

**Upstream (dependencies):**
- 09-02: `authState` for authentication state
- 09-05: `outlookSyncState`, `OutlookSyncButton`, `SyncStatusIndicator`

**Downstream (consumers):**
- Calendar view: Filtered events based on enabled calendars (via `outlookCalendarsEnabled` Set)
- Future: Calendar color customization (color field in SyncMeta already present)

## Next Phase Readiness

**Blockers:** None

**Open Questions:** None

**Recommendations:**
- 09-07 should add automatic calendar discovery after first authentication
- Consider adding calendar color picker for user customization
- Could add per-calendar sync option (currently only sync-all)

## Commits

1. **1294f87**: `feat(09-06): create OutlookCalendarPicker component`
   - Calendar list with toggle switches
   - Color dots and calendar names
   - Enable/disable functionality
   - Empty state when no calendars
   - Dark mode support

2. **252352a**: `feat(09-06): add Outlook Calendar section to Settings page`
   - Outlook Calendar card with Microsoft icon
   - OutlookAuthButton integration
   - Conditional calendar picker and sync controls
   - Auth state initialization in onMount
   - Positioned before Storage section

**Total:** 2 commits, 127 insertions

## Files Changed

```
src/lib/components/OutlookCalendarPicker.svelte (created, 82 lines)
src/routes/settings/+page.svelte (modified, +45 lines)
```

## Success Criteria Met

✅ Users can manage their Outlook integration from Settings: connect/disconnect their account, see available calendars, toggle which calendars are visible, and trigger manual sync.

All must-have truths satisfied:
- ✅ User can see a list of their Outlook calendars with toggle switches
- ✅ Disabling a calendar hides its events from the GTD calendar view
- ✅ Enabling a calendar shows its events on the GTD calendar view
- ✅ Calendar picker shows calendar names and colors
- ✅ Settings page has an Outlook Calendar section when connected
