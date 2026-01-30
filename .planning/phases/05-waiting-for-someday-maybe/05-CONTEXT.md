# Phase 5: Waiting For & Someday/Maybe - Context

**Gathered:** 2026-01-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Track delegated items awaiting others' action (waiting-for) and park future ideas without cluttering active lists (someday/maybe). Users can add items to both lists, resolve waiting-for items, promote someday/maybe items to active work, and navigate to both lists via keyboard shortcuts. Weekly review integration is a separate phase.

</domain>

<decisions>
## Implementation Decisions

### Waiting-for tracking
- Rich item model: title + person delegated to + date delegated + follow-up date
- Optional project link (same pattern as next actions)
- Resolving a waiting-for item marks it complete and archives it — no follow-up prompt
- No sidebar badge for waiting-for — it's a review-time concern, not urgent

### Someday/Maybe organization
- Categorized by type with predefined categories (e.g., Projects, Learning, Travel, Hobbies)
- User cannot create custom categories — ship sensible defaults
- Processing flow does NOT ask for category — categorize later (keeps processing fast)
- Direct add from the someday/maybe list page (quick brain dump), not just processing flow

### List presentation
- Instructional empty states: teach the GTD flow ("No waiting-for items yet. Use processing to delegate tasks." style)
- No sidebar count badges for either list

### Processing integration
- Keyboard shortcuts: 'w' for waiting-for, 's' for someday/maybe (follows 'n' for actions, 'p' for projects pattern)
- Someday/maybe reachable via processing ("not actionable → incubate") AND direct add from list page

### Claude's Discretion
- Overdue waiting-for treatment (visual highlight, sorting, or both)
- Navigation structure (separate sidebar items vs grouped)
- Detail panel vs inline editing for these lists
- Promotion flow: whether someday/maybe becomes a project, next action, or user chooses
- Item detail level for someday/maybe (title-only vs title + optional notes)
- Best GTD-aligned delegate step in processing flow (person only vs person + follow-up date inline)

</decisions>

<specifics>
## Specific Ideas

- User wants the delegate step to follow "whatever is the best GTD flow" — research GTD methodology for delegation handling
- Keyboard shortcuts should mirror the single-key pattern: 'n' (actions), 'p' (projects), 'w' (waiting), 's' (someday)
- Predefined someday/maybe categories — pick sensible GTD-aligned defaults

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-waiting-for-someday-maybe*
*Context gathered: 2026-01-30*
