# Project Research Summary

**Project:** GTD Planner v1.1 — Outlook Calendar Sync
**Domain:** Microsoft Graph Calendar Integration
**Researched:** 2026-01-31
**Confidence:** HIGH

## Executive Summary

Adding two-way Outlook calendar sync to an existing offline-first GTD app requires minimal new dependencies (MSAL.js v4.28 for auth, Graph Client SDK for API calls) but introduces architectural complexity around delta sync, conflict resolution, and offline queue management. The recommended approach leverages Microsoft Graph API's delta query pattern for efficient incremental sync, paired with a Dexie-based offline queue that honors an "Outlook wins" conflict resolution strategy.

Research across productivity apps (Todoist, TickTick, OmniFocus) reveals table stakes features: viewing Outlook events in the app, syncing scheduled tasks to Outlook, and real-time updates via webhooks. True two-way sync (changes in Outlook update the GTD app) is rare and highly valued as a differentiator. The critical architectural insight is that offline support—already present in the GTD app's Dexie foundation—becomes both an advantage (queue-based retry) and a complexity amplifier (conflict detection, deduplication, stale data handling).

Key risks center on Microsoft Graph API edge cases that appear in production but not testing: delta token expiry after 7 days, skip token expiry during pagination, recurring event exceptions invisible in `/events` endpoint, and corporate Conditional Access policies blocking unattended sync. These pitfalls are well-documented in Microsoft Q&A forums but easily overlooked in happy-path development. Mitigation requires explicit error handling, fallback strategies (full sync when delta expires), and using `/calendarView` instead of `/events` for recurring events.

## Key Findings

### Recommended Stack

The existing SvelteKit 2 + Svelte 5 + Dexie 4.x stack requires only three additions for Outlook sync, with total bundle size impact of ~52 KB (3% of typical SPA). No changes to core stack needed.

**Core technologies:**
- **@azure/msal-browser v4.28.1** — OAuth 2.0 authentication with PKCE flow; only library for Microsoft identity platform (v5.x exists but has undocumented breaking changes)
- **@microsoft/microsoft-graph-client v3.0.7** — Microsoft Graph API HTTP client; official SDK with built-in pagination, batching, retry logic (saves 12 KB over raw fetch but worth it for reliability)
- **@microsoft/microsoft-graph-types v2.x** — TypeScript definitions for Graph entities; dev dependency only, zero runtime cost, provides intellisense for Calendar/Event types

**Critical version note:** MSAL.js v5.x (released Jan 2026) has peer dependency conflicts and lacks migration docs. Pin to v4.28.1 until v5 stabilizes (expected Q1/Q2 2026).

**Integration patterns:**
- MSAL must be initialized client-side only (SvelteKit SSR incompatible—`window.localStorage` unavailable on server)
- Tokens stored in sessionStorage (more secure than localStorage, cleared on tab close)
- Graph Client wraps fetch with automatic token injection via MSAL callback
- Dexie schema extends with three new tables: `outlookEvents`, `syncMetadata` (delta links), `syncQueue` (offline mutations)

### Expected Features

Research reveals clear tiers of user expectations based on competitor analysis (Todoist, TickTick, OmniFocus):

**Must have (table stakes):**
- Display Outlook calendar events in GTD calendar view (read-only) — standard since 2020s, users want unified view
- Sync tasks-with-times to Outlook as calendar events — time-blocking is mainstream, scheduled tasks must block calendar
- Real-time or near-real-time sync — users expect changes within 1 minute, Graph webhooks support this
- OAuth authentication ("Connect to Outlook" button) — industry standard for calendar integrations
- Manual sync trigger ("Sync now" button) — fallback for webhook failures, builds user confidence
- Basic conflict detection — warn when creating task overlaps existing event
- Offline sync queue — queue changes while offline, sync on reconnection

**Should have (competitive advantage):**
- True two-way sync (Outlook changes update GTD app) — rare feature, most apps are one-way
- Selective calendar filters (choose which Outlook calendars to display) — corporate users have 10+ shared calendars
- "Outlook wins" conflict resolution with clear communication — explicit strategy builds trust
- Reschedule detection (drag event in Outlook, task updates in GTD) — Todoist standout feature (2026)

