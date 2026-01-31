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

### 🚧 v1.1 Outlook Calendar Sync (In Progress)

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
9. Correlation IDs prevent infinite sync loops (GTD → Outlook → webhook → GTD)

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

**Execution Order:** Phases execute in numeric order: 9 → 10 → 11 → 12 → 13

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
| 9. OAuth Foundation | v1.1 | 0/TBD | Not started | - |
| 10. Read Calendar | v1.1 | 0/TBD | Not started | - |
| 11. Two-Way Sync | v1.1 | 0/TBD | Not started | - |
| 12. Offline Queue | v1.1 | 0/TBD | Not started | - |
| 13. Real-Time Sync | v1.1 | 0/TBD | Not started | - |
