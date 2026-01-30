# GTD Planner

## What This Is

A web-based personal productivity app that implements the full Getting Things Done (GTD) methodology. It helps a single user capture everything on their plate, process it into actionable items, and always know what to work on next. Designed for someone adopting GTD for the first time in a corporate environment with Microsoft tools.

## Core Value

Nothing falls through the cracks — every commitment is captured, clarified, and surfaced at the right time so the user always knows what to do next.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Inbox capture — quick entry for thoughts, tasks, and commitments as they come up
- [ ] Processing workflow — clarify inbox items into actionable next steps or reference
- [ ] Next actions list — filtered by context (e.g., @computer, @phone, @office, @errands)
- [ ] Projects list — track multiple concurrent projects (formal deliverables and areas of responsibility)
- [ ] Waiting-for list — track delegated items and things blocked on others
- [ ] Someday/maybe list — park ideas that aren't actionable now
- [ ] Weekly review — guided walkthrough to keep the system current
- [ ] Two-way Outlook/Teams calendar sync — tasks with dates appear on calendar, calendar events visible in planner

### Out of Scope

- Team/manager visibility — this is a personal tool; progress is reported separately
- Mobile native app — web-first, accessible from browser on any device
- Email integration (auto-capture from Outlook inbox) — manual capture is sufficient for v1

## Context

- User is new to GTD methodology, recommended by manager to improve performance at work
- Work involves a mix of meeting-driven action items and longer-term project deliverables
- Corporate Microsoft environment (Outlook calendar, Teams)
- Used as a browser tab open alongside work tools throughout the day
- Calendar integration is important but can come after the core GTD system is solid
- The tool should make GTD approachable — guide the user through the methodology, not assume expertise

## Constraints

- **Platform**: Web application — runs in browser alongside Outlook/Teams
- **Integration**: Microsoft Graph API for Outlook/Teams calendar sync (deferred to later phase)
- **Audience**: Single user — no multi-tenancy, auth can be simple
- **GTD fidelity**: Must implement the full GTD system (inbox, next actions, contexts, projects, waiting-for, someday/maybe, weekly review)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Web app over desktop app | User wants browser tab alongside work tools | — Pending |
| Full GTD over simplified version | User wants the complete methodology | — Pending |
| Core GTD first, calendar sync later | Reduce complexity of initial build; get the system working before integrations | — Pending |
| Personal only, no sharing | User reports progress separately; simplifies auth and data model | — Pending |

---
*Last updated: 2026-01-30 after initialization*
