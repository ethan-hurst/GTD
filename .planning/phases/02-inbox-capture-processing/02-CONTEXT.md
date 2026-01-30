# Phase 2: Inbox Capture & Processing - Context

**Gathered:** 2026-01-30
**Status:** Ready for planning

<domain>
## Phase Boundary

User can capture thoughts quickly and process them through guided GTD workflow. Captures go to an inbox, where items are processed one-by-one through the GTD decision tree (actionable? 2-min rule? delegate? defer? trash?) and routed to appropriate lists. Cross-item search is available. Creating the destination lists themselves (next actions, projects, etc.) belongs to later phases — this phase routes items to them.

</domain>

<decisions>
## Implementation Decisions

### Capture experience
- Inline input at the top of the inbox page (not a modal or slide-in panel)
- Global keyboard shortcut navigates to inbox and focuses the input from any page
- Brief "Captured" confirmation (subtle toast or inline flash), then input clears for next entry
- Input stays focused after capture for rapid sequential entry

### Claude's Discretion: Capture fields
- Claude decides what fields are available at capture time (title only vs title + optional note)
- GTD principle: capture should be frictionless, process later

### Inbox list view
- Sort: oldest first (FIFO — process in order captured, prevents items from lingering)
- Each item shows: title, relative timestamp ("2 hours ago"), and first line of notes if any
- Multi-select supported with checkboxes for bulk delete/trash actions
- Sidebar badge shows unprocessed item count, only when non-zero

### Processing workflow
- Two entry points: click any item to process individually, OR "Process Inbox" button for sequential mode
- Processing flow appears as inline expansion within the inbox list (item expands to show options below it)
- Step-by-step GTD decision tree with button choices: "Is this actionable?" → Yes/No → follow-up questions based on answer
- After routing an item, auto-advance to the next inbox item (item disappears with brief animation, next expands)

### Search behavior
- Persistent search field in the app top bar, available from any page
- Scope: active items only (inbox, next actions, projects, waiting for) — excludes completed and someday/maybe
- Results appear in a dropdown below the search field, click to navigate
- Live filtering as user types (instant feedback, works well with local IndexedDB data)

### Claude's Discretion
- Exact keyboard shortcut key choice (likely Cmd+N or similar)
- Animation timing and style for item transitions
- Processing flow button styling and layout
- Search result grouping and ordering within dropdown
- Empty inbox celebration/state (e.g., "Inbox Zero" message)

</decisions>

<specifics>
## Specific Ideas

No specific references — open to standard approaches. User wants the GTD methodology implemented faithfully with a focus on speed (capture within 2 seconds) and a FIFO processing flow that encourages clearing items in order.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-inbox-capture-processing*
*Context gathered: 2026-01-30*
