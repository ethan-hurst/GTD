# Project Research Summary

**Project:** GTD Personal Productivity Web App
**Domain:** Personal Productivity / Getting Things Done (GTD) Methodology
**Researched:** 2026-01-30
**Confidence:** HIGH

## Executive Summary

This is a web-based GTD (Getting Things Done) productivity application designed for corporate environments with Microsoft 365 integration. Experts build GTD apps with offline-first architecture using local storage (IndexedDB) as the primary database, progressive disclosure to avoid overwhelming beginners, and calendar integration as an enhancement rather than a core requirement. The recommended approach is to build a minimal capture-to-next-actions workflow first, validate user engagement with weekly review, then add Microsoft Graph integration for Outlook/Teams calendar sync.

The critical success factor is weekly review — 80% of GTD system failures stem from users abandoning weekly review due to poor tooling. The app must make review tractable, rewarding, and visible. The second major risk is over-complicating the initial experience; users new to GTD need scaffolding and progressive disclosure, not feature completeness. Browser storage eviction is the critical technical risk; requesting persistent storage and implementing automatic backups must happen in Phase 1.

The recommended stack (React 19 + TypeScript + Vite + Zustand + IndexedDB/Dexie + TanStack Query + Tailwind/shadcn/ui) enables sub-second response times, full offline capability, and seamless future integration with Microsoft Graph API. This is the 2025-2026 standard for local-first SPAs.

## Key Findings

### Recommended Stack

The research recommends a modern, local-first architecture optimized for instant response times and offline capability. The stack prioritizes developer experience (Vite's fast builds, Zustand's minimal boilerplate) while remaining enterprise-ready (TypeScript, comprehensive testing, Microsoft integration support).

**Core technologies:**
- **React 19 + TypeScript 5.8 + Vite 7.3**: Industry standard SPA framework with blazing-fast dev server and native ESM support. React 19 adds server components and async rendering. TypeScript provides compile-time safety essential for productivity apps.
- **Zustand 5.0 + TanStack Query 5.90**: Hybrid state management — Zustand for UI state (minimal boilerplate), TanStack Query for future Microsoft Graph API caching and synchronization. This combination is the 2025 standard, avoiding Redux's complexity while remaining scalable.
- **IndexedDB + Dexie.js 4.0**: Browser-native transactional database with 50MB-10GB storage capacity. Dexie provides Promise-based API and offline-first support. Essential for GTD apps needing instant response times and offline access.
- **Tailwind CSS 3.4 + shadcn/ui + Radix UI**: Utility-first styling with accessible, copy-paste component primitives. This trio is the 2025 gold standard for React UIs — rapid development with built-in accessibility.
- **MSAL React + Microsoft Graph SDK**: Official Microsoft libraries for OAuth 2.0 authentication and Graph API integration (Outlook/Teams calendar sync). Use v1.0 endpoint for production stability.
- **Vitest + React Testing Library**: Modern test runner (10x faster than Jest) with industry-standard component testing. Native ESM support and zero-config Vite integration.

**What NOT to use:**
- Create React App (deprecated since 2022)
- Moment.js (deprecated, use date-fns)
- Microsoft Graph Toolkit (retiring Aug 2026)
- localStorage for GTD data (5-10MB limit, synchronous API)
- Redux without compelling reason (Zustand simpler for single-user app)

### Expected Features

GTD methodology has clear table stakes. Missing core lists or weekly review makes the system incomplete and unusable.

