# Pitfalls Research

**Domain:** Outlook Calendar Sync via Microsoft Graph API
**Researched:** 2026-01-31
**Confidence:** HIGH

**Context:** Adding two-way Outlook calendar sync to existing SvelteKit 2 + Svelte 5 + Dexie IndexedDB offline-first GTD app. Single user, corporate M365 environment, OAuth 2.0 via MSAL, Outlook wins conflicts.

---

## Critical Pitfalls

### Pitfall 1: Delta Token Expiry Without Fallback Strategy

**What goes wrong:**
Delta tokens expire after 7 days for Outlook entities. When you attempt to sync with an expired token, Microsoft Graph returns a 40X-series error (e.g., `syncStateNotFound`). If your app doesn't detect this and fall back to a full sync, synchronization breaks silently until the user reports missing events.

**Why it happens:**
Developers assume delta tokens are permanent or don't implement error handling for token expiry. Apps that sync infrequently (e.g., user hasn't opened app in 10 days) hit this regularly.

**How to avoid:**
- Detect `syncStateNotFound` errors in delta query responses
- Automatically fall back to full sync (empty `$deltatoken`) when token expires
- Store last successful sync timestamp to identify stale delta tokens before making the request
- Test with simulated 7+ day gaps in sync activity

**Warning signs:**
- Users report "missing events" after not using app for a week
- Error logs show 40X-series responses from delta endpoint
- Sync appears to succeed but no changes are detected

**Phase to address:**
**Phase 2: Delta Sync** - Implement delta token expiry detection and full sync fallback before considering this feature complete.

---

### Pitfall 2: MSAL Token Storage in SvelteKit SSR Environment

**What goes wrong:**
MSAL.js defaults to browser storage (sessionStorage/localStorage), but SvelteKit SSR executes on the server where `window.localStorage` doesn't exist. Attempting to initialize MSAL in `+page.server.ts` or server hooks causes runtime errors. Even if you use client-only initialization, tokens stored in localStorage are invisible to SSR-rendered pages, breaking protected routes.

**Why it happens:**
Developers treat SvelteKit like a pure SPA and don't account for the server-side execution context. MSAL.js is designed for browser environments and doesn't handle SSR natively.

**How to avoid:**
- Use **browser-only initialization**: wrap MSAL in `if (browser)` checks from `$app/environment`
- Store MSAL tokens in **HTTP-only cookies** via server endpoints for SSR access
- Use MSAL-Node for confidential client flows if you need server-side token management
- Consider Auth.js wrapper for easier SvelteKit integration (handles SSR + cookies automatically)
- Never initialize MSAL in `+layout.server.ts` or `hooks.server.ts`

**Warning signs:**
- `ReferenceError: localStorage is not defined` during SSR
- Authentication works in dev but breaks in production SSR builds
- Protected routes accessible when they shouldn't be (server can't verify tokens)

**Phase to address:**
**Phase 1: OAuth Setup** - Resolve SSR/MSAL compatibility before proceeding to API integration. This is foundational.

---

### Pitfall 3: Orphaned Events After Local Deletion

**What goes wrong:**
User deletes a task locally while offline. Sync queue records the deletion. Before reconnect, the same event is modified in Outlook (e.g., time changed). When sync resumes, your app deletes the event from Outlook, but because the organizer's deletion sends cancellation emails to all attendees, the user accidentally cancels a meeting they meant to reschedule.

**Why it happens:**
"Outlook wins conflicts" policy doesn't account for deletion vs. modification conflicts. Your app treats local deletion as authoritative without checking if the remote event has been updated.

**How to avoid:**
- Check event's `lastModifiedDateTime` before executing queued deletions
- If remote `lastModifiedDateTime` is newer than queued deletion timestamp, treat as a conflict
- Prompt user or auto-resolve: "This event was changed in Outlook. Still delete?"
- Never execute blind deletions from offline queue without conflict detection
- Consider soft-delete pattern: mark as deleted locally, verify remotely before hard delete

**Warning signs:**
- Meeting attendees receive cancellation emails unexpectedly
- Events deleted locally reappear after sync (user manually deletes again, creating frustration)
- Sync logs show successful DELETE calls for events that were modified remotely

