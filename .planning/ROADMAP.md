# Roadmap: GTD Planner

## Overview

This roadmap delivers a complete web-based GTD (Getting Things Done) productivity system in 8 phases. The journey follows the natural GTD methodology flow: establish offline-first storage foundation, build capture and processing workflow, add core lists (next actions, projects, waiting-for, someday/maybe), implement weekly review (the critical success factor), guide new users through GTD concepts, and finally integrate calendar viewing. Each phase delivers a complete, verifiable capability that builds toward the core value: nothing falls through the cracks.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Storage** - Offline-first data persistence and reliability (2/2 plans complete)
- [x] **Phase 2: Inbox Capture & Processing** - Quick capture and guided processing workflow (4/4 plans complete)
- [x] **Phase 3: Next Actions & Contexts** - Context-based task filtering and completion (4/4 plans complete)
- [x] **Phase 4: Projects Management** - Multi-step outcomes with stalled project warnings (4/4 plans complete)
- [x] **Phase 5: Waiting For & Someday/Maybe** - Delegated items and future ideas (5/5 plans complete)
- [x] **Phase 6: Weekly Review** - Guided review workflow (critical GTD success factor) (4/4 plans complete)
- [x] **Phase 7: GTD Onboarding** - Progressive introduction for first-time users (5/5 plans complete)
- [ ] **Phase 8: Calendar View** - Read-only calendar for hard landscape reference

## Phase Details

### Phase 1: Foundation & Storage
**Goal**: User's GTD data is stored reliably offline and protected from browser eviction
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01, DATA-02, DATA-03
**Success Criteria** (what must be TRUE):
  1. User can open app in browser and access it fully offline (no network required)
  2. User can export all their GTD data to a downloadable file
  3. App displays persistent storage status and requests permission to prevent data loss
  4. Basic app shell loads and displays empty state
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md — Project setup, data layer & state management (completed 2026-01-30)
- [x] 01-02-PLAN.md — App shell, UI components & offline capability (completed 2026-01-30)

### Phase 2: Inbox Capture & Processing
**Goal**: User can capture thoughts quickly and process them through guided GTD workflow
**Depends on**: Phase 1
**Requirements**: INBX-01, INBX-02, INBX-03, INBX-04
**Success Criteria** (what must be TRUE):
  1. User can capture a task via keyboard shortcut within 2 seconds
  2. User can see all unprocessed inbox items in a single list
  3. User can process inbox items through guided workflow (actionable? 2-min rule? delegate? defer? trash?)
  4. User can search across all captured items by text
  5. Processed items are removed from inbox and moved to appropriate lists
**Plans**: 4 plans

Plans:
- [x] 02-01-PLAN.md — Data layer & utilities foundation (schema migration, search indexes, time formatting, inbox state) (completed 2026-01-30)
- [x] 02-02-PLAN.md — Inbox capture & list view (capture input, FIFO list, sidebar badge, multi-select) (completed 2026-01-30)
- [x] 02-03-PLAN.md — Search bar, keyboard shortcuts & toast (global search, Cmd+K/Cmd+I, notifications) (completed 2026-01-30)
- [x] 02-04-PLAN.md — Processing workflow (GTD decision tree, inline expansion, sequential mode) (completed 2026-01-30)

### Phase 3: Next Actions & Contexts
**Goal**: User can view and complete next actions filtered by where/when/how work can be done
**Depends on**: Phase 2
**Requirements**: NACT-01, NACT-02, NACT-03, NACT-04
**Success Criteria** (what must be TRUE):
  1. User can view next actions filtered by context (@computer, @office, @phone, @home, @errands)
  2. User can create and assign custom contexts (e.g., @meeting, @low-energy)
  3. User can mark a next action as complete and it disappears from active lists
  4. User can assign a next action to a project (for tracking multi-step outcomes)
  5. User sees only next actions relevant to current context (reduces cognitive load)
**Plans**: 4 plans

Plans:
- [x] 03-01-PLAN.md — Data layer: schema v3, context model, action operations, state store (completed 2026-01-30)
- [x] 03-02-PLAN.md — Context sidebar, action list with DnD, action item with completion flow (completed 2026-01-30)
- [x] 03-03-PLAN.md — Detail panel, processing flow context assignment, keyboard shortcuts (completed 2026-01-30)
- [x] 03-04-PLAN.md — Human verification of complete feature (completed 2026-01-30)

### Phase 4: Projects Management
**Goal**: User can track multi-step outcomes and identify stalled projects without next actions
**Depends on**: Phase 3
**Requirements**: PROJ-01, PROJ-02, PROJ-03, PROJ-04
**Success Criteria** (what must be TRUE):
  1. User can create a project and see all projects in a list
  2. User sees visual warning for projects with no next actions (stalled indicator)
  3. User can mark a project as complete when outcome is achieved
  4. User can move a project to someday/maybe when it's no longer active
  5. User can view which next actions belong to which project
**Plans**: 4 plans

