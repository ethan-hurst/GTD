# Roadmap: GTD Planner

## Milestones

- ✅ **v1.0 MVP** - Phases 1-8 (shipped 2026-01-31)
- 🚧 **v1.1 Outlook Calendar Sync** - Phases 9-13 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-8) - SHIPPED 2026-01-31</summary>

### Phase 1: Foundation
**Goal**: SvelteKit 2 + Svelte 5 project scaffolded with Dexie and Tailwind v4
**Plans**: 3 plans

Plans:
- [x] 01-01: Initialize SvelteKit 2 with TypeScript and Vite
- [x] 01-02: Configure Dexie IndexedDB with initial schema
- [x] 01-03: Setup Tailwind v4 with dark mode support

### Phase 2: Inbox & Processing
**Goal**: Users can capture and process inbox items through GTD decision tree
**Plans**: 4 plans

Plans:
- [x] 02-01: Inbox capture with keyboard shortcut
- [x] 02-02: Processing flow component
- [x] 02-03: GTD decision tree routing
- [x] 02-04: Quick add integration

### Phase 3: Next Actions
**Goal**: Users can view and manage context-filtered next actions
**Plans**: 5 plans

Plans:
- [x] 03-01: Next actions store and queries
- [x] 03-02: Context filter system
- [x] 03-03: Custom contexts
- [x] 03-04: Drag-and-drop reordering
- [x] 03-05: Project linking

### Phase 4: Projects & Waiting
**Goal**: Users can track multi-step projects and delegated tasks
**Plans**: 4 plans

Plans:
- [x] 04-01: Projects store with stalled detection
- [x] 04-02: Action-project linking
- [x] 04-03: Waiting-for list
- [x] 04-04: Follow-up dates and overdue indicators

### Phase 5: Someday/Maybe
**Goal**: Users can park ideas by category and promote them
**Plans**: 3 plans

Plans:
- [x] 05-01: Someday/maybe store
- [x] 05-02: 8-category system
- [x] 05-03: Promote to project/action

### Phase 6: Weekly Review
**Goal**: Users can complete structured weekly review with live counts
**Plans**: 4 plans

Plans:
- [x] 06-01: Review wizard structure
- [x] 06-02: 8-step review flow
- [x] 06-03: Live item counts
- [x] 06-04: Confetti celebration

### Phase 7: Calendar & ICS
**Goal**: Users can view calendar with ICS import and recurrence support
**Plans**: 6 plans

Plans:
- [x] 07-01: Calendar component integration
- [x] 07-02: Day/week/month views
- [x] 07-03: ICS parser
- [x] 07-04: Recurrence handling
- [x] 07-05: Next actions side panel
- [x] 07-06: Calendar event CRUD

### Phase 8: Onboarding & Polish
**Goal**: Users experience guided onboarding and complete PWA features
**Plans**: 6 plans

Plans:
- [x] 08-01: 5-step onboarding wizard
- [x] 08-02: Contextual hints system
- [x] 08-03: Service worker caching
- [x] 08-04: Persistent storage API
- [x] 08-05: Data export/import
- [x] 08-06: Final UI polish

</details>

---

### Phase 08.1: UI/UX Review (INSERTED)

**Goal**: Comprehensive review and fix of all v1.0 views for visual consistency, design principle adherence, and usability — ensuring a solid UI foundation before layering Outlook sync features

**Depends on**: Phase 8 (v1.0 complete)

**Success Criteria** (what must be TRUE):
1. All views use consistent spacing, typography, and color patterns
2. Interactive elements have clear affordances (hover states, focus rings, click targets)
3. Information hierarchy is clear on every screen — users know what's primary vs secondary
4. Light and dark modes are both visually coherent with proper contrast ratios
5. Empty states, loading states, and error states are handled consistently
6. Navigation and layout patterns are uniform across all GTD views
7. App remains usable at 1024px minimum width (desktop-first; no mobile layout requirement)

**Plans**: 7 plans

Plans:
- [x] 08.1-01-PLAN.md — Design tokens in app.css + root layout shell polish
- [x] 08.1-02-PLAN.md — Sidebar navigation + SearchBar + ThemeToggle polish
- [x] 08.1-03-PLAN.md — Inbox page + capture input + processing flow polish
- [x] 08.1-04-PLAN.md — Actions + Projects list views and detail panels polish
- [x] 08.1-05-PLAN.md — Waiting For + Someday/Maybe + Settings polish
- [x] 08.1-06-PLAN.md — Calendar toolbar/panels + Weekly Review wizard polish
- [x] 08.1-07-PLAN.md — OnboardingWizard polish + full visual verification