**Phase to address:**
**Phase 4: Offline Queue** - Add conflict detection logic to queued operations before executing. Critical for two-way sync integrity.

---

### Pitfall 4: Recurring Event Exception Invisibility

**What goes wrong:**
User modifies a single occurrence of a recurring meeting in Outlook (e.g., "move Tuesday's standup to 2pm just this week"). Your app queries `/me/events` and only sees the series master event, missing the exception. The local calendar shows the wrong time for that occurrence because exceptions aren't returned by the `/events` endpoint.

**Why it happens:**
Microsoft Graph API design: `/events` returns series masters only; exceptions require `/calendarView` with date range queries. Developers expect all events from a single endpoint.

**How to avoid:**
- Use `/me/calendarView?startDateTime=X&endDateTime=Y` instead of `/me/events` for recurring events
- Query calendarView with 30-60 day rolling windows to catch exceptions
- When delta syncing, combine `/events/delta` (for new series) with periodic calendarView refreshes
- Store `seriesMasterId` in your Dexie schema to link occurrences to series
- Mark exceptions with `type: 'exception'` to distinguish from regular events

**Warning signs:**
- Users report "wrong time" for specific recurring event instances
- One-off changes in Outlook don't appear in your app
- Event count mismatches between Outlook and your app

**Phase to address:**
**Phase 3: Recurring Events** - Switch to calendarView endpoint for occurrence expansion. Test with series that have exceptions.

---

### Pitfall 5: Time Zone Conversion for All-Day Events

**What goes wrong:**
All-day events created in Outlook Desktop return `timeZone: "UTC"` via Graph API, even though the user created them in PST. Your app displays "12:00 AM UTC" instead of treating them as date-only events, causing events to appear on the wrong day in certain time zones (e.g., PST user sees event on previous day).

**Why it happens:**
Outlook Desktop and Outlook Web handle all-day event time zones differently. Graph API returns whatever the client stored. All-day events should be date-only (no time component), but the API includes midnight timestamps with UTC timezone, which your app naively converts to local time.

**How to avoid:**
- Check event's `isAllDay` property first
- If `isAllDay === true`, ignore the `timeZone` field and display as date-only
- Store all-day events in Dexie without time component (e.g., `date: '2026-01-31'` not `datetime: 'ISO string'`)
- When creating all-day events via API, set both `start` and `end` to midnight with user's local timezone (not UTC)
- Never perform timezone conversions on all-day events

**Warning signs:**
- All-day events appear on previous or next day for users in non-UTC zones
- Events show as "12:00 AM - 12:00 AM" instead of "All day"
- Discrepancies between Desktop Outlook and your app for same event

**Phase to address:**
**Phase 3: Recurring Events** - All-day events often recur (e.g., holidays), so handle this in the same phase as recurrence logic.

---

### Pitfall 6: Skip Token Expiry During Pagination

**What goes wrong:**
Delta query returns 500 events with `@odata.nextLink` containing a `$skiptoken`. Your app processes each page slowly (e.g., 30 seconds per page for UI updates). By page 3, the skip token has expired (skip tokens expire in minutes), and the API returns `UnknownError` or `_Directory_ExpiredPageToken`. Sync halts midway with partial data.

**Why it happens:**
Skip tokens are short-lived (minutes, not hours). Slow processing or rate-limiting delays between paginated requests cause token expiry. Developers assume tokens last as long as delta tokens (7 days).

**How to avoid:**
- Fetch all pages as quickly as possible without UI updates between pages
- Batch-process: collect all pages into memory first, then update IndexedDB in one transaction
- If skip token expires (410 Gone or UnknownError), restart from last successful `@odata.deltaLink`
- Use `$top=500` to minimize page count and reduce token expiry risk
- Monitor response time between pagination requests (target <5 seconds)

**Warning signs:**
- Sync completes with fewer events than expected
- Logs show `UnknownError` on subsequent pages after initial success
- Sync works for small calendars but fails for power users with 1000+ events

**Phase to address:**
**Phase 2: Delta Sync** - Optimize pagination handling before scaling to production. Test with large calendars (500+ events).

---

### Pitfall 7: Infinite Sync Loops from Local Echo

**What goes wrong:**
User creates event locally while offline. Offline queue syncs it to Outlook, creating a new event with Graph-assigned ID. Delta sync immediately detects "new event from Outlook" and creates a duplicate in local Dexie. Now you have two copies: one with local temp ID, one with Graph ID.