Plans:
- [x] 04-01-PLAN.md — Project data layer and reactive state store (operations + ProjectState) (completed 2026-01-30)
- [x] 04-02-PLAN.md — Projects route, list UI, detail panel with stalled indicators (completed 2026-01-30)
- [x] 04-03-PLAN.md — Integration: ProcessingFlow project linking, ActionDetailPanel dropdown, sidebar nav, keyboard shortcut (completed 2026-01-30)
- [x] 04-04-PLAN.md — Human verification of complete feature (completed 2026-01-30)

### Phase 5: Waiting For & Someday/Maybe
**Goal**: User can track delegated items and park future ideas without cluttering active lists
**Depends on**: Phase 4
**Requirements**: WAIT-01, WAIT-02, SMBY-01, SMBY-02
**Success Criteria** (what must be TRUE):
  1. User can add items to waiting-for list with who delegated to and when
  2. User can mark waiting-for items as resolved when they're complete
  3. User can add ideas to someday/maybe list to park them
  4. User can promote a someday/maybe item to an active project
  5. Waiting-for and someday/maybe items don't appear in next actions lists
**Plans**: 5 plans

Plans:
- [x] 05-01-PLAN.md — Data layer: schema v4, waiting/someday operations, reactive state stores (completed 2026-01-30)
- [x] 05-02-PLAN.md — Waiting For route, list UI with inline add, resolve flow, overdue styling (completed 2026-01-30)
- [x] 05-03-PLAN.md — Someday/Maybe route, list UI with category filter, promote flow (completed 2026-01-30)
- [x] 05-04-PLAN.md — Integration: sidebar nav, keyboard shortcuts, ProcessingFlow delegate enhancement (completed 2026-01-30)
- [x] 05-05-PLAN.md — Human verification of complete feature (completed 2026-01-30)

### Phase 6: Weekly Review
**Goal**: User can complete guided weekly review to keep GTD system current (critical success factor)
**Depends on**: Phase 5
**Requirements**: REVW-01, REVW-02, REVW-03
**Success Criteria** (what must be TRUE):
  1. User can start a guided weekly review with step-by-step checklist
  2. Review walks through: empty inbox, review all projects, review waiting-for, review someday/maybe
  3. User can see when they last completed a review (time-since-last-review indicator)
  4. Review shows progress through steps with completion percentage
  5. User receives completion celebration when review finishes
**Plans**: 4 plans

Plans:
- [x] 06-01-PLAN.md — Data layer: schema v5 settings table, settings CRUD, WeeklyReviewState store, time-since utility (completed 2026-01-30)
- [x] 06-02-PLAN.md — Review wizard UI: WeeklyReviewWizard component with 8-step checklist, progress bar, step navigation, /review route (completed 2026-01-30)
- [x] 06-03-PLAN.md — Integration: sidebar nav with overdue badge, 'r' keyboard shortcut, canvas-confetti celebration, toast notification (completed 2026-01-30)
- [x] 06-04-PLAN.md — Human verification of complete weekly review feature (completed 2026-01-30)

### Phase 7: GTD Onboarding
**Goal**: First-time user understands GTD concepts and captures first task within 60 seconds
**Depends on**: Phase 6
**Requirements**: ONBR-01, ONBR-02, ONBR-03
**Success Criteria** (what must be TRUE):
  1. First-time user sees progressive introduction to GTD concepts (not all at once)
  2. User captures their first task within 60 seconds of opening app
  3. GTD concepts are explained contextually as user encounters each feature
  4. User can skip onboarding and jump directly to app if they already know GTD
  5. Onboarding adapts to show only unvisited features on subsequent sessions
**Plans**: 5 plans

Plans:
- [x] 07-01-PLAN.md — Onboarding state machine, feature tracking utilities, svelte-pops install (completed 2026-01-30)
- [x] 07-02-PLAN.md — Interactive walkthrough wizard with 5 GTD steps and real task capture (completed 2026-01-30)
- [x] 07-03-PLAN.md — Contextual FeatureHint component, hint content (full/reduced), Settings reset (completed 2026-01-30)
- [x] 07-04-PLAN.md — Integration: wire wizard into layout, route tracking, sidebar hints (completed 2026-01-30)
- [x] 07-05-PLAN.md — Human verification of complete onboarding experience (completed 2026-01-30)

### Phase 8: Calendar View
**Goal**: User can view their schedule (hard landscape) for daily planning reference
**Depends on**: Phase 7
**Requirements**: CALV-01
**Success Criteria** (what must be TRUE):
  1. User can view a read-only calendar showing their schedule
  2. Calendar displays time-specific commitments separately from next actions
  3. Calendar view helps user answer "what can I do now given my schedule?"
**Plans**: TBD

Plans:
- [ ] 08-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Storage | 2/2 | Complete | 2026-01-30 |
| 2. Inbox Capture & Processing | 4/4 | Complete | 2026-01-30 |
| 3. Next Actions & Contexts | 4/4 | Complete | 2026-01-30 |
| 4. Projects Management | 4/4 | Complete | 2026-01-30 |
| 5. Waiting For & Someday/Maybe | 5/5 | Complete | 2026-01-30 |
| 6. Weekly Review | 4/4 | Complete | 2026-01-30 |
| 7. GTD Onboarding | 5/5 | Complete | 2026-01-30 |
| 8. Calendar View | 0/TBD | Not started | - |
