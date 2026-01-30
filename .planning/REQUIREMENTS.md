# Requirements: GTD Planner

**Defined:** 2026-01-30
**Core Value:** Nothing falls through the cracks — every commitment is captured, clarified, and surfaced at the right time so the user always knows what to do next.

## v1 Requirements

### Inbox & Capture

- [ ] **INBX-01**: User can capture a thought/task to inbox via keyboard shortcut with minimal friction
- [ ] **INBX-02**: User can view all unprocessed inbox items in a single list
- [ ] **INBX-03**: User can process inbox items through guided workflow (actionable? 2-min rule? delegate? defer? trash?)
- [ ] **INBX-04**: User can search across all lists by text

### Next Actions & Contexts

- [x] **NACT-01**: User can view next actions filtered by context (@computer, @office, @phone, @home, @errands)
- [x] **NACT-02**: User can create custom contexts
- [x] **NACT-03**: User can mark a next action as complete
- [x] **NACT-04**: User can assign a next action to a project

### Projects

- [ ] **PROJ-01**: User can create and view projects (multi-step outcomes)
- [ ] **PROJ-02**: User can see which projects have no next action (stalled warning)
- [ ] **PROJ-03**: User can mark a project as complete
- [ ] **PROJ-04**: User can move a project to someday/maybe

### Waiting For

- [ ] **WAIT-01**: User can add items to waiting-for list (what, who, when delegated)
- [ ] **WAIT-02**: User can mark waiting-for items as resolved

### Someday/Maybe

- [ ] **SMBY-01**: User can add items to someday/maybe list
- [ ] **SMBY-02**: User can promote a someday/maybe item to an active project

### Weekly Review

- [ ] **REVW-01**: User can start a guided weekly review checklist
- [ ] **REVW-02**: Review walks through: empty inbox, review projects, review waiting-for, review someday/maybe
- [ ] **REVW-03**: User can see when they last completed a review

### GTD Onboarding

- [ ] **ONBR-01**: First-time user gets progressive introduction to GTD concepts
- [ ] **ONBR-02**: User captures first task within 60 seconds of opening app
- [ ] **ONBR-03**: GTD concepts explained contextually as user encounters each feature

### Calendar

- [ ] **CALV-01**: User can view a read-only calendar showing their schedule

### Data & Reliability

- [x] **DATA-01**: App works fully offline with local-first storage
- [x] **DATA-02**: User can export/backup all GTD data
- [x] **DATA-03**: App requests persistent storage to prevent browser eviction

## v2 Requirements

### Microsoft Integration

- **MSFT-01**: Two-way sync between GTD tasks (with dates) and Outlook calendar events
- **MSFT-02**: OAuth authentication via MSAL React for Microsoft Graph API
- **MSFT-03**: Delta query sync for incremental calendar updates
- **MSFT-04**: Conflict resolution UI when local and remote data diverge

### Workflow Enhancements

- **WKFL-01**: Defer dates (start dates) that hide tasks until they become relevant
- **WKFL-02**: Natural language parsing for quick capture ("buy milk tomorrow @errands")
- **WKFL-03**: Template projects for recurring workflows

### Power User Features

- **POWR-01**: Sequential vs parallel project types
- **POWR-02**: Custom perspectives (saved filter combinations)
- **POWR-03**: Energy/time estimates for filtering next actions
- **POWR-04**: Review cycles per project (daily/weekly/monthly frequency)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Team collaboration / task assignment | GTD is a personal productivity system; collaboration creates "inbox checking" behavior |
| Gamification / streaks / points | Focuses on quantity over quality; GTD is about appropriate engagement, not maximum completion |
| Complex priority systems (P1/P2/P3) | GTD uses context/energy/time instead of priority; priority is situational, not fixed |
| Mobile native app | Web-first, responsive design sufficient; user runs app alongside Outlook/Teams in browser |
| Email auto-capture from Outlook | Most emails are reference, not actionable; GTD clarify step is intentionally manual |
| Real-time push notifications | GTD is pull-based ("what should I do now?"), not push-based; interrupts deep work |
| Calendar-based task scheduling | GTD principle: calendar = hard landscape only; mixing tasks + appointments causes stress |
| Nested projects > 2 levels | GTD keeps it simple: Areas of Focus -> Projects -> Next Actions (3 levels max) |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1 | Complete |
| DATA-02 | Phase 1 | Complete |
| DATA-03 | Phase 1 | Complete |
| INBX-01 | Phase 2 | Pending |
| INBX-02 | Phase 2 | Pending |
| INBX-03 | Phase 2 | Pending |
| INBX-04 | Phase 2 | Pending |
| NACT-01 | Phase 3 | Complete |
| NACT-02 | Phase 3 | Complete |
| NACT-03 | Phase 3 | Complete |
| NACT-04 | Phase 3 | Complete |
| PROJ-01 | Phase 4 | Pending |
| PROJ-02 | Phase 4 | Pending |
| PROJ-03 | Phase 4 | Pending |
| PROJ-04 | Phase 4 | Pending |
| WAIT-01 | Phase 5 | Pending |
| WAIT-02 | Phase 5 | Pending |
| SMBY-01 | Phase 5 | Pending |
| SMBY-02 | Phase 5 | Pending |
| REVW-01 | Phase 6 | Pending |
| REVW-02 | Phase 6 | Pending |
| REVW-03 | Phase 6 | Pending |
| ONBR-01 | Phase 7 | Pending |
| ONBR-02 | Phase 7 | Pending |
| ONBR-03 | Phase 7 | Pending |
| CALV-01 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0

---
*Requirements defined: 2026-01-30*
*Last updated: 2026-01-30 after Phase 1 completion*