**Why it happens:**
No deduplication logic to match queued local creates with resulting Graph API responses. Delta sync treats the newly created Outlook event as a separate incoming change.

**How to avoid:**
- When queued POST succeeds, immediately update local record's ID to match Graph response `id`
- Store correlation ID (e.g., local UUID) in event's `extensions` or `singleValueExtendedProperties` to match during delta
- Mark local records as "pending sync" and skip them during delta processing
- After successful POST, remove event from delta results by ID before processing
- Use optimistic UI updates: update local ID synchronously after POST success

**Warning signs:**
- Duplicate events appear after first sync following offline creation
- Event count doubles after sync
- Users report "same event appears twice with slightly different times"

**Phase to address:**
**Phase 4: Offline Queue** - Implement correlation ID system and post-sync deduplication before launching offline support.

---

### Pitfall 8: Admin Consent Failures in Corporate Environment

**What goes wrong:**
Your app requests `Calendars.ReadWrite` permission. User clicks "sign in with Microsoft" and sees "Need admin approval" instead of consent screen. User can't use the app until IT admin manually grants consent, which takes days or weeks in large orgs. Product appears broken.

**Why it happens:**
Corporate M365 tenants often require admin consent for certain permissions via Conditional Access policies. User consent is blocked by tenant policy, not your app configuration. This is invisible during development (dev tenant may allow user consent).

**How to avoid:**
- Document required permissions for IT admins before rollout
- Provide admin consent URL: `https://login.microsoftonline.com/{tenant}/admins/consent?client_id={id}`
- Detect consent errors in MSAL callback and show helpful message: "Your IT admin needs to approve this app"
- Test in production-like tenant with Conditional Access policies enabled
- Consider using least-privilege scopes first (e.g., `Calendars.Read` for preview) then request write later
- Work with customer's IT team to pre-approve app before launch

**Warning signs:**
- Works in dev environment but fails in production tenant
- Error messages contain "AADSTS65001" (admin approval required)
- No way for users to proceed without IT involvement

**Phase to address:**
**Phase 1: OAuth Setup** - Validate permissions and consent flows in target corporate environment during initial setup.

---

### Pitfall 9: Rate Limiting During Initial Full Sync

**What goes wrong:**
First-time sync for a power user with 2000 calendar events triggers delta query pagination. Your app makes 4 requests in rapid succession (500 events per page). Microsoft Graph throttles the 5th request with `429 Too Many Requests`. Your app doesn't implement retry logic and sync fails permanently until user refreshes.

**Why it happens:**
Calendar API rate limits are per-user but not published (varies by tenant). Rapid-fire requests during initial sync exceed threshold. App doesn't handle 429 responses.

**How to avoid:**
- Detect 429 responses and extract `Retry-After` header (seconds to wait)
- Implement exponential backoff if no `Retry-After` provided (1s, 2s, 4s, 8s...)
- Add delay between pagination requests (e.g., 500ms) to avoid hitting limits
- Use Microsoft Graph SDKs where possible (built-in throttling handling)
- Log throttling events to monitor frequency (too many = architectural issue)
- For bulk operations, consider Graph Data Connect (no throttling) if eligible

**Warning signs:**
- Sync fails for users with large calendars but works for small ones
- Error logs show `TooManyRequests` or HTTP 429
- Subsequent retries succeed without code changes (suggests transient throttling)

**Phase to address:**
**Phase 2: Delta Sync** - Add throttling detection and retry logic before initial user testing. Essential for production reliability.

---

### Pitfall 10: Stale Offline Data Overwriting Recent Changes

**What goes wrong:**
User opens app offline, edits event title at 9:00 AM. At 9:05 AM (still offline), they edit the same event in Outlook Web from another device. At 9:10 AM, they reconnect. Offline queue executes queued PATCH with 9:00 AM data, overwriting the 9:05 AM Outlook change. "Outlook wins conflicts" policy is violated.

**Why it happens:**
Offline queue processes in FIFO order without checking current remote state. No conflict detection before applying queued changes.

