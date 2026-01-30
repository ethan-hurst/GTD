# Phase 7: GTD Onboarding - Context

**Gathered:** 2026-01-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Progressive introduction to GTD concepts for first-time users. Includes welcome walkthrough, contextual hints on every feature, skip/adaptation behavior, and guided first task capture through the full GTD cycle. Does not include new features — only educates users on existing functionality from Phases 1-6.

</domain>

<decisions>
## Implementation Decisions

### First-run experience
- Welcome screen with full GTD intro walkthrough (4+ screens covering Capture, Process, Organize, Review)
- Interactive format — each step asks the user to do something small (not passive slideshow)
- Skip option appears on first screen only ("I know GTD") — once past it, committed to the flow
- After walkthrough completes, user lands in the app (Claude's discretion on exact landing spot)

### Contextual hints
- Tooltip popovers that point to features with brief explanations
- Appear on first encounter with each feature
- Tone: GTD term in bold + plain language explanation (e.g., "**Next Actions** — tasks you can do right now, sorted by where you are")
- Coverage: every feature gets a hint — GTD views, workflows, search, keyboard shortcuts, export
- Hints disappear permanently only after the user has actually used the feature (not just dismissed)

### Skip & adaptation
- Users who skip onboarding get reduced hints — shorter, less explanatory, assumes GTD knowledge but not UI knowledge
- "Show onboarding again" toggle in Settings to reset walkthrough and re-enable all hints
- Feature visit tracking approach is Claude's discretion (route-based vs action-based)

### First task capture
- Embedded real input field during the "Capture" step of the walkthrough — "Try it — type something on your mind"
- Task goes straight to inbox
- No seed data or pre-filled examples — completely clean slate
- Suggested prompts shown as placeholder/inspiration (e.g., "Call dentist, Plan weekend trip")
- After first capture: brief celebration + continue walkthrough (don't end early)
- Walkthrough guides user through full GTD cycle: capture their item, then process it through the decision tree

### Claude's Discretion
- Exact post-walkthrough landing page (inbox with prompt vs dashboard)
- Feature visit tracking mechanism (route-based vs action-based)
- Walkthrough illustration/visual style
- Exact number of walkthrough screens
- Hint positioning and animation
- Celebration style for first capture

</decisions>

<specifics>
## Specific Ideas

- Interactive walkthrough where each GTD concept has a hands-on action — user captures a real task during the Capture step
- Full GTD cycle in walkthrough: capture an item, then process it through the decision tree, so user experiences the complete flow before being set loose
- "I know GTD" skip on first screen only — committed once they start, no bail-out mid-flow
- Hints persist until the feature is actually used, not just dismissed — ensures real engagement
- Skippers get a lighter-touch version of hints (shorter, assumes GTD knowledge)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-gtd-onboarding*
*Context gathered: 2026-01-30*
