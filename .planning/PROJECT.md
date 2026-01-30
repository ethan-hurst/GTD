# GTD Planner

## What This Is

A web-based personal productivity app that implements the full Getting Things Done (GTD) methodology. It helps a single user capture everything on their plate, process it through a guided GTD decision tree, and always know what to do next. Built with SvelteKit 2, Svelte 5, Dexie (IndexedDB), and Tailwind v4 as an offline-first single-page application. Includes onboarding for GTD newcomers and a calendar view for hard landscape reference.

## Core Value

Nothing falls through the cracks — every commitment is captured, clarified, and surfaced at the right time so the user always knows what to do next.

## Requirements

### Validated

- Inbox capture — quick entry via keyboard shortcut (Cmd+I, /) with inline input — v1.0
- Processing workflow — 5-step GTD decision tree routing to all lists — v1.0
- Next actions list — context-filtered (@computer, @office, @phone, @home, @errands) with custom contexts — v1.0
- Projects list — multi-step outcomes with stalled detection and action linking — v1.0
- Waiting-for list — delegation tracking with follow-up dates and overdue indicators — v1.0
- Someday/maybe list — idea parking with 8 categories and promote to project/action — v1.0
- Weekly review — guided 8-step wizard with live item counts and confetti celebration — v1.0
- GTD onboarding — 5-step wizard with real capture and contextual feature hints — v1.0
- Calendar view — day/week/month views with ICS import and next actions side panel — v1.0
- Offline-first storage — Dexie IndexedDB with service worker caching — v1.0
- Data export/import — JSON backup with download and restore — v1.0
- Persistent storage — Storage Manager API integration to prevent eviction — v1.0

### Active

- [ ] Two-way Outlook/Teams calendar sync — OAuth via MSAL, read Outlook events into GTD, push GTD tasks as calendar events, Outlook wins conflicts
- [ ] Microsoft Graph API authentication — OAuth 2.0 with user and admin consent flows, token management, offline-aware

### Deferred (future milestones)

- Defer dates (start dates) that hide tasks until they become relevant
- Natural language parsing for quick capture ("buy milk tomorrow @errands")
- Template projects for recurring workflows
- Sequential vs parallel project types
- Custom perspectives (saved filter combinations)
- Energy/time estimates for filtering next actions
- Review cycles per project (daily/weekly/monthly frequency)

### Out of Scope

- Team/manager visibility — this is a personal tool; progress is reported separately
- Mobile native app — web-first, PWA works well on mobile browsers
- Email auto-capture from Outlook — manual capture is sufficient; GTD clarify step is intentionally manual
- Gamification / streaks / points — focuses on quantity over quality; GTD is about appropriate engagement
- Complex priority systems (P1/P2/P3) — GTD uses context/energy/time; priority is situational
- Real-time push notifications — GTD is pull-based ("what should I do now?"); interrupts deep work
- Nested projects > 2 levels — GTD keeps it simple: Areas of Focus -> Projects -> Next Actions

## Current Milestone: v1.1 Outlook Calendar Sync

**Goal:** Two-way calendar sync between GTD and Outlook so the user sees work commitments in GTD and GTD tasks appear on their Outlook calendar.

**Target features:**
- Read Outlook calendar events into GTD's calendar view (replace/enhance ICS import)
- Push GTD tasks with scheduled times to Outlook as calendar events
- OAuth 2.0 authentication via MSAL (user + admin consent flows)
- Delta query sync for incremental updates
- Outlook wins conflict resolution (changes in Outlook propagate to GTD)
- Offline-aware sync queue (queues changes when disconnected)
- Sync status indicators and manual sync trigger

## Context

Shipped v1.0 MVP with 7,570 LOC TypeScript/Svelte/CSS across 167 files.
Tech stack: SvelteKit 2, Svelte 5 ($state runes), Dexie 4.x (IndexedDB), Tailwind v4, @event-calendar/core.
Built in 2 days (2026-01-30 → 2026-01-31), 8 phases, 35 plans, 138 commits.

User is new to GTD methodology, recommended by manager to improve performance at work. Corporate Microsoft environment (Outlook calendar, Teams). Calendar integration with Microsoft Graph API is the v1.1 focus.

## Constraints

- **Platform**: Web application — runs in browser alongside Outlook/Teams
- **Integration**: Microsoft Graph API for Outlook/Teams calendar sync (v2 priority)
- **Audience**: Single user — no multi-tenancy, auth can be simple
- **GTD fidelity**: Full GTD system implemented (inbox, next actions, contexts, projects, waiting-for, someday/maybe, weekly review)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Web app over desktop app | User wants browser tab alongside work tools | Good — works well as persistent browser tab |
| Full GTD over simplified version | User wants the complete methodology | Good — all GTD lists and weekly review implemented |
| Core GTD first, calendar sync later | Reduce complexity of initial build | Good — solid GTD foundation before integration |
| Personal only, no sharing | Simplifies auth and data model | Good — no auth complexity |
| SvelteKit 2 + Svelte 5 $state runes | Modern reactive patterns, excellent DX | Good — consistent store pattern across all phases |
| Dexie 4.x with EntityTable | Type-safe IndexedDB operations | Good — 6 schema versions, clean migrations |
| Tailwind v4 with Vite plugin | No PostCSS config needed | Good — required @custom-variant dark for class-based dark mode |
| @event-calendar/core over FullCalendar | 35KB vs 150KB+, native Svelte 5 support | Good — smaller bundle, better integration |
| Schema extension over separate tables | Optional fields on GTDItem for waiting/someday | Good — simpler queries, single table for most items |
| ProcessingFlow as central routing hub | Single component handles all GTD decision paths | Good — routes to all 7 destinations cleanly |

---
*Last updated: 2026-01-31 after v1.1 milestone started*