**How to avoid:**
- Before executing queued PATCH, fetch current event from Graph API
- Compare `lastModifiedDateTime`: if remote > queued timestamp, conflict exists
- Conflict resolution options:
  - Merge changes if non-overlapping fields (complex)
  - Discard queued change (honor "Outlook wins" policy)
  - Prompt user with diff view (best UX, most work)
- Store `lastModifiedDateTime` with queued operations for comparison
- Consider marking conflicted items in UI: "Changes couldn't be synced. View conflict."

**Warning signs:**
- Users report "my changes disappeared" after reconnecting
- Outlook changes are lost despite "Outlook wins" policy
- Sync appears successful but data reverts to old state

**Phase to address:**
**Phase 4: Offline Queue** - Implement pre-execution conflict detection. Critical for maintaining trust in sync.

---

### Pitfall 11: Daylight Saving Time Boundary Errors

**What goes wrong:**
User creates event on March 10, 2026 at 2:30 AM PST. This time doesn't exist due to DST transition (clocks jump from 2:00 AM to 3:00 AM). Graph API rejects the event creation with a validation error or shifts it to 3:30 AM unexpectedly.

**Why it happens:**
DST transitions create non-existent times (spring forward) and ambiguous times (fall back). APIs handle these inconsistently. Developers hardcode offsets instead of using timezone-aware libraries.

**How to avoid:**
- Use IANA timezone identifiers (`America/Los_Angeles`) not UTC offsets (`-08:00`)
- Let Graph API handle DST calculations by providing proper `dateTimeTimeZone` objects:
  ```json
  {
    "start": {
      "dateTime": "2026-03-10T02:30:00",
      "timeZone": "America/Los_Angeles"
    }
  }
  ```
- Use `Temporal` API (if available) or `date-fns-tz` library for local time zone handling
- Validate times during DST boundaries: reject 2:00-3:00 AM on spring forward dates
- Test calendar operations specifically on DST transition dates (March 9-10, November 1-2)

**Warning signs:**
- Events created near 2 AM on DST dates appear at wrong times
- Error messages about invalid times during spring DST transition
- Events shift by one hour unexpectedly on fall DST transition

**Phase to address:**
**Phase 2: Delta Sync** - Implement timezone handling correctly from the start. Hard to refactor later.

---

### Pitfall 12: Missing Deleted Events in Delta Responses

**What goes wrong:**
User deletes event in Outlook. Delta query runs but your app doesn't detect the deletion because you're not checking the `@removed` annotation. Deleted events remain in local Dexie database indefinitely, causing "ghost events" that don't exist in Outlook.

**Why it happens:**
Deleted events appear in delta responses with `@removed: {"reason": "deleted"}` annotation, not as HTTP 404s. Developers expect deletions to be obvious or assume events simply won't appear. The annotation is easily overlooked in response parsing.

**How to avoid:**
- Check every delta response item for `@removed` annotation
- Parse and handle: `if (event["@removed"]) { deleteFromDexie(event.id); }`
- Log full delta response JSON during development to verify deletion detection
- Maintain delta token properly (deletions only appear if token is current)
- Test deletion scenarios: delete in Outlook, sync, verify local removal

**Warning signs:**
- Event count grows over time but never shrinks
- Users report "deleted events still showing" in app
- Outlook and app event counts diverge (app has more)

**Phase to address:**
**Phase 2: Delta Sync** - Implement deletion handling in same phase as delta sync. Non-negotiable for correctness.

---

### Pitfall 13: MSAL Refresh Token Expiry After 24 Hours

**What goes wrong:**
User signs in, uses app for 2 hours, closes browser. Returns 25 hours later and clicks "sync". App calls `acquireTokenSilent()` which fails because refresh token expired (24-hour lifetime for SPAs). User is forced to sign in again, losing trust in "stay signed in" functionality.

**Why it happens:**
Microsoft limits SPA refresh tokens to 24 hours for security. Unlike confidential clients (90-day tokens), browser apps have short-lived tokens. Developers assume refresh tokens last weeks.