---

### Phase 08.2: Storage Persistence Bug Fix (INSERTED)

**Goal:** Fix broken "click to request" persistent storage flow — proper state management, user feedback, and Storage dashboard in Settings
**Depends on:** Phase 8
**Plans:** 2 plans

Plans:
- [x] 08.2-01-PLAN.md — Refactor storage persistence state management (three-state tracking)
- [x] 08.2-02-PLAN.md — Integrate persistence UI with state store (Settings dashboard + StatusBar + toasts)

---

### Phase 08.3: Left Nav Bar UX Improvement (INSERTED)

**Goal:** Redesign the left navigation sidebar to eliminate the scrollbar and improve UX while preserving all existing functionality
**Depends on:** Phase 8
**Plans:** 2 plans

Plans:
- [x] 08.3-01-PLAN.md — Optimize sidebar spacing, nav grouping, and collapsible context list
- [x] 08.3-02-PLAN.md — Add sidebar collapse toggle with icon-only mode

---

### Phase 08.4: Mobile Responsive Pass (INSERTED)

**Goal:** Comprehensive mobile responsiveness pass across all views to ensure the app works well on mobile devices — touch targets, responsive layouts, and mobile-friendly navigation

**Depends on:** Phase 08.3 (sidebar collapse provides foundation for mobile nav)

**Success Criteria** (what must be TRUE):
1. All views render correctly on viewport widths from 320px to 1024px
2. Touch targets meet minimum 44px size on all interactive elements
3. Sidebar collapses or converts to mobile-friendly navigation on small screens
4. Forms, modals, and processing flows are usable on touch devices
5. Calendar views adapt to narrow screens (day view default on mobile)
6. Text remains readable without horizontal scrolling on any view
7. No functionality is lost on mobile — all features accessible via touch

**Plans:** 7 plans

Plans:
- [x] 08.4-01-PLAN.md — Foundation: custom breakpoints, viewport meta, mobile store, svelte-gestures
- [x] 08.4-02-PLAN.md — Mobile navigation: hamburger drawer, header bar, FAB, layout integration
- [x] 08.4-03-PLAN.md — List views responsive: Inbox, Actions, Projects, Waiting, Someday
- [x] 08.4-04-PLAN.md — Calendar responsive: mobile toolbar, day view default, side panel toggle
- [x] 08.4-05-PLAN.md — Forms and dialogs: ProcessingFlow, IcsImport, Settings, SearchBar
- [x] 08.4-06-PLAN.md — Wizards responsive: WeeklyReview, Onboarding, StatusBar
- [x] 08.4-07-PLAN.md — Touch interactions: swipe actions, calendar swipe nav, mobile DnD

---

### Phase 08.5: Device Sync (INSERTED)

**Goal:** Enable multi-device sync using Netlify Functions + Netlify Blobs — pair devices once with a short code, auto-sync on open, per-record merge by timestamp, encrypted at rest using the pairing code as the key

**Depends on:** Phase 08.4

**Success Criteria** (what must be TRUE):
1. User can generate a pairing code on one device and enter it on another to link them
2. On app open, the app automatically pulls the latest state from the other device and merges
3. Changes push automatically (debounced) to Netlify Blob after local modifications
4. Per-record merge by `modified` timestamp — newer version of each record wins, new items from both sides preserved
5. Data is encrypted client-side (AES-GCM, key derived from pairing code via PBKDF2) before upload
6. Deleted items tracked via soft-delete tombstones to propagate deletions across devices
7. Sync status indicator in sidebar shows last sync time and connection state
8. User can unpair and force-sync from Settings page

**Plans:** 6 plans

Plans:
- [x] 08.5-01-PLAN.md — Schema migration (soft-delete tombstones) + sync type definitions
- [x] 08.5-02-PLAN.md — Crypto module (AES-GCM + PBKDF2) + pairing code generation
- [x] 08.5-03-PLAN.md — Netlify Functions (sync-push + sync-pull) with Netlify Blobs
- [x] 08.5-04-PLAN.md — Merge logic (LWW) + sync orchestration engine + reactive store
- [x] 08.5-05-PLAN.md — Settings Device Sync UI + Sidebar/StatusBar sync indicators
- [x] 08.5-06-PLAN.md — Integration wiring (auto-sync on open, debounced push, verification)

