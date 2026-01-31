# Requirements: GTD Planner v1.1 — Outlook Calendar Sync

**Defined:** 2026-01-31
**Core Value:** Nothing falls through the cracks — every commitment is captured, clarified, and surfaced at the right time so the user always knows what to do next.

## v1.1 Requirements

Requirements for Outlook Calendar Sync milestone. Each maps to roadmap phases.

### Authentication

- [ ] **AUTH-01**: User can connect to Microsoft 365 via OAuth 2.0 ("Connect to Outlook" button)
- [ ] **AUTH-02**: App handles both user consent and admin consent flows for corporate environments
- [ ] **AUTH-03**: Access tokens refresh automatically (1-hour expiry) without user intervention
- [ ] **AUTH-04**: User can disconnect Outlook integration and all cached Outlook data is deleted
- [ ] **AUTH-05**: Auth works in SvelteKit SPA context (client-side only, no SSR dependency)

### Read Calendar (Outlook → GTD)

- [ ] **READ-01**: User can view Outlook calendar events in GTD calendar view (day/week/month)
- [ ] **READ-02**: Outlook events display as read-only with visual distinction from GTD tasks
- [ ] **READ-03**: User can select which Outlook calendars to display (filter shared/team calendars)
- [ ] **READ-04**: Calendar events sync incrementally via delta queries (not full refresh each time)
- [ ] **READ-05**: Events display correctly across time zones (UTC normalization to local time)

### Write Calendar (GTD → Outlook)

- [ ] **WRITE-01**: User can push a GTD task with time and duration to Outlook as a calendar event
- [ ] **WRITE-02**: Task duration field added to task schema (required for calendar sync)
- [ ] **WRITE-03**: Synced task events show as "Busy" in Outlook (blocks calendar time)
- [ ] **WRITE-04**: When user reschedules event in Outlook, GTD task time updates automatically
- [ ] **WRITE-05**: When user deletes synced event in Outlook, GTD task is unscheduled (not deleted)
- [ ] **WRITE-06**: Task metadata (project, context, tags) synced to Outlook via extended properties
- [ ] **WRITE-07**: Synced events display task title as event subject with GTD origin indicator

### Sync Engine

- [ ] **SYNC-01**: User can trigger manual sync via "Sync now" button
- [ ] **SYNC-02**: Delta queries fetch only changes since last sync (incremental, not full refresh)
- [ ] **SYNC-03**: Conflicts resolved with "Outlook wins" strategy (Outlook changes override GTD)
- [ ] **SYNC-04**: Changes queued in IndexedDB while offline and replayed on reconnect
- [ ] **SYNC-05**: Real-time sync via Graph API webhooks (changes appear within 1 minute)
- [ ] **SYNC-06**: Webhook subscriptions auto-renew before expiry
- [ ] **SYNC-07**: Sync status indicators visible (last sync time, pending changes count, sync health)
- [ ] **SYNC-08**: Basic conflict detection warns user when scheduling task that overlaps existing event
- [ ] **SYNC-09**: Sync handles deleted events correctly (Graph API @removed annotations)
- [ ] **SYNC-10**: Correlation IDs prevent sync loops (GTD change → Outlook → webhook → GTD)

## Future Requirements

Deferred to v1.2+ milestones. Tracked but not in current roadmap.

### Enhanced Sync

- **ESYNC-01**: Multiple calendar support (sync different projects to different Outlook calendars)
- **ESYNC-02**: Drag-to-reschedule in GTD calendar view syncs back to Outlook
- **ESYNC-03**: Bulk sync settings (sync all tasks in a project, all @context tasks)
- **ESYNC-04**: Recurring task sync as individual Outlook events per occurrence

### Advanced Features

- **ADV-01**: Auto-decline conflicting meetings during focus time blocks
- **ADV-02**: Smart sync suggestions ("This task has a time, sync to calendar?")
- **ADV-03**: Calendar event templates for recurring focus time blocks
- **ADV-04**: Sync analytics (time spent by project/context)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Sync all tasks to calendar | Clutters calendar; only tasks with time+duration should sync |
| Convert events to tasks automatically | Creates noise; GTD clarify step is intentionally manual |
| Full two-way event editing | Complex permissions, attendee management; allow reschedule only |
| Multiple calendar providers | M365 only; ICS export for others |
| Sync to shared/delegated calendars | Complex permissions; v1.1 syncs to user's primary calendar only |
| Sync task notes as full event body | Different audiences (tasks personal, events shared); sync summary only |
| Historical sync (past events) | Unnecessary load; sync 2 weeks back maximum |
| Google Calendar support | Out of scope; Outlook/M365 is target environment |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 9 | Pending |
| AUTH-02 | Phase 9 | Pending |
| AUTH-03 | Phase 9 | Pending |
| AUTH-04 | Phase 9 | Pending |
| AUTH-05 | Phase 9 | Pending |
| READ-01 | Phase 10 | Pending |
| READ-02 | Phase 10 | Pending |
| READ-03 | Phase 10 | Pending |
| READ-04 | Phase 10 | Pending |
| READ-05 | Phase 10 | Pending |
| WRITE-01 | Phase 11 | Pending |
| WRITE-02 | Phase 11 | Pending |
| WRITE-03 | Phase 11 | Pending |
| WRITE-04 | Phase 11 | Pending |
| WRITE-05 | Phase 11 | Pending |
| WRITE-06 | Phase 11 | Pending |
| WRITE-07 | Phase 11 | Pending |
| SYNC-01 | Phase 10 | Pending |
| SYNC-02 | Phase 10 | Pending |
| SYNC-03 | Phase 11 | Pending |
| SYNC-04 | Phase 12 | Pending |
| SYNC-05 | Phase 13 | Pending |
| SYNC-06 | Phase 13 | Pending |
| SYNC-07 | Phase 12 | Pending |
| SYNC-08 | Phase 11 | Pending |
| SYNC-09 | Phase 10 | Pending |
| SYNC-10 | Phase 11 | Pending |

**Coverage:**
- v1.1 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0 ✓

**Coverage by phase:**
- Phase 9 (OAuth Foundation): 5 requirements
- Phase 10 (Read Calendar): 8 requirements
- Phase 11 (Two-Way Sync): 10 requirements
- Phase 12 (Offline Queue): 2 requirements
- Phase 13 (Real-Time Sync): 2 requirements

---
*Requirements defined: 2026-01-31*
*Last updated: 2026-01-31 after roadmap creation*