**Defer (v2.0+):**
- Auto-decline conflicting meetings — requires additional Graph permissions, complex logic
- Multiple calendar support (sync different projects to different calendars) — valuable but adds UI complexity
- Smart sync suggestions ("This task needs 2 hours, find calendar slot") — AI-driven, not essential for MVP

**Anti-features (avoid):**
- Sync all tasks to calendar (creates clutter) — only sync tasks with date+time+duration
- Sync calendar events as editable tasks (ownership confusion) — display events read-only, offer "Create task from event" action
- Automatic event-to-task conversion (creates duplicate work) — manual "Create task for this event" button instead

### Architecture Approach

The architecture extends the existing offline-first GTD app with three new service layers: Graph authentication (MSAL.js wrapper), Graph API client (HTTP with token injection), and Sync Engine (orchestrates bidirectional delta sync). The key pattern is delta query with deltaLink tokens for efficient incremental sync, paired with an offline queue that processes mutations when connectivity returns.

**Major components:**
1. **MSAL Auth Service** — OAuth 2.0 authorization code flow with PKCE, acquireTokenSilent for automatic refresh, handles 24-hour SPA token lifetime with graceful re-authentication
2. **Graph Client Service** — Wrapper around fetch with automatic Bearer token injection, error handling for 429 throttling (Retry-After header), ETag-based conflict detection (412 Precondition Failed)
3. **Sync Engine** — State machine (idle → syncing → success/error) that orchestrates: pull via delta query (/me/calendarView/delta), push via create/update/delete, conflict resolution ("Outlook wins" policy), offline queue replay
4. **Delta Sync Manager** — Tracks deltaLink tokens in Dexie syncMetadata table, handles token expiry (falls back to full sync after 7 days), processes @removed annotations for deletions, paginates with @odata.nextLink
5. **Offline Sync Queue** — Dexie table storing pending create/update/delete operations with retry count, processes FIFO with pre-execution conflict detection (fetches remote state before applying queued change), handles stale data overwrites

**Data flow patterns:**
- **Outlook → GTD (pull)**: Delta query → process @removed deletions → map Outlook events to Dexie CalendarEvent schema → save deltaLink for next sync
- **GTD → Outlook (push)**: Map CalendarEvent to Outlook event schema → POST/PATCH with If-Match ETag → handle 412 conflicts (fetch current, overwrite local) → save outlookETag
- **Offline queue replay**: Load all queued items → for each, check remote lastModifiedDateTime → if remote newer, treat as conflict (Outlook wins) → execute create/update/delete → remove from queue on success

**Schema changes (Dexie v7):**
- Extend CalendarEvent: add `outlookId`, `outlookETag`, `syncSource` (local/outlook/both), `lastSyncedAt`
- Add syncMetadata table: stores deltaLink URLs per calendar, keyed by 'outlook-calendar-deltaLink'
- Add syncQueue table: stores operation type, entityId, payload, timestamp, retryCount

### Critical Pitfalls

The 15 pitfalls researched fall into four categories: authentication (MSAL + SSR), delta sync edge cases, recurring event complexity, and offline queue conflicts. These are the top 8 that must be addressed during implementation:

1. **Delta token expiry without fallback** — Delta tokens expire after 7 days; apps that don't detect `syncStateNotFound` errors and fall back to full sync break silently. Address in Phase 2 (Delta Sync).

2. **MSAL token storage in SvelteKit SSR** — MSAL.js requires browser storage (`window.localStorage`); initializing in +page.server.ts causes runtime errors. Wrap MSAL in `if (browser)` guards. Address in Phase 1 (OAuth Setup).

3. **Orphaned events after local deletion** — User deletes task offline, event modified in Outlook before reconnect, queue executes blind deletion canceling meeting for all attendees. Check remote `lastModifiedDateTime` before executing queued deletions. Address in Phase 4 (Offline Queue).

4. **Recurring event exception invisibility** — `/events` endpoint returns series masters only; exceptions require `/calendarView` with date ranges. Switch to calendarView for all queries. Address in Phase 3 (Recurring Events).

5. **Time zone conversion for all-day events** — All-day events return midnight UTC timestamps; naive conversion shifts events to wrong day in non-UTC zones. Check `isAllDay` property and ignore timezone field. Address in Phase 3.

