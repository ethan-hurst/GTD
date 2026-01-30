# Phase 3: Next Actions & Contexts - Context

**Gathered:** 2026-01-30
**Status:** Ready for planning

<domain>
## Phase Boundary

View and complete next actions filtered by context (@computer, @office, @phone, @home, @errands, plus custom). Users can switch contexts, complete actions, assign actions to projects, and manage their context list. This is the primary daily working view. Completion tracking/summaries and project management are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Context system design
- Contexts appear as nav items in the left sidebar (like folders). Click to filter.
- Ship with GTD defaults pre-created: @computer, @office, @phone, @home, @errands. User can rename, delete, or add more.
- Multi-select contexts supported — user can activate multiple contexts at once (e.g., @computer + @home for working from home).
- New contexts created via '+' button at bottom of context list in sidebar. Type name, pick optional icon/color, done.

### Action list experience
- Medium density: title, context tag, project name (if any), and age/date per action.
- Default sort: oldest first (FIFO), consistent with inbox. Users can also drag-to-reorder for manual priority.
- "All" view groups actions by context under headings (@computer, @phone, etc.).
- Inline title editing by clicking the title. Full editing (context, project, notes) via detail panel.

### Task completion flow
- Brief fade-out animation (~1 second): strikethrough + fade, then removal from list. Satisfying visual feedback.
- Toast notification with undo button after completion ("Action name" completed — Undo). 5-second window.
- Batch completion supported: multi-select checkboxes + "Complete selected" action.
- completedAt timestamp stored on each action (for future completion tracking).

### Project association
- Subtle colored tag/badge showing project name on the action row. Doesn't dominate the title.
- Project badge is clickable — navigates to that project's detail view.
- Actions without a project have no distinction — no badge, no empty slot. Clean list.

### Claude's Discretion
- Whether completing a project-linked action prompts to add the next action for that project (GTD best practice vs. simplicity)
- Project assignment UI pattern (dropdown vs type-to-search) — pick what fits existing patterns
- Exact animation timing and easing for completion fade-out
- Empty state design for a context with no actions
- Detail panel layout and field arrangement

</decisions>

<specifics>
## Specific Ideas

- Contexts in sidebar should feel like the existing sidebar navigation — consistent with the app shell from Phase 1
- Multi-select for contexts mirrors multi-select pattern already built for inbox items in Phase 2
- Drag-to-reorder should feel natural — similar to Todoist or Linear's drag behavior
- "All" view with context groupings helps during weekly review to see everything at a glance

</specifics>

<deferred>
## Deferred Ideas

- Completion tracking: daily/weekly summary of completed actions — shows user what they got done (new capability, future phase)
- Completion stats: track how much people have done per day and per week with summary view

</deferred>

---

*Phase: 03-next-actions-contexts*
*Context gathered: 2026-01-30*
