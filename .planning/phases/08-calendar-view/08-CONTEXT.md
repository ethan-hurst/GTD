# Phase 8: Calendar View - Context

**Gathered:** 2026-01-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Read-only calendar showing the user's hard landscape (time-specific commitments) for daily planning reference. Users can create events manually and import .ics files. The calendar helps answer "what can I do now given my schedule?" by showing time blocks alongside next actions. Calendar sync (live URL subscriptions, two-way sync) is out of scope.

</domain>

<decisions>
## Implementation Decisions

### Event data model
- Events have standard fields: title, start time, end time, location, notes
- Data sources: manual entry within app AND .ics file import (upload)
- Basic recurrence supported: daily, weekly, monthly repeats
- No live URL subscription sync — .ics file upload only for imports
- Events stored locally in IndexedDB alongside GTD data

### Calendar layout
- Three views available: day, week, month
- Default view: today (day view) — immediately actionable on open
- Events displayed as time-block bars spanning their duration (Google Calendar style)
- User-assigned colors per event or per calendar source (e.g., work vs personal)

### Relationship to GTD lists
- Side panel alongside calendar shows next actions for planning context
- Events can optionally link to a project (e.g., "Sprint review" → "Website redesign" project)
- Processing flow gains new option: "Is this time-specific? → Add to calendar" alongside existing defer/delegate paths
- Calendar is a reference tool — it informs what to work on between commitments

### Event creation & interaction
- Two creation methods: click on time slot in grid OR quick-add form
- Full drag support: drag events to reschedule, drag edges to resize duration
- Click event to open detail/edit form

### Claude's Discretion
- Side panel content strategy (today's actions, context-filtered, or hybrid)
- Empty state design (consistent with existing app patterns)
- Quick-add form input approach (natural language parsing vs structured fields — decide based on complexity/UX tradeoff)
- .ics import UI flow details
- Recurrence editing UX (edit single occurrence vs all)
- Calendar navigation controls and today button placement

</decisions>

<specifics>
## Specific Ideas

- Time-block bars like Google Calendar — familiar visual pattern for showing schedule density
- Day view as default aligns with GTD "what's on my plate today?" mindset
- Processing flow integration makes calendar a first-class GTD tool, not a bolt-on
- Side panel concept: calendar shows hard landscape, panel shows available actions — the two things GTD says you need for in-the-moment decisions

</specifics>

<deferred>
## Deferred Ideas

- Live calendar URL subscription (Google Calendar sync) — future enhancement
- Two-way sync with external calendars — requires auth, out of scope
- Notifications/reminders for upcoming events — separate concern
- All-day events / multi-day events — could be added later if needed

</deferred>

---

*Phase: 08-calendar-view*
*Context gathered: 2026-01-30*