6. **Skip token expiry during pagination** — Skip tokens expire in minutes; slow processing (30s per page) causes pagination failures on page 3+. Fetch all pages rapidly without UI updates between pages. Address in Phase 2.

7. **Infinite sync loops from local echo** — Event created offline syncs to Outlook, delta sync treats new Outlook event as separate incoming change, creates duplicate. Store correlation ID in event extensions or mark as "pending sync" to skip during delta. Address in Phase 4.

8. **MSAL refresh token 24-hour expiry** — SPA refresh tokens expire after 24 hours (vs. 90 days for confidential clients); users forced to re-login daily. Implement graceful re-authentication on `interaction_required` errors. Address in Phase 1.

**Common pattern:** Many pitfalls appear only in production environments (corporate Conditional Access policies, large calendars with 1000+ events, 7+ day sync gaps). Happy-path testing in dev misses these entirely.

## Implications for Roadmap

Based on combined research, the architecture naturally suggests a four-phase implementation structure that builds complexity incrementally while validating each layer before proceeding.

### Phase 1: OAuth Foundation
**Rationale:** Authentication is prerequisite for all Graph API calls. MSAL + SvelteKit SSR compatibility must be resolved before building sync logic. Corporate environment concerns (admin consent, Conditional Access policies, 24-hour token lifetime) are blockers that won't surface in dev testing.

**Delivers:** "Connect to Outlook" button, login/logout flow, token acquisition with automatic refresh, graceful re-authentication after 24 hours

**Addresses features:**
- OAuth authentication (table stakes)
- Corporate M365 environment compatibility

**Avoids pitfalls:**
- MSAL SSR incompatibility (Pitfall 2)
- Admin consent failures in corporate tenants (Pitfall 8)
- 24-hour refresh token expiry without re-auth flow (Pitfall 13)
- Conditional Access policies blocking sync (Pitfall 15)

**Validation criteria:**
- User can log in via popup/redirect, see profile, log out
- Tokens acquired silently on subsequent page loads
- Re-authentication triggered gracefully after 24+ hour gap
- Test in production M365 tenant with Conditional Access enabled

**Duration estimate:** 1-2 days

---

### Phase 2: One-Way Sync (Outlook → GTD)
**Rationale:** Read-only sync is lower risk than write and validates Graph API integration, delta query pattern, and event mapping without introducing two-way conflict complexity. This phase establishes the delta sync foundation (token management, pagination, deletion handling) that Phase 3 builds upon.

**Delivers:** "Sync now" button pulls Outlook events into GTD calendar view, delta query for incremental sync, deletion detection, initial sync for 500+ event calendars

**Addresses features:**
- Display Outlook events in GTD calendar view (table stakes)
- Manual sync trigger (table stakes)
- Real-time sync foundation (webhooks added later)

**Avoids pitfalls:**
- Delta token expiry without fallback (Pitfall 1) — detect `syncStateNotFound`, fall back to full sync
- Skip token expiry during pagination (Pitfall 6) — fetch all pages rapidly, batch process
- Rate limiting on initial sync (Pitfall 9) — handle 429 responses, respect Retry-After header
- Missing deleted events (Pitfall 12) — process @removed annotations
- DST boundary errors (Pitfall 11) — use IANA timezone identifiers, test on March/November dates

**Validation criteria:**
- Initial sync completes for 500-2000 event calendars without timeout
- Delta sync fetches only changes (verify with network logs)
- Events deleted in Outlook are removed from local Dexie
- Sync works across DST transition dates

**Duration estimate:** 2-3 days

---

### Phase 3: Two-Way Sync (GTD → Outlook)
**Rationale:** After read works reliably, add write to enable bidirectional sync. Conflict detection with ETag is critical before introducing offline queue (Phase 4) because queued operations need the same conflict logic.

**Delivers:** GTD tasks with scheduled times create Outlook calendar events, updates push to Outlook, ETag-based conflict detection with "Outlook wins" resolution

**Addresses features:**
- Sync tasks-with-times to Outlook (table stakes)
- Basic conflict detection (table stakes)
- "Outlook wins" conflict resolution (differentiator)
- Task-to-event metadata preservation (duration, notes)

**Avoids pitfalls:**
- Use If-Match header with ETag for optimistic concurrency
- Handle 412 Precondition Failed → fetch current Outlook state → overwrite local
- Show user notification: "Event updated from Outlook due to conflict"