**Details:**
- Netlify Functions: sync-push.mts + sync-pull.mts
- Netlify Blobs: ephemeral storage keyed by hashed pairing code
- Client: src/lib/sync/ (crypto.ts, merge.ts, sync.ts, pair.ts)
- UI: Device Sync card in Settings + sidebar status indicator
- No new dependencies (Web Crypto API + Netlify Blobs SDK built-in)

---

### Phase 08.6: Backend, Frontend & Integration Tests (INSERTED)

**Goal:** Set up backend, frontend, and integration test infrastructure — ensuring the existing codebase has a solid test foundation before layering Outlook sync features

**Depends on:** Phase 08.5

**Success Criteria** (what must be TRUE):
1. Test runner configured and working for unit tests (frontend components + stores)
2. Backend/serverless function tests can exercise Netlify Functions locally
3. Integration tests can verify end-to-end flows (e.g., sync, CRUD operations)
4. CI-friendly test commands exist (can run in headless mode)
5. Existing core functionality has baseline test coverage

**Plans:** 6 plans

Plans:
- [x] 08.6-01-PLAN.md — Test infrastructure: Vitest + Browser Mode + Playwright + fake-indexeddb setup
- [x] 08.6-02-PLAN.md — Pure logic unit tests: merge (LWW), search tokenization, time utilities
- [x] 08.6-03-PLAN.md — Data layer tests: DB operations, crypto round-trip, export/import
- [x] 08.6-04-PLAN.md — Component tests: Svelte 5 components with vitest-browser-svelte
- [x] 08.6-05-PLAN.md — E2E tests: Playwright smoke test + inbox CRUD flow
- [x] 08.6-06-PLAN.md — Netlify Functions unit tests: sync-push, sync-pull, sync-check with mocked Blobs

**Details:**
- Vitest 6.x with Browser Mode + Playwright provider (Svelte 5 runes require real browser)
- vitest-browser-svelte for component rendering
- fake-indexeddb for Dexie/IndexedDB mocking in unit tests
- Playwright for E2E tests against dev server
- Co-located tests (*.test.ts next to source files)
- E2E tests in tests/e2e/ directory

---

### Phase 08.7: Site Analytics & Usage Metrics (INSERTED)

**Goal:** Add analytics and usage tracking using existing Netlify Functions + Blobs infrastructure (no external service) so the team can measure user engagement, track signups over time, and understand how the app is being used

**Depends on:** Phase 08.6

**Success Criteria** (what must be TRUE):
1. Anonymous usage metrics are collected (page views, feature usage, session duration)
2. User signup/activation funnel is trackable over time
3. Analytics dashboard or reporting is accessible to the team
4. Privacy-respecting implementation (no PII leakage, GDPR-friendly)
5. Metrics persist historically so trends can be analyzed week-over-week

**Plans:** 4 plans

Plans:
- [x] 08.7-01-PLAN.md — Event types, client tracker (sendBeacon + DNT), ingestion function (visitor hashing + daily aggregation)
- [x] 08.7-02-PLAN.md — Wire page view tracking into layout + instrument custom events (sync, review, onboarding)
- [x] 08.7-03-PLAN.md — Query API function with auth + GDPR data retention cleanup
- [x] 08.7-04-PLAN.md — Analytics dashboard UI with Chart.js (lazy-loaded) + password protection

**Details:**
- Self-built analytics using existing Netlify Functions + Netlify Blobs infrastructure
- No external service required (no Plausible, no account setup)
- Cookie-free, GDPR-compliant, no consent banner needed
- Custom events: activation funnel, feature usage, engagement metrics
- Re-planned to avoid adding external service dependency

---

### Phase 08.8: User Feedback & Bug Reports (INSERTED)

**Goal:** Provide a way for users to submit bug reports and feature requests directly from the app — giving the team a feedback channel to prioritize improvements and have dialog with users, with an admin dashboard for managing submissions

**Depends on:** Phase 08.7

**Success Criteria** (what must be TRUE):
1. Users can submit bug reports from within the app with relevant context
2. Users can request features or suggest improvements
3. Submissions are stored in Netlify Blobs with an admin dashboard for review
4. Feedback form is accessible from all views (not buried in settings)
5. User experience is lightweight — doesn't interrupt workflow
6. Optional contact info (email) so the team can follow up with users
7. Admin can view, filter, and manage feedback status (new/reviewed/resolved/archived)

**Plans:** 4 plans

Plans:
- [x] 08.8-01-PLAN.md — Feedback form foundation: Dexie schema, FeedbackModal component, navigation wiring
- [x] 08.8-02-PLAN.md — Netlify Functions: feedback-submit, feedback-query, feedback-update (Blobs storage)
- [x] 08.8-03-PLAN.md — Endpoint migration: update FeedbackModal, feedback-queue, service worker to new JSON API + cleanup Netlify Forms artifacts
- [x] 08.8-04-PLAN.md — Admin dashboard at /admin/feedback: password auth, list/detail views, status management