**Must have (table stakes):**
- **Quick Capture** — Frictionless task capture with keyboard shortcut. GTD lives or dies on low-friction capture.
- **Inbox Processing Workflow** — Guided "What is it? Actionable? 2-min rule?" workflow teaching GTD thinking.
- **Next Actions Lists** — Primary working view grouped by context (@home, @office, @computer, @phone).
- **Context/Tag Filtering** — Filter tasks by where/when/how work can be done. Critical for "what can I do now?" workflow.
- **Project Hierarchies** — Distinguish projects (multi-step outcomes) from next actions (single steps). Must show stalled projects (no next actions).
- **Waiting For List** — Track delegated items with who/what/when structure. Reviewed during weekly review.
- **Someday/Maybe List** — Park future ideas without cluttering active lists. Critical distinction: committed vs. not-yet-committed.
- **Weekly Review Checklist** — Guided review of all lists and projects. David Allen calls this "critical success factor for GTD."
- **Calendar View** — GTD separates "hard landscape" (time-specific) from "soft landscape" (context-based). Show appointments, not tasks.
- **Search & Filtering** — Find items instantly across all lists. Full-text search across tasks, projects, notes.
- **Offline-First** — Corporate networks unreliable. App must work fully offline with sync when connected.

**Should have (competitive advantage):**
- **GTD Onboarding for Beginners** — Progressive disclosure of complexity. Show basic workflow first, add advanced features after habit formation.
- **Microsoft Graph Integration** — Two-way Outlook/Teams calendar sync. Differentiation for corporate environments.
- **Defer Dates (Start Dates)** — Hide tasks until "ready" date. Reduces list clutter and premature cognitive load.
- **Sequential vs Parallel Projects** — OmniFocus distinction for power users. Sequential shows only first next action, parallel shows all.
- **Custom Perspectives/Views** — Saved filters combining context + project + date. Example: "Home evening" = @home + energy:low + available:today.
- **Energy/Time Estimates** — Filter by "I have 15 minutes and low energy" → show matching tasks. Beyond basic GTD but highly valued.
- **Natural Language Parsing** — "buy milk tomorrow @errands !p1" → parsed into task with date, context, priority. Reduces capture friction.
- **Template Projects** — Recurring workflows (Weekly Review, Monthly Budget) saved as templates. Huge time saver.

**Defer (v2+):**
- Collaborative/team features (GTD is personal system)
- Complex priority systems (GTD uses context/energy instead)
- Calendar-based task scheduling (conflicts with GTD "hard landscape" principle)
- Gamification/streaks (focuses on quantity over appropriate engagement)
- Nested projects beyond 3 levels (violates GTD simplicity)
- Mobile native apps (web responsive sufficient for MVP)

