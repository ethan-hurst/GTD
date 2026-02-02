# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-31)

**Core value:** Nothing falls through the cracks — every commitment is captured, clarified, and surfaced at the right time so the user always knows what to do next.

**Current focus:** Phase 08.8 and 08.8.1 complete — next: start Phase 9 (OAuth Foundation)

## Current Position

Phase: 08.8 (User Feedback & Bug Reports) + 08.8.1 (Test Suite Improvement)
Plan: All plans complete in both phases
Status: Both phases verified and complete
Last activity: 2026-02-02 — Phase 08.8 verified (7/7 must-haves), 08.8.1 UAT passed (8/8 tests)

Progress: [█████████████░░░░░░] 73% (73/TBD plans complete across all phases)

## Performance Metrics

**Velocity:**
- Total plans completed: 35 (v1.0 only)
- Average duration: Unknown (metrics from v1.0 not tracked)
- Total execution time: 2 days (2026-01-30 → 2026-01-31)

**By Phase (v1.0):**

| Phase | Plans | Status |
|-------|-------|--------|
| 1. Foundation | 3 | Complete |
| 2. Inbox & Processing | 4 | Complete |
| 3. Next Actions | 5 | Complete |
| 4. Projects & Waiting | 4 | Complete |
| 5. Someday/Maybe | 3 | Complete |
| 6. Weekly Review | 4 | Complete |
| 7. Calendar & ICS | 6 | Complete |
| 8. Onboarding & Polish | 6 | Complete |

**v1.1 Progress:**
- Phases: 0/5 complete
- Plans: 0/TBD complete
- Estimated duration: 8-13 days (from research)

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