**Validation criteria:**
- Create GTD task with time, appears in Outlook within 1 minute
- Update GTD task, Outlook event updates
- Concurrent edit in Outlook during GTD edit → Outlook version wins
- Metadata (title, time, duration, notes) syncs correctly

**Duration estimate:** 2-3 days

---

### Phase 4: Offline Resilience
**Rationale:** Offline support is core to GTD app's existing architecture (Dexie-based). Build after two-way sync works to avoid debugging sync and offline simultaneously. This phase is where complexity peaks—conflict detection, deduplication, stale data handling all come together.

**Delivers:** Queue changes while offline, auto-replay on reconnection, pre-execution conflict detection, correlation IDs to prevent duplicate creation, queue status UI

**Addresses features:**
- Offline sync queue (table stakes)
- Offline-aware sync queue (differentiator)
- Sync status indicators (queue count, last sync time)

**Avoids pitfalls:**
- Orphaned events after deletion (Pitfall 3) — check remote `lastModifiedDateTime` before executing queued deletes
- Infinite sync loops (Pitfall 7) — store correlation ID in event extensions or use "pending sync" flag
- Stale offline data overwrites (Pitfall 10) — fetch remote state before applying queued PATCH, compare timestamps

**Validation criteria:**
- Create event offline, shows in queue, syncs on reconnection without duplicates
- Edit event offline, concurrent edit in Outlook, reconnect → Outlook wins
- Delete event offline, modified in Outlook, reconnect → prompt user or skip deletion
- Queue processes FIFO with retry logic (max 3 retries, then move to dead letter queue)

**Duration estimate:** 2-3 days

---

### Phase 5: Recurring Events & Polish
**Rationale:** Recurring events are common (weekly meetings, daily standups) but add significant complexity. Separated from MVP (Phases 1-4) to avoid blocking basic sync, but required for production readiness. All-day events often recur (holidays), so handled together.

**Delivers:** Recurring event sync with exception handling, all-day event support, improved error messages, loading states, edge case handling

**Addresses features:**
- Recurring event support (table stakes for calendar apps)
- All-day event handling (common in productivity apps)
- User-friendly error messages and sync status

**Avoids pitfalls:**
- Recurring event exception invisibility (Pitfall 4) — use `/calendarView` instead of `/events`
- All-day event timezone issues (Pitfall 5) — check `isAllDay`, ignore timezone, store as date-only
- Series vs. occurrence edit confusion (Pitfall 14) — distinguish series master from occurrence, prompt user

**Validation criteria:**
- Create weekly recurring series in Outlook, all instances appear in GTD
- Edit single occurrence in Outlook, exception syncs correctly
- All-day event displays on correct date in all timezones
- Edit one occurrence vs. edit series distinguished in UI

**Duration estimate:** 2-3 days

---

### Phase Ordering Rationale

**Why this order:**
1. **Authentication first** — Prerequisite for all Graph API calls. Corporate environment issues (admin consent, Conditional Access) are blockers that won't surface until production testing.
2. **Read before write** — One-way sync validates API integration, delta query pattern, error handling without conflict complexity.
3. **Online two-way before offline** — Establish conflict detection with ETag before adding queue-based offline mutations that need the same conflict logic.
4. **Offline as complexity layer** — Queue management, deduplication, stale data handling amplify sync complexity. Build only after core sync is solid.
5. **Recurring events separate from MVP** — High complexity (series masters, exceptions, calendarView endpoint), but required for production. Defer to avoid blocking basic sync.

**Dependency chain:**
- Phase 2 requires Phase 1 (auth needed for delta queries)
- Phase 3 requires Phase 2 (write builds on read patterns, ETag from delta sync)
- Phase 4 requires Phase 3 (offline queue uses same conflict logic as online sync)
- Phase 5 requires Phase 2-4 (recurring events layer on top of working sync engine)

**Risk mitigation:**
- Each phase has validation criteria that must pass before proceeding
- Phases 1-2 validate in dev environment; Phases 3-4 require production-like testing (large calendars, corporate policies, offline scenarios)
- Total duration: 8-13 days with validation gates between phases

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 5 (Recurring Events):** Graph API recurring event model is complex (series masters, instances, exceptions). May need phase-specific research on `/instances` endpoint, exception handling, RRULE mapping.