**Details:**
- Netlify Blobs for submission storage (replaced Netlify Forms approach)
- Three Netlify Functions: feedback-submit (public), feedback-query + feedback-update (auth-protected)
- html2canvas for screenshot capture (optional, compressed to <500KB)
- Dexie feedbackQueue table for offline submissions
- Background Sync API for automatic retry when online
- FeedbackModal accessible from sidebar footer, mobile drawer, and 'f' keyboard shortcut
- Admin dashboard at /admin/feedback with ANALYTICS_PASSWORD auth
- Screenshots stored as separate blobs (not inline with item JSON)

---

### Phase 08.8.1: Test Suite Improvement (INSERTED)

**Goal:** Improve test coverage to catch regressions before adding Outlook sync — targeting critical untested business logic, stores, and Netlify functions

**Depends on:** Phase 08.8

**Coverage Assessment (current):**
- DB operations: Good | Sync merge/crypto: Good
- Sync orchestration (sync.ts, 299 lines): NONE — data loss risk
- Pairing (pair.ts, 118 lines): NONE — security risk
- Recurrence/ICS (215 lines): NONE — scheduling bug risk
- Stores: 0 of 13 tested
- Components: 3 of 27 (render-only)
- Netlify Functions: 3 of 9 (sync only)
- Analytics/Feedback functions: NONE (6 functions)
- E2E: Smoke tests only

**Plans:** 4 plans

Plans:
- [x] 08.8.1-01-PLAN.md — Sync pairing + orchestration tests (pair.ts, sync.ts -- HIGH risk business logic)
- [x] 08.8.1-02-PLAN.md — Recurrence expansion + ICS parser tests (pure utility functions)
- [x] 08.8.1-03-PLAN.md — Fix vitest.node.config.ts + analytics Netlify Functions tests
- [x] 08.8.1-04-PLAN.md — Feedback Netlify Functions tests (submit, query, update)

---

### v1.1 Outlook Calendar Sync (In Progress)

**Milestone Goal:** Two-way calendar sync between GTD and Outlook so the user sees work commitments in GTD and GTD tasks appear on their Outlook calendar.

#### Phase 9: OAuth Foundation

**Goal**: Users can securely connect to Microsoft 365 and maintain authenticated sessions

**Depends on**: Phase 8 (v1.0 foundation)

**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05

**Success Criteria** (what must be TRUE):
1. User can click "Connect to Outlook" button and complete OAuth flow via Microsoft login
2. User sees connected account profile and can disconnect at any time
3. Access tokens refresh automatically without requiring re-login during active sessions
4. Auth works in corporate environments with admin consent and Conditional Access policies
5. Disconnecting Outlook integration removes all cached Outlook data from IndexedDB

**Plans**: TBD

Plans:
- [ ] 09-01: TBD
- [ ] 09-02: TBD

---

#### Phase 10: Read Calendar

**Goal**: Users can view Outlook calendar events in GTD calendar view with incremental sync

**Depends on**: Phase 9 (OAuth required for Graph API calls)

**Requirements**: READ-01, READ-02, READ-03, READ-04, READ-05, SYNC-01, SYNC-02, SYNC-09

**Success Criteria** (what must be TRUE):
1. User can view all Outlook calendar events in GTD's day/week/month calendar views
2. Outlook events display visually distinct from GTD tasks (read-only styling, different color)
3. User can filter which Outlook calendars appear (hide shared/team calendars)
4. Manual "Sync now" button pulls only changes since last sync (not full refresh)
5. Events display correctly in user's local timezone regardless of event timezone
6. Events deleted in Outlook are removed from GTD calendar after sync

**Plans**: TBD

Plans:
- [ ] 10-01: TBD
- [ ] 10-02: TBD

---

#### Phase 11: Two-Way Sync

**Goal**: Users can push GTD tasks to Outlook calendar and changes in Outlook update GTD tasks

**Depends on**: Phase 10 (read sync must work before adding write complexity)

**Requirements**: WRITE-01, WRITE-02, WRITE-03, WRITE-04, WRITE-05, WRITE-06, WRITE-07, SYNC-03, SYNC-08, SYNC-10