Recent decisions affecting current work:
- v1.0: SvelteKit 2 + Svelte 5 $state runes for reactive patterns
- v1.0: Dexie 4.x with EntityTable for type-safe IndexedDB operations
- v1.0: @event-calendar/core for calendar component (35KB vs 150KB FullCalendar)
- v1.0: Offline-first storage with service worker caching
- v1.0: Schema extension over separate tables (optional fields on GTDItem)
- 08.1-01: Use shadows instead of borders for header separation (professional aesthetic)
- 08.1-01: Gray-950 dark mode background (not pure black) for reduced eye strain
- 08.1-01: Minimal utility class set to avoid over-engineering full design system
- 08.1-02: Active nav links use white bg with shadow instead of gray-200 for elevated appearance
- 08.1-02: Search results use blue-tinted hover/selected states for better visual feedback
- 08.1-02: Translucent backgrounds with backdrop-blur-sm for depth perception
- 08.1-04: Focus ring opacity at 40% for subtle but clear visual indicators
- 08.1-04: Ring offset for buttons (ring-offset-2), ring inset for list items
- 08.1-04: Transition duration standardized at 150ms for responsive feel
- 08.1-04: Shadow-sm on inputs, shadow-lg on panels for visual hierarchy
- 08.1-03: Changed outer page padding from p-8 to p-6 for consistency with other list views
- 08.1-03: Made empty state celebratory (green icon circle) rather than just informational
- 08.1-03: Back links changed from blue to gray to de-emphasize reverse navigation
- 08.1-03: All buttons standardized to py-2.5 for consistent vertical rhythm
- 08.1-05: Overdue items use border-l-2 for urgency without being alarming
- 08.1-05: Active category buttons combine bg-white, shadow-sm, and font-semibold
- 08.1-05: Settings cards use rounded-xl with hover:shadow-md for elevated feel
- 08.1-06: Navigation arrows increased to p-2.5 for 44px touch target (accessibility)
- 08.1-06: View switcher uses p-0.5 container with ring-1 on active segments
- 08.1-06: Frosted glass footer with backdrop-blur-sm for Weekly Review wizard
- 08.1-06: Tabular-nums for wizard progress percentage (stable layout)
- 08.1-07: Sidebar nav needs overflow-y-auto to keep footer pinned when ContextList is expanded
- 08.2-01: Use three discrete states (UNKNOWN, GRANTED, DENIED) instead of boolean for persistence
- 08.2-01: Keep state as UNKNOWN when persisted() returns false (only set DENIED on explicit request rejection)
- 08.2-01: Add console logs for all persistence state transitions
- 08.2-02: Show success toast on every app load when storage is persistent (user confirmation)
- 08.2-02: Detect browser type and provide specific guidance when persistence denied
- 08.2-02: Only display storage quota in StatusBar when persistence is GRANTED
- 08.2-02: Four-state StatusBar UI: green (GRANTED), amber (UNKNOWN), red (DENIED), gray (no API)
- 08.3-01: Native details/summary for collapsible context list (zero-JS progressive enhancement)
- 08.3-01: Replaced border separators with mt-3 spacing groups for cleaner hierarchy
- 08.3-01: Context list collapsed by default to save ~150px vertical space
- 08.3-02: Svelte 5 reactive class pattern (matching theme.svelte.ts) for sidebar state store
- 08.3-02: Icons in both collapsed and expanded modes for visual consistency
- 08.3-02: cycleTheme function for collapsed footer (light → dark → system)
- 08.3-02: `[` keyboard shortcut to toggle sidebar (common productivity app pattern)
- 08.3-02: Badge dots on collapsed icons for inbox/stalled project indicators
- 08.4-01: Custom Tailwind breakpoints (phone: 360px, phablet: 640px, tablet: 768px, desktop: 1024px)
- 08.4-01: Separate JS-level detection (mobileState) from CSS breakpoints (Tailwind) for different use cases
- 08.4-01: iOS input zoom prevention via min font-size 16px without blocking user zoom (WCAG compliant)
- 08.4-02: Hamburger menu with slide-out drawer pattern for mobile navigation
- 08.4-02: FAB positioned bottom-right with safe area insets for quick inbox capture
- 08.4-02: Complete layout separation: mobile gets header+drawer+FAB, desktop unchanged
- 08.4-02: Drawer closes on Escape, backdrop click, and nav link click
- 08.4-02: Body scroll prevention when drawer is open
- 08.4-02: Belt-and-suspenders approach: JS conditional + CSS hidden tablet:flex on Sidebar
- 08.4-03: Detail panels become full-screen overlays on mobile (ActionDetailPanel, ProjectDetailPanel)
- 08.4-03: Category filter tabs scroll horizontally on mobile instead of wrapping
- 08.4-03: Truncate long titles instead of wrapping to preserve row height consistency
- 08.4-03: Hide button text labels on smallest screens (show icons only) to save space
- 08.4-04: Calendar defaults to Day view on mobile (not Week/Month)
- 08.4-04: Toolbar uses 2-row stacked layout on mobile for adequate spacing
- 08.4-04: Side panel and calendar toggle on mobile (not side-by-side)
- 08.4-04: Event form renders as full-screen overlay on mobile
- 08.4-04: All form inputs use text-base (16px) to prevent iOS zoom
- 08.4-06: Hide WeeklyReviewWizard sidebar on mobile, show compact progress indicator instead
- 08.4-06: OnboardingWizard full-screen on mobile to maximize space for content
- 08.4-06: All wizard buttons stack on mobile (flex-col), side-by-side on phablet+
- 08.4-06: Input font-size 16px to prevent iOS zoom on focus
- 08.4-05: Settings cards use 2-column grid on tablet+, single column on mobile
- 08.4-05: SearchBar results use max-h-[60vh] on mobile (viewport-relative) vs fixed 96 on desktop
- 08.4-05: ProcessingFlow and IcsImport already mobile-responsive (completed in 08.4-04)
- 08.5-01: Soft-delete with tombstones - keep function signatures, change internal behavior (zero breaking changes)
- 08.5-01: Use deleted?: boolean instead of deleted: boolean | null (cleaner Dexie pattern)
- 08.5-01: 30-day tombstone retention default allows month-long sync window for paired devices
- 08.5-04: Last-Write-Wins uses modified timestamp as single source of truth (clock skew accepted)
- 08.5-04: Tombstones preserved in merge output (filtered at query time, not merge time)
- 08.5-04: Full-replace import strategy (clear + bulkPut) instead of incremental updates
- 08.5-04: Pairing code held in memory only - re-prompt after page refresh for security
- 08.5-04: Debouncer triggers after 2000ms delay OR 5 changes (whichever comes first)
- 08.5-05: Modal confirmation for unpair action prevents accidental unpairing
- 08.5-05: Auto-format pairing code input as XXX-XXX for improved UX
- 08.5-05: Sync status indicators only visible when paired (don't clutter UI for non-sync users)
- 08.5-05: StatusBar sync status clickable to navigate to Settings page
- 08.6-01: Use real browser IndexedDB instead of fake-indexeddb (browser mode provides real implementation)
- 08.6-01: Use raw svelte() plugin in vitest.config.ts instead of sveltekit() plugin to avoid browser mode interference
- 08.6-01: Browser mode headless by default for CI-friendly test execution
- 08.6-04: Add $lib and $app path aliases to vitest.config.ts for SvelteKit import resolution
- 08.6-04: Create mock $app modules instead of using @sveltejs/kit mocks (browser mode compatibility)
- 08.6-04: Exclude playwright from optimizeDeps to prevent bundling errors
- 08.6-04: Use Date objects (not timestamps) in mock GTDItem data to match schema
- 08.6-02: Use Date.now() - (days * 86400000) pattern for deterministic time-based tests
- 08.6-02: Test date deserialization by checking instanceof Date and getTime() equality
- 08.6-02: Test LWW with concrete dates (older/newer) rather than mock timestamps
- 08.6-02: Flexible assertions for locale-dependent time formatting (regex matching)
- 08.6-06: Separate vitest configs for browser vs Node.js tests (vitest.config.ts vs vitest.node.config.ts)
- 08.6-06: Mock @netlify/blobs at module level, reset in beforeEach for test isolation
- 08.6-06: Test deviceId validation with 64-char hex pattern (SHA-256 format)
- 08.6-06: Helper functions mockContext() and makeRequest() for test setup reduce boilerplate
- 08.6-05: Deferred inbox CRUD form submission tests due to Svelte 5 hydration issue requiring separate investigation
- 08.6-05: Viewport-conditional assertions for responsive testing (desktop vs mobile navigation patterns)
- 08.6-05: Graceful fallbacks in tests when UI state varies (empty state vs populated list)
- 08.7-01: Plausible-style visitor hashing (daily-rotating salt + SHA-256 over IP + User-Agent + siteDomain)
- 08.7-01: Arrays instead of Sets for visitor tracking (JSON serialization compatibility)
- 08.7-01: Pre-aggregate daily metrics server-side (pageviews, events, unique visitors, referrers)
- 08.7-01: sendBeacon with fetch keepalive fallback for reliability across browsers
- 08.7-01: DNT respected on both client and server for privacy compliance
- 08.7-02: Analytics calls placed after primary action completes (non-blocking pattern)
- 08.7-02: Sync metrics include itemCount and duration for operational insight
- 08.7-02: Task events include type property to differentiate creation paths
- 08.7-02: All trackEvent calls are fail-safe (wrapped in try/catch inside client.ts)
- 08.7-03: Basic auth with ANALYTICS_PASSWORD env var for query endpoint protection
- 08.7-03: Opportunistic cleanup runs on each query (fire-and-forget) to enforce GDPR retention
- 08.7-03: Default 30-day range, max 395 days (~13 months) for analytics queries
- 08.7-03: Unique visitors not deduplicated across days (daily hash rotation by design)
- 08.8-01: Use static HTML file in addition to SvelteKit route for reliable Netlify Forms detection
- 08.8-01: Screenshot with html2canvas instead of FeedbackPlus for simpler integration
- 08.8-01: JPEG compression at 0.7 quality, 0.3 if > 500KB to balance quality and size
- 08.8-01: Type selector as segmented buttons instead of dropdown for better mobile UX
- 08.7-04: Chart.js dynamically imported inside $effect for code splitting
- 08.7-04: Password held in memory only - re-prompt after page refresh for security
- 08.7-04: Standalone admin page not using app sidebar layout
- 08.8-02: Use ANALYTICS_PASSWORD env var for feedback admin auth (no new configuration needed)
- 08.8-02: Store screenshots as separate blobs under screenshots/ prefix instead of embedding in items
- 08.8-02: Honeypot field silently accepts but doesn't store bot submissions (UX-friendly anti-spam)
- 08.8-02: CORS headers on all endpoints to support admin dashboard from different path
- 08.8-02: Blobs metadata values must be strings (use 'true'/'false' not boolean true/false)
- 08.8.1-01: Actual PAIRING_CHARS includes L (only excludes 0, O, 1, I) -- tests match implementation
- 08.8.1-01: importFromSync throws on unknown table names (Dexie InvalidTableError) -- not graceful skip
- 08.8.1-01: performSync deferred from testing due to complex multi-module mocking requirements
- 08.8.1-03: Mock analytics-utils at module level for handler tests (isolates handler logic from utility internals)
- 08.8.1-03: Top-level mock function references in utils tests for direct store method assertions
- 08.8.1-02: Include DTSTART in rrule test strings for deterministic recurrence expansion
- 08.8.1-02: Array join for ICS test strings avoids template literal whitespace issues
- 08.8.1-04: URL constructor + searchParams for query param testing (cleaner than string concatenation)
- 08.8.1-04: Shared authHeader helper pattern across admin endpoint test files
- 08.8.1-04: Honeypot tested as separate describe block (both response and non-storage assertions)

### Roadmap Evolution

- Phase 08.1 inserted after Phase 8: UI/UX Review — comprehensive pass on visual consistency, design principles, and usability before starting v1.1 Outlook sync
- Phase 8.2 inserted after Phase 8: how does storage work currently? If I click not persistent - click to request nothing actually happens in the app (URGENT)
- Phase 08.3 inserted after Phase 08.2: Left nav bar has scrollbar on laptop — redesign nav UX while preserving all functionality
- Phase 08.4 inserted after Phase 08.3: Mobile responsive pass — ensure site works on mobile devices (URGENT)
- Phase 08.5 inserted after Phase 08.4: Device sync — Netlify Functions + Blobs, pairing code, encrypted per-record merge (URGENT)
- Phase 08.6 inserted after Phase 08.5: Backend, frontend & integration tests — establish test infrastructure before Outlook sync (URGENT)
- Phase 08.7 inserted after Phase 08.6: Site analytics & usage metrics — no way to track users/usage over time, need visibility into signups and engagement (URGENT). Plausible approach reverted — re-planning with self-built Netlify Blobs approach (no external service)
- Phase 08.8 inserted after Phase 08.7: User feedback & bug reports — anonymous way to submit bugs and request features from within the app (URGENT)
- Phase 08.8.1 inserted after Phase 08.8: Test suite improvement — improve test coverage for regression confidence before Outlook sync (URGENT)

### Pending Todos

None yet.

### Blockers/Concerns

**Research Flags:**
- Phase 13 (Real-Time Sync): Webhook implementation requires server endpoint. Research focused on delta query (pull). May need phase-specific research during planning if implementing beyond delta query.
- Corporate IT approval: Required permissions (Calendars.ReadWrite, User.Read, offline_access) need admin consent in corporate M365 tenants. Timeline unknown.

**Known Risks:**
- MSAL.js v5.x has peer dependency conflicts. Pin to v4.28.1 until v5 stabilizes (Q1/Q2 2026).
- Delta tokens expire after 7 days. Must detect syncStateNotFound errors and fall back to full sync.
- Graph API rate limits not published. Monitor 429 responses in production.
- Conditional Access policies may block unattended sync in corporate environments.

## Session Continuity

Last session: 2026-02-02
Stopped at: Phase 08.8 verified + 08.8.1 UAT passed — all pre-v1.1 phases complete
Resume file: None