**Phases with well-documented patterns (skip research-phase):**
- **Phase 1 (OAuth):** MSAL.js is extensively documented by Microsoft. SvelteKit integration patterns established via community examples.
- **Phase 2 (Delta Sync):** Delta query pattern thoroughly documented in Microsoft Graph docs. Standard implementation.
- **Phase 3 (Two-Way Sync):** ETag-based conflict detection is standard REST pattern. Microsoft Graph docs cover this well.
- **Phase 4 (Offline Queue):** Queue-store-detect-sync pattern well-known from offline-first architectures. Dexie usage already established in app.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | MSAL v4.28.1 and Graph SDK v3.0.7 versions verified via GitHub releases. Bundle size measured. Only uncertainty is MSAL v5.x timeline for stabilization. |
| Features | MEDIUM-HIGH | Based on competitor analysis (Todoist, TickTick, OmniFocus) and productivity app trends. Not validated with actual GTD app users. Table stakes features have high confidence; differentiators (reschedule detection, metadata sync) medium confidence. |
| Architecture | HIGH | Delta query, MSAL auth, offline queue patterns extensively documented in Microsoft Learn and community implementations. SvelteKit integration patterns proven via community examples (andreideak/sveltekit-msal-spa). |
| Pitfalls | HIGH | All 15 pitfalls verified with official Microsoft documentation or Microsoft Q&A forum reports from real developers. Delta token expiry, SSR incompatibility, recurring event exceptions confirmed in official docs. Corporate environment issues (Conditional Access, admin consent) documented in Microsoft Tech Community. |

**Overall confidence:** HIGH

### Gaps to Address

**During planning:**
- Recurring event RRULE mapping complexity — Graph API uses own recurrence schema, GTD app uses RFC 5545 RRULE strings. May need transformation logic. Validate during Phase 5 planning.
- Webhook implementation details — Research focused on delta query (pull). Webhooks for push notifications are mentioned but not deeply researched. Consider phase-specific research if implementing real-time updates beyond delta query.

**During implementation:**
- Corporate IT approval process — Document required permissions (`Calendars.ReadWrite`, `User.Read`, `offline_access`) for IT admin review before rollout. Unknown timeline for admin consent in large orgs.
- Graph API rate limits — Official limits not published, vary by tenant. Monitor 429 responses in production to establish actual limits for this app's usage pattern.
- Performance at scale — Unknown how delta query performs with 2000+ events in corporate calendars. Load testing needed in Phase 2.
- Background Sync API compatibility — Service Worker Background Sync support varies by browser. Test in target corporate environment (may be disabled by IT policy).

**Validation needed:**
- User preference on all-day task sync — Research suggests requiring time+duration for sync, but GTD users may want all-day task blocking. Consider optional "Sync as all-day event" checkbox (defer to user testing).
- Conflict resolution UX — "Outlook wins" is clear policy, but user may want to see diff view when conflicts occur. Consider Phase 4+ enhancement based on user feedback.

## Sources

### Primary (HIGH confidence)
- Microsoft Graph API Official Documentation — delta query, event API, throttling, recurring events, timezone handling
- MSAL.js Official Documentation — caching, token lifetimes, SPA flows, best practices
- Microsoft Learn — authorization code flow, Conditional Access, calendar API overview
- Microsoft Graph GitHub — MSAL.js releases, Graph SDK releases, version history

### Secondary (MEDIUM confidence)
- Microsoft Q&A Forums — real-world developer issues (delta token expiry, all-day event timezones, pagination errors, admin consent failures)
- Microsoft Tech Community — Graph API throttling guidance, Conditional Access changes, recurring event endpoints
- SvelteKit Community Examples — andreideak/sveltekit-msal-spa, varu87 Medium article on Azure AD auth in SvelteKit
- Competitor Documentation — Todoist calendar integration, OmniFocus Forecast view, TickTick Google Calendar sync

### Tertiary (LOW confidence)
- Offline-first architecture articles — DEV.to cascading complexity, LogRocket IndexedDB patterns (general patterns, not Graph-specific)
- WebSearch results on calendar sync best practices — general guidance, not Microsoft Graph specific

---
*Research completed: 2026-01-31*
*Ready for roadmap: yes*