**Success Criteria** (what must be TRUE):
1. User can push GTD task with scheduled time and duration to Outlook as calendar event
2. Tasks have duration field in GTD UI (required for calendar blocking)
3. Synced events show as "Busy" in Outlook calendar (blocks time for other meetings)
4. When user reschedules event in Outlook, GTD task time updates after next sync
5. When user deletes synced event in Outlook, GTD task is unscheduled but remains in GTD
6. Synced events display task title with "(GTD)" indicator in Outlook
7. Task metadata (project, context) syncs to Outlook via extended properties
8. User sees warning when scheduling task that conflicts with existing calendar event
9. Correlation IDs prevent infinite sync loops (GTD -> Outlook -> webhook -> GTD)

**Plans**: TBD

Plans:
- [ ] 11-01: TBD
- [ ] 11-02: TBD
- [ ] 11-03: TBD

---

#### Phase 12: Offline Queue

**Goal**: Users can make calendar changes while offline and they sync when connection returns

**Depends on**: Phase 11 (online two-way sync must work before adding offline complexity)

**Requirements**: SYNC-04, SYNC-07

**Success Criteria** (what must be TRUE):
1. When offline, calendar changes queue in IndexedDB instead of failing
2. Sync status indicator shows pending changes count and last successful sync time
3. When connection returns, queued changes replay automatically
4. If Outlook event was modified while offline, "Outlook wins" and user sees notification
5. Queue processes in FIFO order with retry logic (max 3 attempts before manual intervention)

**Plans**: TBD

Plans:
- [ ] 12-01: TBD
- [ ] 12-02: TBD

---

#### Phase 13: Real-Time Sync

**Goal**: Users see Outlook calendar changes appear in GTD within 1 minute via webhooks

**Depends on**: Phase 12 (webhook implementation builds on offline queue foundation)

**Requirements**: SYNC-05, SYNC-06

**Success Criteria** (what must be TRUE):
1. Changes made in Outlook appear in GTD calendar within 1 minute without manual sync
2. Webhook subscriptions renew automatically before 3-day expiry
3. Subscription renewal failures fall back to manual sync with user notification
4. Webhook endpoint validates notification tokens to prevent spoofing

**Plans**: TBD

Plans:
- [ ] 13-01: TBD
- [ ] 13-02: TBD

---

## Progress

**Execution Order:** Phases execute in numeric order: 08.1 -> 08.2 -> 08.3 -> 08.4 -> 08.5 -> 08.6 -> 08.7 -> 08.8 -> 08.8.1 -> 9 -> 10 -> 11 -> 12 -> 13

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 3/3 | Complete | 2026-01-30 |
| 2. Inbox & Processing | v1.0 | 4/4 | Complete | 2026-01-30 |
| 3. Next Actions | v1.0 | 5/5 | Complete | 2026-01-30 |
| 4. Projects & Waiting | v1.0 | 4/4 | Complete | 2026-01-31 |
| 5. Someday/Maybe | v1.0 | 3/3 | Complete | 2026-01-31 |
| 6. Weekly Review | v1.0 | 4/4 | Complete | 2026-01-31 |
| 7. Calendar & ICS | v1.0 | 6/6 | Complete | 2026-01-31 |
| 8. Onboarding & Polish | v1.0 | 6/6 | Complete | 2026-01-31 |
| 08.1 UI/UX Review | v1.0+ | 7/7 | Complete | 2026-01-31 |
| 08.2 Storage Persistence | v1.0+ | 2/2 | Complete | 2026-01-31 |
| 08.3 Left Nav Bar UX | v1.0+ | 2/2 | Complete | 2026-01-31 |
| 08.4 Mobile Responsive Pass | v1.0+ | 7/7 | Complete | 2026-01-31 |
| 08.5 Device Sync | v1.0+ | 6/6 | Complete | 2026-01-31 |
| 08.6 Backend/Frontend/Integration Tests | v1.0+ | 6/6 | Complete | 2026-02-01 |
| 08.7 Site Analytics & Usage Metrics | v1.0+ | 4/4 | Complete | 2026-02-02 |
| 08.8 User Feedback & Bug Reports | v1.0+ | 4/4 | Complete | 2026-02-02 |
| 08.8.1 Test Suite Improvement | v1.0+ | 4/4 | Complete | 2026-02-02 |
| 9. OAuth Foundation | v1.1 | 0/TBD | Not started | - |
| 10. Read Calendar | v1.1 | 0/TBD | Not started | - |
| 11. Two-Way Sync | v1.1 | 0/TBD | Not started | - |
| 12. Offline Queue | v1.1 | 0/TBD | Not started | - |
| 13. Real-Time Sync | v1.1 | 0/TBD | Not started | - |