**How to avoid:**
- Accept 24-hour limitation (security by design, can't be changed)
- Implement graceful re-authentication:
  - Catch `acquireTokenSilent()` failures
  - Automatically trigger `loginPopup()` or `loginRedirect()`
  - Preserve app state during re-auth (store in sessionStorage)
- Set user expectation: "You'll need to sign in again every 24 hours"
- Consider `interaction_required` error handling in every Graph API call
- Use MSAL's automatic token renewal (happens before expiry if app is open)

**Warning signs:**
- Users report "randomly logged out" after a day
- Error logs show `interaction_required` errors after 24 hours
- Sync fails silently when tokens expire

**Phase to address:**
**Phase 1: OAuth Setup** - Implement robust token renewal and re-auth flows before building on top of authentication.

---

### Pitfall 14: Recurring Series Edit vs. Single Occurrence Edit Confusion

**What goes wrong:**
User clicks "edit" on a recurring event occurrence. Your app shows edit form but sends PATCH to `/events/{seriesMasterId}`, modifying the entire series instead of just that occurrence. All instances of the meeting are now at the wrong time.

**Why it happens:**
Graph API has different endpoints for series vs. occurrence edits:
- Series: `PATCH /events/{seriesMasterId}`
- Occurrence: `PATCH /events/{occurrenceId}` (requires calling `/instances` first to get occurrence ID)

Developers use the event ID directly without checking if it's a series or occurrence.

**How to avoid:**
- Check event's `type` property: `seriesMaster`, `occurrence`, `exception`, or `singleInstance`
- For series, prompt user: "Edit this occurrence or all occurrences?"
- To edit single occurrence:
  1. Call `/events/{seriesMasterId}/instances?startDateTime=X&endDateTime=Y`
  2. Find specific occurrence by date
  3. PATCH `/events/{occurrenceId}`
- Store `type` and `seriesMasterId` in Dexie to track relationship
- UI should clearly indicate series vs. single event

**Warning signs:**
- Users report "changed one meeting, all instances changed"
- Entire series updates when user expects single occurrence edit
- Exceptions are lost after edits

**Phase to address:**
**Phase 3: Recurring Events** - Distinguish series vs. occurrence operations from the start. Critical for correct recurring event handling.

---

### Pitfall 15: Conditional Access Policy Breaking Unattended Sync

**What goes wrong:**
User successfully authenticates during work hours. At 2 AM, background sync runs (if implemented) and fails because corporate Conditional Access policy requires MFA during off-hours access. Sync breaks silently overnight.

**Why it happens:**
Conditional Access policies can require additional authentication based on time, location, or device state. Policies are evaluated per-request, not just at sign-in. Background processes can't prompt for MFA.

**How to avoid:**
- Avoid true background sync in corporate environments (can't satisfy interactive policies)
- Use foreground sync only: trigger when user opens app (can prompt for MFA)
- Detect Conditional Access errors: `AADSTS50076` (MFA required)
- Show user-friendly message: "Additional verification required. Please sign in."
- Work with IT to understand tenant policies before implementing sync patterns
- Consider: do you need background sync, or is foreground-only acceptable?

**Warning signs:**
- Sync works during business hours but fails at night/weekends
- Error logs show `AADSTS50076` or `interaction_required` errors
- Users outside corporate network can't sync (location-based policies)

**Phase to address:**
**Phase 1: OAuth Setup** - Validate sync patterns against tenant Conditional Access policies. Adjust architecture if needed.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store tokens in localStorage without XSS protection | Simpler implementation | Vulnerable to token theft via XSS | Never (implement CSP + XSS prevention first) |
| Use `/events` instead of `/calendarView` | Faster queries, simpler pagination | Misses recurring event exceptions | Only if recurring events aren't supported |
| Skip conflict detection in offline queue | Faster sync, simpler code | Data loss when remote changed during offline period | Never for two-way sync |
| Ignore `@removed` annotations | Less parsing code | Ghost events accumulate indefinitely | Never |
| Hard-code UTC offsets instead of timezone identifiers | Easier to understand | Breaks during DST transitions | Never (DST is real) |
| Use default sessionStorage for MSAL | Good balance of security/UX | Lose auth across tabs | Acceptable for single-tab apps |
| Poll for changes instead of delta queries | Simpler implementation | Massive bandwidth waste, slower sync | Never (delta is designed for this) |
| FIFO queue processing without pre-execution checks | Simpler queue logic | Stale data overwrites recent changes | Never for "Outlook wins" strategy |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| SvelteKit SSR + MSAL | Initialize MSAL in server hooks | Browser-only initialization with `if (browser)` guards |
| Dexie + Graph API IDs | Use local auto-increment IDs | Use Graph-assigned UUIDs as primary keys |
| Offline queue + delta sync | Process queue after delta sync | Process queue first, then delta (queue is older data) |
| Recurring events + local edits | Edit series master for all changes | Distinguish occurrence vs. series edits |
| All-day events + timezone | Convert to user's local timezone | Store as date-only, ignore timezone field |
| Delta sync + pagination | Process pages sequentially with delays | Fetch all pages rapidly, then process in batch |
| MSAL tokens + HTTP-only cookies | Store in localStorage, read in server hooks | MSAL in browser, separate cookie-based session for SSR |
| Graph API errors + retry logic | Retry immediately after 429 | Respect `Retry-After` header or use exponential backoff |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing access tokens in localStorage without XSS prevention | Token theft via XSS attack | Implement Content Security Policy, use sessionStorage, or memoryStorage |
| Not validating `Retry-After` header before retry | Banned from API for aggressive retries | Always check and respect throttling headers |
| Exposing delta tokens in client-side logs | Allows unauthorized sync access | Never log tokens; use `[REDACTED]` in debug output |
| Allowing any redirect URI in MSAL config | OAuth redirect attacks | Whitelist exact redirect URIs in Azure AD app registration |
| Not verifying token scopes before API calls | Unexpected permission denied errors | Check acquired token scopes match required permissions |
| Storing refresh tokens in IndexedDB | Long-lived token accessible to XSS | Let MSAL manage tokens; never extract refresh tokens |
| Using HTTP (not HTTPS) for redirect URIs | MITM attacks steal authorization codes | Always use HTTPS (Azure AD rejects HTTP in production) |
| Hard-coding tenant ID for multi-tenant scenarios | App breaks for external users | Use `common` or `organizations` tenant in MSAL config |

---

## "Looks Done But Isn't" Checklist

These features appear complete in happy-path testing but fail in production:

- [ ] **Calendar sync:** Often missing deletion handling — verify `@removed` annotations are processed
- [ ] **Recurring events:** Often missing exception handling — verify calendarView query with date ranges
- [ ] **Offline queue:** Often missing conflict detection — verify pre-execution remote state checks
- [ ] **Delta sync:** Often missing token expiry fallback — verify full sync after 7+ day gap
- [ ] **Time zones:** Often missing DST validation — verify events on March 9-10, Nov 1-2
- [ ] **MSAL integration:** Often missing SSR compatibility — verify no `window` refs in server code
- [ ] **Rate limiting:** Often missing retry logic — verify 429 response handling with delays
- [ ] **All-day events:** Often missing date-only storage — verify no timezone conversions
- [ ] **Admin consent:** Often missing corporate environment testing — verify in production tenant
- [ ] **Token refresh:** Often missing 24-hour re-auth flow — verify graceful re-login after expiry

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification Method |
|---------|------------------|---------------------|
| MSAL SSR incompatibility | Phase 1: OAuth Setup | Test initialization in `+layout.server.ts` (should fail safely) |
| Admin consent failures | Phase 1: OAuth Setup | Test in production tenant with Conditional Access enabled |
| MSAL refresh token 24hr expiry | Phase 1: OAuth Setup | Test re-auth flow after simulated 25-hour gap |
| Conditional Access breaking sync | Phase 1: OAuth Setup | Test sync outside business hours / off-network |
| Delta token expiry | Phase 2: Delta Sync | Simulate 7+ day gap, verify full sync fallback |
| Skip token expiry during pagination | Phase 2: Delta Sync | Test with 1000+ event calendar, add delays between pages |
| Rate limiting on initial sync | Phase 2: Delta Sync | Test with 2000+ events, verify 429 handling and retry |
| Missing deleted events | Phase 2: Delta Sync | Delete event in Outlook, sync, verify local removal |
| DST boundary errors | Phase 2: Delta Sync | Create events at 2:00-3:00 AM on March 10, 2026 |
| All-day event timezone issues | Phase 3: Recurring Events | Create all-day event in PST, verify displays on correct date |
| Recurring event exception invisibility | Phase 3: Recurring Events | Edit single occurrence in Outlook, verify in app |
| Series vs. occurrence edit confusion | Phase 3: Recurring Events | Edit one occurrence, verify series unchanged |
| Orphaned events after deletion | Phase 4: Offline Queue | Delete event offline, modify in Outlook, reconnect, verify behavior |
| Infinite sync loops from local echo | Phase 4: Offline Queue | Create event offline, sync, verify no duplicates |
| Stale offline data overwriting | Phase 4: Offline Queue | Edit offline, edit in Outlook, reconnect, verify Outlook wins |

---

## Phase-Specific Deep Dives

### Phase 1: OAuth Setup — Critical Pitfalls

**Must solve before proceeding:**
1. MSAL + SvelteKit SSR compatibility (Pitfall 2)
2. Corporate admin consent requirements (Pitfall 8)
3. 24-hour token refresh limitations (Pitfall 13)
4. Conditional Access policy compatibility (Pitfall 15)

**Why these are blockers:** Authentication is foundational. If MSAL doesn't work in SSR context or users can't get past consent, nothing else matters.

**Testing requirements:**
- Verify in production M365 tenant (not dev tenant)
- Test with Conditional Access policies enabled
- Simulate 24+ hour gaps to trigger re-authentication
- Test across tabs (sessionStorage) vs. persistent (localStorage) trade-offs

---

### Phase 2: Delta Sync — Critical Pitfalls

**Must solve before proceeding:**
1. Delta token expiry fallback (Pitfall 1)
2. Skip token expiry during pagination (Pitfall 6)
3. Rate limiting and retry logic (Pitfall 9)
4. Deletion detection via `@removed` (Pitfall 12)
5. DST boundary handling (Pitfall 11)

**Why these are blockers:** Delta sync is the sync engine. If it doesn't handle edge cases (token expiry, throttling, deletions), sync becomes unreliable.

**Testing requirements:**
- Test with calendars containing 500-2000 events
- Simulate 7+ day gaps in sync activity
- Delete events and verify removal in local DB
- Test on DST transition dates (March/November)
- Intentionally throttle requests to verify retry logic

---

### Phase 3: Recurring Events — Critical Pitfalls

**Must solve before proceeding:**
1. Switching to calendarView for exceptions (Pitfall 4)
2. All-day event timezone handling (Pitfall 5)
3. Series vs. occurrence edit distinction (Pitfall 14)

**Why these are blockers:** Recurring events are common (weekly standups, daily reminders). If exceptions don't sync or edits affect wrong instances, feature is broken.

**Testing requirements:**
- Create weekly series, edit single occurrence in Outlook
- Create all-day recurring event (e.g., holiday series)
- Edit series master vs. occurrence in app
- Verify exceptions persist through sync round-trips

---

### Phase 4: Offline Queue — Critical Pitfalls

**Must solve before proceeding:**
1. Pre-execution conflict detection (Pitfall 10)
2. Deduplication to prevent sync loops (Pitfall 7)
3. Deletion conflict resolution (Pitfall 3)

**Why these are blockers:** Offline support is the value proposition for offline-first apps. If queued changes lose data or create duplicates, users lose trust.

**Testing requirements:**
- Airplane mode testing: edit offline, edit in Outlook, reconnect
- Create event offline, sync, verify single copy with Graph ID
- Delete event offline, modify in Outlook, reconnect, verify "Outlook wins"
- Test queue processing order (FIFO with conflict detection)

---

## Sources

**Microsoft Graph API Documentation:**
- [Working with calendars and events - Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/resources/calendar-overview?view=graph-rest-1.0)
- [Use delta query to track changes - Microsoft Graph](https://learn.microsoft.com/en-us/graph/delta-query-overview)
- [Microsoft Graph throttling guidance](https://learn.microsoft.com/en-us/graph/throttling)
- [Microsoft Graph service-specific throttling limits](https://learn.microsoft.com/en-us/graph/throttling-limits)
- [Schedule repeating appointments as recurring events - Microsoft Graph](https://learn.microsoft.com/en-us/graph/outlook-schedule-recurring-events)
- [Delete event - Microsoft Graph v1.0](https://learn.microsoft.com/en-us/graph/api/event-delete?view=graph-rest-1.0)
- [dateTimeTimeZone resource type - Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/resources/datetimetimezone?view=graph-rest-1.0)

**MSAL Authentication:**
- [Best practices for MSAL.NET](https://learn.microsoft.com/en-us/entra/msal/dotnet/getting-started/best-practices)
- [Token lifetimes, expiration and renewal - MSAL Browser](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/token-lifetimes)
- [Caching in MSAL.js](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/caching)
- [MSAL Browser Token Lifetimes GitHub](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/token-lifetimes.md)
- [MSAL Browser Caching GitHub](https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/caching.md)

**Microsoft Q&A Forums (Real-World Issues):**
- [Microsoft Graph API receiving 400 UnknownError when getting second page of delta query](https://learn.microsoft.com/en-us/answers/questions/2246850/microsoft-graph-api-receiving-400-unknownerror-whe)
- [All-Day events not including timezone](https://learn.microsoft.com/en-us/answers/questions/1157038/all-day-events-not-including-timezone)
- [Creating Events in Graph API in Daylight Savings sets time incorrectly](https://learn.microsoft.com/en-us/answers/questions/342562/creating-events-in-graph-api-in-daylight-savings-s)
- [/events should return ALL exceptions to recurring events](https://techcommunity.microsoft.com/t5/microsoft-365-developer-platform/events-should-return-all-exceptions-to-recurring-events-instead/idi-p/3601013)
- [Graph API list instances doesn't return all the events listed in Outlook calendar](https://learn.microsoft.com/en-us/answers/questions/838915/graph-api-list-instances-doesnt-return-all-the-eve)
- [MSAL refresh token expires after 24 hours for mobile and desktop app](https://learn.microsoft.com/en-us/answers/questions/2284140/msal-refresh-token-expires-after-24-hours-for-mobi)
- [Tenant-Specific 'Admin Approval Required' Issue After User Consent](https://learn.microsoft.com/en-us/answers/questions/5709982/tenant-specific-admin-approval-required-issue-afte)

**Offline-First Architecture:**
- [The Cascading Complexity of Offline-First Sync - DEV Community](https://dev.to/biozal/the-cascading-complexity-of-offline-first-sync-why-crdts-alone-arent-enough-2gf)
- [Offline-first frontend apps in 2025: IndexedDB and SQLite in the browser - LogRocket](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/)
- [Offline vs. Real-Time Sync: Managing Data Conflicts - Adalo](https://www.adalo.com/posts/offline-vs-real-time-sync-managing-data-conflicts)

**SvelteKit Integration:**
- [Azure AD Authentication in SvelteKit - Medium](https://medium.com/@varu87/azure-ad-authentication-in-sveltekit-f596cfa8a349)
- [Securing SvelteKit app with Auth.js and Microsoft EntraID - Medium](https://medium.com/@sanjeevm/securing-sveltekit-app-with-auth-js-and-microsoft-entraid-41a8729962a4)
- [SSR Authentication guide for SvelteKit](https://blog.andrasbacsai.com/ssr-authentication-guide-for-sveltekit)

**Calendar Sync Best Practices:**
- [How to avoid Microsoft Graph API throttling and optimize network traffic - DEV Community](https://dev.to/this-is-learning/how-to-avoid-microsoft-graph-api-throttling-and-optimize-network-traffic-5c2g)
- [Graph API - how to avoid throttling - Microsoft Tech Community](https://techcommunity.microsoft.com/blog/fasttrackforazureblog/graph-api-integration-for-saas-developers/4038603)
- [Automate removal of orphaned meetings - GitHub Gist](https://gist.github.com/krzyswo/6e77a15522b2c6b06d6b0688f4994937)
- [How to remove meetings from all Microsoft 365 mailboxes via Graph API](https://michev.info/blog/post/6300/how-to-remove-meetings-from-all-microsoft-365-mailboxes-via-the-graph-api)

**Conditional Access Changes (2026):**
- [Upcoming Conditional Access change: Improved enforcement for policies with resource exclusions](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/upcoming-conditional-access-change-improved-enforcement-for-policies-with-resour/4488925)
- [Targeting Resources in Conditional Access Policies](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-cloud-apps)

---

*Pitfalls research for: Outlook Calendar Sync (GTD Planner v1.1)*
*Researched: 2026-01-31*
*Confidence: HIGH (verified with official Microsoft documentation + community reports)*