**Anti-features (commonly requested but problematic):**
- Mixing tasks and appointments in calendar (creates stress when tasks don't get done)
- Automatic due dates (most tasks don't have real deadlines; fake deadlines create "boy who cried wolf")
- Automatic task creation from email (creates noise; GTD clarify step is manual for reason)
- Real-time notifications (interrupts deep work; GTD is pull-based, not push-based)

### Architecture Approach

The recommended architecture is feature-slice organization with offline-first data persistence. Features are self-contained (inbox/, projects/, review/ directories) with components, hooks, and business logic colocated. IndexedDB serves as the single source of truth with hybrid state management: Zustand for global UI state, TanStack Query for future server state caching, local useState for ephemeral component state.

**Major components:**
1. **Presentation Layer** — Feature-based views (Inbox, Projects, Contexts, Review) using React components with Tailwind/shadcn styling. Each feature is self-contained in its directory.
2. **State Management** — Hybrid approach: Zustand for settings/preferences, TanStack Query for Microsoft Graph caching, local state for forms/UI. Avoids Redux complexity while remaining scalable.
3. **Persistence Layer** — IndexedDB via Dexie.js stores all GTD data locally (items, projects, contexts). Structured schema with compound indexes for fast filtering. Must request persistent storage to prevent eviction.
4. **Integration Layer** — Microsoft Graph API connector for calendar sync (future phase). Delta queries for incremental sync, conflict resolution UI, offline queue for changes made while disconnected.

**Key architectural patterns:**
- **Feature-slice architecture**: Organize by user workflow (inbox/, projects/, review/), not technical layer. Reduces cognitive load.
- **Offline-first with IndexedDB**: Local storage as primary data store, treating network as enhancement. Near-instant UI updates, works fully offline.
- **Delta query sync**: For Microsoft Graph, use delta tokens to fetch only changes since last sync. Minimizes API calls and respects rate limits.
- **Progressive disclosure**: Show basic GTD workflow first (capture/clarify/organize), reveal advanced features after 3+ months habit formation.

**Critical architectural decisions:**
- Don't use global state for GTD data (IndexedDB is already shared storage). Query directly in components via hooks.
- Don't create shared components prematurely. Keep in feature folders until actually reused in 2+ places.
- Always handle IndexedDB asynchronously with optimistic UI updates. Never block main thread.
- Track online/offline status and queue sync operations when disconnected. Resume sync when back online.
- Model data exactly as GTD defines (inbox, next_action, project, waiting, someday). Enforce rules in code (every project needs ≥1 next action).

### Critical Pitfalls

1. **Over-Complicated Initial Implementation** — Developers implement every GTD feature at once, overwhelming users new to methodology. **Avoid:** Start with minimal capture + process workflow, introduce contexts/projects only after basic habits established. Use progressive disclosure.

2. **Weekly Review Becomes "Eventually Review"** — Users skip weekly review because app doesn't make it feel essential or tractable. Without review, system accumulates cruft and users feel it's "broken." **Avoid:** Make weekly review first-class workflow with dedicated UI, show time-since-last-review prominently, break into small chunks with progress indicators, celebrate completion.

3. **Creating "Fake Work" Through Over-Organizing** — Task organization becomes so frictionless that users spend more time reorganizing than completing tasks. Productive procrastination. **Avoid:** Make task completion more visually rewarding than organization, show time-spent-organizing metrics, add intentional friction to reorganization.

4. **Task List Becomes Guilt Monument** — Easy capture but no dismissal creates 50+ item lists that induce anxiety rather than clarity. Users abandon app to escape psychological weight. **Avoid:** Implement someday/maybe as first-class concept, surface only actionable items by default, add defer dates to hide irrelevant tasks, prompt "Still want to do X?" during weekly review.

5. **Browser Storage Eviction Destroys User Data** — App relies on IndexedDB without requesting persistent storage. Safari/mobile browsers silently evict all data. User opens app, entire GTD system gone. Trust permanently destroyed. **Avoid:** Call `navigator.storage.persist()` on first use, monitor storage quotas, implement automatic weekly backups, provide manual export, detect data loss and show recovery options.

6. **Microsoft Graph Calendar Sync Becomes Chaos** — Two-way sync creates duplicates, orphaned events, time zone mismatches, deletion conflicts. **Avoid:** Establish clear ownership model (GTD creates Outlook events initially), use delta queries properly, normalize to UTC, handle deleted events via @removed property, test with recurring events and multiple zones, start one-way before two-way.

7. **Context Explosion Makes System Unusable** — Users create 10+ contexts (@email, @phone, @afternoon, @low-energy, @quick), making selection overwhelming. **Avoid:** Recommend 3-5 starter contexts, warn when creating 8+, show context usage analytics ("@afternoon used 0 times — archive it?"), make archive-context easy.

8. **Onboarding Overwhelms and Causes Immediate Abandonment** — First-time user faces account setup, methodology explanation, feature tour, permission requests before capturing single task. 80-90% abandon during onboarding. **Avoid:** User captures first task in under 60 seconds, defer everything except capture + process, no permission requests on launch, no feature tours, provide "Skip to app" button, measure time-to-first-task.

## Implications for Roadmap

Based on research, the roadmap should follow GTD methodology flow: capture → process → organize → review → engage. Start with minimal viable workflow, validate weekly review engagement, then add advanced features and Microsoft integration.

### Phase 1: Foundation (Core GTD Workflow)

**Rationale:** GTD requires complete capture-to-action workflow to be usable. Cannot skip any step. This phase delivers the atomic GTD system that validates the core value proposition.

**Delivers:**
- Quick capture (keyboard shortcut + input form)
- Inbox list with processing workflow
- Next actions list with context filtering
- Projects list with next action association
- Waiting For and Someday/Maybe lists
- Basic search and filtering
- Offline-first IndexedDB storage with persistent storage request
- Manual data export/backup

**Features from research:**
- Quick Capture (must-have)
- Inbox Processing Workflow (must-have)
- Next Actions Lists (must-have)
- Context Tags (must-have)
- Projects List (must-have)
- Waiting For List (must-have)
- Someday/Maybe List (must-have)
- Offline Mode (must-have)
- Search (must-have)

**Avoids pitfalls:**
- Over-complicated UI — ships with 3-5 recommended contexts, no advanced features
- Task list guilt monument — someday/maybe built from day one
- Browser storage eviction — persistent storage requested, manual export available
- Onboarding abandonment — user captures first task in <60 seconds

**Critical for Phase 1:**
- Request `navigator.storage.persist()` immediately
- Implement manual export clearly visible in settings
- Build someday/maybe list simultaneously with next actions (prevents list bloat)
- Keep onboarding to: name → capture first item → process first item (<2 min total)

### Phase 2: Weekly Review & Engagement

**Rationale:** Weekly review is the "critical success factor for GTD" per David Allen. Without it, 80% of GTD systems fail. Must be built after core lists exist (need data to review) but before adding complexity.

**Delivers:**
- Weekly review wizard with guided checklist
- Review progress tracking ("5 of 12 projects reviewed")
- Time-since-last-review indicator (creates positive pressure)
- Project validation (flag projects without next actions)
- Completion celebration ("5 stale projects archived")
- Optional review reminders

**Features from research:**
- Weekly Review Checklist (should-have)
- GTD Onboarding Guide (should-have) — can integrate review training here

**Uses stack elements:**
- React Hook Form for review step forms
- date-fns for review scheduling and "last reviewed" calculations
- Dexie compound queries for "projects without next actions"

**Implements architecture:**
- Review feature slice with ReviewWizard component
- Storage of review history in IndexedDB
- Zustand for review preferences (preferred day/time)

**Avoids pitfalls:**
- Weekly review neglect — dedicated UI, prominent time-since-review
- Task list guilt monument — review prompts "Still want to do X?" for old items

**Validation criteria:**
- 70%+ of users complete review within 7-day window after 2 weeks of usage
- Review completion time under 30 minutes for typical user (50-100 active items)

### Phase 3: Microsoft Graph Integration (Read-Only)

**Rationale:** Calendar integration is complex enough to deserve its own phase. Start with read-only Outlook calendar viewing to validate integration value before attempting bidirectional sync.

**Delivers:**
- OAuth 2.0 authentication via MSAL React
- Read-only Outlook calendar view
- Calendar events displayed in GTD app
- "Hard landscape" reference during daily planning
- Network-aware (works offline, syncs when online)

**Features from research:**
- Outlook Calendar Integration (should-have) — read-only first
- Basic Calendar View (must-have) — enhanced with real Outlook data

**Uses stack elements:**
- MSAL React for authentication
- Microsoft Graph SDK for API calls
- TanStack Query for caching calendar events
- date-fns for time zone normalization

**Implements architecture:**
- Integration layer: services/graph/ with auth.ts, calendar.ts
- Offline queue pattern for auth token refresh
- Read-only sync (no conflict resolution yet)

**Avoids pitfalls:**
- Calendar sync chaos — read-only eliminates conflicts, validates value before complexity
- Browser storage eviction — tokens stored securely via MSAL, not localStorage

**Research flag:** Needs `/gsd:research-phase` for Microsoft Graph API patterns, token refresh flows, and rate limiting strategies.

### Phase 4: Calendar Bidirectional Sync

**Rationale:** After read-only calendar proves valuable, add write-back capability. This is the most complex technical phase requiring delta queries, conflict resolution, and extensive testing.

**Delivers:**
- GTD next actions with due dates create Outlook events
- Delta query sync (incremental, not full refresh)
- Conflict resolution UI ("GTD says 2pm, Outlook says 3pm — which is correct?")
- Sync status indicators and manual sync trigger
- Sync pause/reset options
- Comprehensive error handling and retry logic

**Features from research:**
- Outlook Calendar Sync (should-have) — now bidirectional
- Forecast View (defer to v2+, but synergy with calendar sync)

**Implements architecture:**
- Delta query sync pattern from ARCHITECTURE.md
- Sync queue for offline changes
- Conflict detection and resolution strategy
- Webhook subscriptions for real-time updates (optional)

**Avoids pitfalls:**
- Calendar sync chaos — delta queries, UTC normalization, @removed handling, manual resolution UI
- Performance at scale — batch operations, respect rate limits

**Critical for Phase 4:**
- Establish clear ownership model (GTD creates, Outlook can modify)
- Test extensively with recurring events across time zones
- Implement comprehensive error logging for debugging sync issues
- Build manual "Trust GTD" / "Trust Outlook" resolution buttons

**Research flag:** Needs `/gsd:research-phase` for delta query implementation patterns, conflict resolution UX patterns, and webhook subscription best practices.

### Phase 5: Advanced Features (Power User)

**Rationale:** After core GTD workflow and calendar integration are stable, add features for power users who have mastered basics.

**Delivers:**
- Defer dates (start dates) to hide tasks until relevant
- Sequential vs. Parallel projects (OmniFocus-style)
- Custom perspectives (saved filter combinations)
- Energy and time estimates for tasks
- Natural language parsing for quick capture
- Template projects for recurring workflows

**Features from research:**
- Defer Dates (should-have)
- Sequential/Parallel Projects (defer to v2+)
- Custom Perspectives (defer to v2+)
- Energy/Time Estimates (defer to v2+)
- Natural Language Parsing (should-have)
- Template Projects (should-have)

**Why defer these to Phase 5:**
- Defer dates: Users report list overwhelm only after using system 1+ month
- Sequential/Parallel: Complex feature benefiting only power users with 10+ active projects
- Perspectives: Requires understanding context/project/date interplay (3+ months experience)
- Energy/Time: Beyond core GTD, nice-to-have for optimization
- NLP: Efficiency matters when capture volume >5/day (established users)
- Templates: Pattern emerges after completing 3+ similar projects

**Validation triggers:**
- Defer dates: User feedback "too many next actions visible" or average >50 next actions
- Sequential/Parallel: Users with 10+ active projects requesting feature
- Perspectives: Power users creating same filter combinations repeatedly
- NLP: Average >5 captures per day sustained for 2+ weeks

### Phase Ordering Rationale

**Why this order:**
1. **Phase 1 first** — Cannot use GTD without complete capture → process → organize flow. Atomic workflow.
2. **Phase 2 before integration** — Weekly review is critical success factor. Validate engagement before adding complexity.
3. **Phase 3 before Phase 4** — Read-only calendar validates value and builds integration foundation without conflict complexity.
4. **Phase 4 after stable core** — Bidirectional sync is complex and fragile. Needs stable GTD system underneath.
5. **Phase 5 after product-market fit** — Advanced features serve power users. Build after core proven with beginners.

**Dependency chain:**
- Phase 2 requires Phase 1 (need lists to review)
- Phase 3 requires Phase 1 (need stable GTD workflow before external integration)
- Phase 4 requires Phase 3 (build on read-only foundation)
- Phase 5 requires Phase 1-2 (defer dates/perspectives enhance existing workflow)

**How this avoids pitfalls:**
- Progressive complexity prevents over-complicated initial implementation
- Weekly review in Phase 2 prevents system abandonment
- Read-only calendar first prevents sync chaos
- Someday/maybe in Phase 1 prevents guilt monument
- Persistent storage in Phase 1 prevents data loss

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 3:** Microsoft Graph API authentication flows, MSAL React integration patterns, calendar event schema. *Reason: Complex enterprise integration with OAuth 2.0 and external API.*
- **Phase 4:** Delta query implementation, conflict resolution strategies, webhook subscription patterns, recurring event handling. *Reason: Advanced sync patterns, sparse documentation for edge cases.*

**Phases with standard patterns (skip research-phase):**
- **Phase 1:** IndexedDB/Dexie patterns, React component architecture, Zustand state management. *Reason: Well-documented, established patterns, covered in STACK.md and ARCHITECTURE.md.*
- **Phase 2:** Form handling with React Hook Form, wizard UI patterns, progress tracking. *Reason: Standard React patterns with abundant examples.*
- **Phase 5:** Natural language parsing libraries (chrono-node), template/cloning patterns. *Reason: Standard features with established libraries.*

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All core technologies verified via official documentation, Context7, and npm/GitHub. React 19.2, TypeScript 5.8, Vite 7.3.1, Zustand 5.0.10, TanStack Query 5.90.19, Dexie 4.0 all confirmed. MSAL React and Microsoft Graph SDK verified via Microsoft Learn. |
| Features | HIGH | GTD methodology features verified against official GTD sources (gettingthingsdone.com), GTD forums, and comprehensive ecosystem analysis of OmniFocus, Todoist, Nirvana (2026 GTD app landscape). Table stakes vs. differentiators clearly identified. |
| Architecture | MEDIUM | Standard patterns for offline-first React apps well-documented. Feature-slice architecture, IndexedDB patterns, and hybrid state management have multiple quality sources. Microsoft Graph delta sync patterns have official docs but fewer real-world examples. |
| Pitfalls | MEDIUM | GTD system failure patterns verified through official GTD resources, productivity app postmortems, and forum discussions. Technical pitfalls (storage eviction, sync conflicts) verified via MDN and Microsoft Learn. Some UX pitfall patterns inferred from user complaints rather than direct research. |

**Overall confidence:** HIGH

Research sources are authoritative (official GTD documentation, Microsoft Learn, React official docs, verified npm packages). Stack and feature recommendations are evidence-based. Architecture patterns are industry-standard with clear documentation. Pitfalls are drawn from real-world GTD failures and technical constraints.

### Gaps to Address

**During Phase 1 planning:**
- **Context recommendation algorithm**: Research suggests 3-5 contexts, but what's the recommended starter set for corporate environment? (@office, @home, @computer, @phone, @errands likely, but validate with target users)
- **Storage quota monitoring thresholds**: When to warn users about low storage? IndexedDB allows 50MB-10GB depending on browser, but what's safe threshold?

**During Phase 3 planning (Microsoft Graph):**
- **OAuth scope requirements**: Need to research exact permissions required. Likely `User.Read`, `Calendars.ReadWrite`, but validate minimum necessary scopes.
- **Rate limiting strategy**: Graph API allows 10k requests/10 min. Need to model typical usage patterns to ensure we stay under limits.

**During Phase 4 planning (Bidirectional Sync):**
- **Conflict resolution UX patterns**: Research shows conflicts happen, but what's the optimal UI pattern? "Last write wins," "manual resolution," or "GTD always wins"?
- **Recurring event edge cases**: How to handle "edit this occurrence" vs. "edit series"? Outlook's recurrence model is complex.

**Validation during execution:**
- **Weekly review engagement**: Target 70%+ completion rate, but this is estimate. Monitor real users and adjust workflow if engagement lower.
- **Onboarding completion time**: Target <60 seconds to first capture, but validate with real users. Adjust if abandonment high.

## Sources

### Primary (HIGH confidence)

**Stack & Technology:**
- [React Official Docs](https://react.dev) — React 19.2 verified
- [TypeScript 5.8 Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-8.html)
- [Microsoft Learn: MSAL React](https://learn.microsoft.com/en-us/entra/msal/javascript/react/getting-started)
- [Microsoft Learn: Microsoft Graph API](https://learn.microsoft.com/en-us/graph/use-the-api)
- [MDN: IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Dexie.js Official Docs](https://dexie.org) — v4.0 features verified
- [shadcn/ui Official](https://ui.shadcn.com/)
- [Zustand GitHub Releases](https://github.com/pmndrs/zustand/releases) — v5.0.10 verified
- [TanStack Query npm](https://www.npmjs.com/package/@tanstack/react-query) — v5.90.19 verified

**GTD Methodology:**
- [Getting Things Done Official Tools & Software](https://gettingthingsdone.com/common-tools-software/)
- [GTD Weekly Review Checklist](https://gettingthingsdone.com/wp-content/uploads/2014/10/Weekly_Review_Checklist.pdf)
- [Basic GTD: How to Process Your Stuff](https://facilethings.com/blog/en/basics-processing)
- [GTD Contexts — Theoretical & Practical Guide](https://facilethings.com/blog/en/gtd-contexts)

### Secondary (MEDIUM confidence)

**Architecture Patterns:**
- [Modern Web Application Architecture in 2026: A Practical Guide](https://quokkalabs.com/blog/modern-web-application-architecture/)
- [Frontend Architecture 2025: Structure Large Apps](https://www.frontendtools.tech/blog/frontend-architecture-structure-large-scale-web-apps)
- [Offline-first frontend apps in 2025: IndexedDB and SQLite](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/)
- [Dexie.js - Build Offline-First Apps](https://dexie.org/)

**GTD Apps Ecosystem:**
- [9 Best GTD Apps & Software for Getting Things Done in 2026](https://clickup.com/blog/gtd-apps/)
- [Top GTD apps for Getting Things Done in 2026](https://www.onepagecrm.com/blog/gtd-business-software-to-stay-organized/)
- [The Best GTD Apps For Getting Things Done](https://www.asianefficiency.com/technology/best-gtd-apps/)

**Common Pitfalls:**
- [10 Reasons Why GTD Might Be Failing](https://facilethings.com/blog/en/why-gtd-fails)
- [8 Tips to Implement GTD Successfully](https://facilethings.com/blog/en/implement-gtd)
- [Storage quotas and eviction criteria - MDN](https://developer.mozilla.org/en-us/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)

**Microsoft Graph Integration:**
- [Outlook calendar API overview - Microsoft Graph](https://learn.microsoft.com/en-us/graph/outlook-calendar-concept-overview)
- [Get incremental changes to events in a calendar view](https://learn.microsoft.com/en-us/graph/delta-query-events)
- [Implement Bidirectional Calendar Sync - 2025 Guide](https://calendhub.com/blog/implement-bidirectional-calendar-sync-2025/)

### Tertiary (LOW confidence)

**State Management:**
- [Zustand vs Redux 2025](https://www.zignuts.com/blog/react-state-management-2025) — Community comparison
- [State Management in 2026: Redux, Context API, and Modern Patterns](https://www.nucamp.co/blog/state-management-in-2026-redux-context-api-and-modern-patterns)

**Testing:**
- [Vitest vs Jest 2025](https://medium.com/@ruverd/jest-vs-vitest-which-test-runner-should-you-use-in-2025-5c85e4f2bda9) — Performance benchmarks

**UX Patterns:**
- [Why 90% Of Users Abandon Apps During Onboarding](https://thisisglance.com/blog/why-90-of-users-abandon-apps-during-onboarding-process)
- [4 examples of bad user onboarding](https://www.appcues.com/blog/bad-user-onboarding)

---
*Research completed: 2026-01-30*
*Ready for roadmap: yes*
