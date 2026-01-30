# Phase 1: Foundation & Storage - Context

**Gathered:** 2026-01-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Offline-first data persistence and reliability. User's GTD data is stored reliably in the browser using IndexedDB, protected from eviction with persistent storage. Includes data export/import, storage status indicator, and a basic app shell with empty state. No GTD workflow logic — just the foundation.

</domain>

<decisions>
## Implementation Decisions

### App shell & layout
- Claude decides layout structure (sidebar + main area is typical for this type of app)
- Professional visual style — clean, modern, productivity-focused
- Dark mode and light mode with system preference detection and manual toggle
- Empty state: minimal and functional — show the empty inbox with a clear capture input, no fanfare

### Data export
- JSON file format for export
- Export accessible from a settings page (not prominent, but findable)
- Full round-trip: export AND import/restore capability in this phase
- Filename convention: Claude's discretion

### Storage status indicator
- Dedicated status bar (not just an icon) showing storage state
- Shows: persistence status, quota used, last successful save time
- Visible on all views as a footer bar — always know your data status
- Permission handling when persistence isn't granted: Claude's discretion (balance data safety with usability)

### Tech stack
- Svelte (frontend framework)
- Tailwind CSS (styling)
- TypeScript (language)
- IndexedDB via Dexie.js (local storage)

### Claude's Discretion
- App layout structure (sidebar + main recommended for GTD apps)
- Export filename convention (timestamped vs simple)
- Storage permission handling approach (blocking vs non-blocking)
- Loading states and error handling
- Exact spacing, typography, and color palette within "professional" direction

</decisions>

<specifics>
## Specific Ideas

- Professional feel — not playful, not corporate. Think Linear or Vercel dashboard territory.
- Empty state should be functional, not decorative — just show the interface ready to use.
- User wants full data ownership visibility (status bar on every page).
- Export + import from day one — data portability is a first-class concern.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-foundation-storage*
*Context gathered: 2026-01-30*
