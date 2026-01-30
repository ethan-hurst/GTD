# Feature Research: GTD Productivity Planner

**Domain:** Personal Productivity / Getting Things Done (GTD) Applications
**Researched:** 2026-01-30
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Quick Capture | GTD requires capturing everything instantly without friction. Multiple sources emphasize "if it takes more than a minute, your mind resists" | LOW | Must support multiple input methods: keyboard shortcut, quick-add bar, mobile widget. Friction = system failure |
| Inbox Processing Workflow | Core GTD phase: "What is it? Is it actionable?" Users expect guided workflow through capture → clarify | MEDIUM | Needs clear UI for 2-minute rule, delegate, defer, delete decisions. Sequential processing prevents overwhelm |
| Next Actions Lists | Foundation of GTD: "What's the next physical action?" Users expect this as primary view | LOW | Must be separate from projects. One next action per project minimum |
| Context/Tag Filtering | GTD users filter by @home, @office, @computer, @phone, etc. Critical for "where am I/what tools do I have" workflow | MEDIUM | Must support custom contexts. Common mistake: too many contexts = unwieldy system |
| Project Hierarchies | GTD distinguishes "projects" (multi-step outcomes) from "next actions" (single steps). Users expect clear separation | MEDIUM | Project = anything requiring >1 action. Must show which projects lack next actions (stalled warning) |
| Waiting For List | GTD core list: track delegated items and things waiting on others | LOW | Must support who/what/when structure. Review during weekly review |
| Someday/Maybe List | GTD core list: ideas not yet committed to. Users expect place to park future possibilities without cluttering active lists | LOW | Critical distinction: "committed" vs "not committed." Moving between lists must be easy |
| Weekly Review Checklist | David Allen calls this "critical success factor for GTD." Users expect guided review process | MEDIUM | Must include: empty inbox, review calendar (past/future), review all projects, review someday/maybe. 30min-2hr process |
| Calendar View | GTD separates "hard landscape" (time-specific) from "soft landscape" (context-based). Users expect calendar for appointments only | LOW | Integration with existing calendars essential. Do NOT mix tasks and appointments in calendar (anti-pattern) |
| Search & Filtering | Users need to find items quickly across all lists. "One minute to file, one minute to find" principle | LOW | Full-text search across tasks, projects, notes. Filter by multiple contexts simultaneously |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| GTD Onboarding for Beginners | User is new to GTD. Guided setup with progressive disclosure of complexity | HIGH | Show basic GTD workflow first (capture/clarify/organize), add advanced features after 3-month habit formation. Include "why" explanations for GTD principles |
| Microsoft Graph Integration | Two-way sync with Outlook/Teams calendar. Corporate environment standard | HIGH | Differentiation: seamless corporate workflow. Read Outlook appointments → show in GTD calendar. Create GTD tasks from Teams messages |
| Perspective/Custom Views | OmniFocus's killer feature: saved filters combining context + project + date. Power users love this | MEDIUM | Example: "Home evening" = @home context + energy:low + available:today. Saves cognitive load |
| Defer Dates (Start Dates) | OmniFocus feature: task invisible until "ready" date. Reduces list clutter | LOW | Different from due date. "Start working on taxes Jan 15" hides until then. Prevents premature cognitive load |
| Sequential vs Parallel Projects | OmniFocus distinction: sequential shows only first next action, parallel shows all available actions | MEDIUM | Sequential = must do steps in order. Parallel = can do any step. Reduces decision fatigue |
| Review Cycles per Project | Advanced GTD: different projects reviewed at different frequencies (daily/weekly/monthly) | MEDIUM | Startup project = review daily. Long-term goal = review monthly. Customizable per project |
| Energy/Time Estimates | Filter next actions by "I have 15 minutes and low energy" → show matching tasks | MEDIUM | Beyond basic GTD but highly valued. Tag tasks with time (5min/30min/2hr) and energy (low/med/high) |
| Reference Material Integration | GTD clarify step: "not actionable but useful info." Link reference docs to projects | MEDIUM | Evernote integration common. Or built-in doc storage. Must be searchable and tagged |
| Template Projects | Recurring workflows (e.g., "Weekly Review," "Monthly Budget," "Travel Prep") saved as templates | LOW | Huge time saver for repeated processes. Clone project → all next actions created |
| Natural Language Parsing | Todoist feature: "buy milk tomorrow @errands !p1" → parsed into task with date, context, priority | MEDIUM | Reduces capture friction. Common patterns: dates ("tomorrow," "next Tuesday"), contexts (@home), priority (!p1) |
| Forecast View | OmniFocus feature: calendar + tasks with due dates in single timeline view | MEDIUM | Shows "hard landscape" + deadlines together. Helps plan day holistically |
| Batch Context Processing | "I'm at the store, show me all @errands" → check off multiple tasks in one location visit | LOW | Simple but powerful. Reduces context switching. Show completed count for satisfaction |
| Offline-First Architecture | Corporate environments often have spotty connectivity. Must work fully offline | HIGH | Differentiation for corporate users. Sync when connected. No internet ≠ productivity loss |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems in GTD systems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Calendar-Based Task Scheduling | Users want to "plan their day" by dragging tasks to calendar slots | GTD principle: calendar = hard landscape only. Mixing tasks + appointments causes stress when tasks don't get done and calendar feels "wrong" | Use defer dates + context filtering instead. "What can I do now?" not "what did I schedule at 2pm?" |
| Complex Priority Systems | Users want P1/P2/P3/P4/urgent/important matrices | Creates analysis paralysis during processing. GTD uses context/energy/time instead of priority because priority is situational | Use "This is blocking others" flag for truly urgent items. Otherwise trust context system |
| Automatic Due Dates | Users want everything to have a deadline for "accountability" | Most tasks don't have real due dates. Fake deadlines create "boy who cried wolf" problem → ignore all due dates | Only use due dates for real deadlines. Most GTD tasks have no due date (use defer date instead) |
| Collaborative Team Features | Users request task assignment, comments, team boards | GTD is personal productivity system. Adding collaboration creates "inbox checking" behavior and context switching | Keep GTD for personal capture. Use separate team tool (Teams/Slack) for collaboration. GTD captures your commitments from those tools |
| Gamification/Streaks | Users want points, badges, streak counters for completing tasks | Focuses on quantity over quality. GTD is about appropriate engagement, not maximum completion. Creates pressure to do easy tasks vs important tasks | Use weekly review reflection instead. "Did I move important projects forward?" > "Did I complete 50 tasks?" |
| Nested Projects > 2 Levels | Users want folder/project/subproject/task hierarchies | GTD keeps it simple: Areas of Focus → Projects → Next Actions (3 levels max). Deeper nesting = harder to find next actions, violates "one next action visible" principle | Use project support material for planning, but keep action lists flat with context tags |
| Automatic Task Creation from Email | Users want every email to become a task automatically | Creates noise. Most emails are reference material, not actionable. GTD clarify step is manual for reason | Provide quick "add to inbox" from Outlook, but require user to process through GTD workflow |
| Real-Time Notifications | Users want push notifications for every task due, every update, every context change | Interrupts deep work. GTD is pull-based ("What should I do now?") not push-based ("Do this now!") | Optional due date reminders only. Otherwise user checks lists when ready to engage |

## Feature Dependencies

```
Core GTD Workflow (Must Build First):
  Quick Capture
    └──requires──> Inbox List
                      └──requires──> Processing Workflow
                                        └──requires──> Next Actions Lists
                                                          └──requires──> Context Tags
                                        └──requires──> Projects List
                                        └──requires──> Waiting For List
                                        └──requires──> Someday/Maybe List
                                        └──requires──> Reference Material Storage

Weekly Review
    └──requires──> All core lists above
    └──requires──> Calendar View
    └──enhances──> Project Review (can be built later)

Advanced Features (Build After Core):
  Defer Dates ──enhances──> Next Actions Lists
  Sequential/Parallel Projects ──enhances──> Projects List
  Custom Perspectives ──requires──> Context Tags + Projects + Defer Dates
  Energy/Time Estimates ──enhances──> Context Filtering
  Template Projects ──requires──> Projects + Next Actions

Microsoft Integration (Parallel Track):
  Outlook Calendar Sync ──integrates with──> Calendar View
  Teams Message Capture ──integrates with──> Quick Capture
  Graph API Authentication ──required for──> All Microsoft integrations

Conflicts:
  Calendar Task Scheduling ──conflicts with──> GTD Calendar Principles
  Automatic Due Dates ──conflicts with──> GTD "Most Tasks Have No Due Date"
  Collaborative Features ──conflicts with──> Personal GTD System Design
```

### Dependency Notes

- **Core GTD Workflow is atomic**: Cannot skip any step. Processing requires destination lists. Lists require capture. Must build complete workflow for MVP.
- **Weekly Review requires all core lists**: Cannot review what doesn't exist. Build after core lists functional.
- **Microsoft Integration is parallel track**: Can develop alongside core GTD features. Does not block core workflow.
- **Advanced features enhance, don't replace core**: Perspectives are useless without contexts. Defer dates need next actions list. Build advanced features only after core is proven.
- **Calendar integration is read-only initially**: Show Outlook appointments in GTD calendar view. Write-back (creating Outlook events from GTD) is Phase 2+.

## MVP Definition

### Launch With (v1 - Core GTD Workflow)

Minimum viable product — what's needed to validate the GTD system works for user.

- [ ] **Quick Capture** — Keyboard shortcut to add to inbox instantly. GTD lives or dies on frictionless capture.
- [ ] **Inbox List** — Single unified inbox for all captured items. Processing must be sequential, not scattered.
- [ ] **Processing Workflow** — Guided UI: "What is it? Actionable? 2-min rule? Next action or project?" Must teach GTD thinking.
- [ ] **Next Actions Lists** — Primary working view. Group by context (@home, @office, @computer, etc.).
- [ ] **Context Tags** — @home, @office, @errands, @computer, @phone minimum. User can add custom contexts.
- [ ] **Projects List** — Multi-step outcomes. Show which projects lack next actions (visual warning).
- [ ] **Waiting For List** — Delegated items. Fields: what, who, when delegated. Reviewed weekly.
- [ ] **Someday/Maybe List** — Not-yet-committed ideas. Easy promotion to Projects when ready.
- [ ] **Basic Calendar View** — Read-only view of user's existing calendar. Shows "hard landscape" for daily planning.
- [ ] **Search** — Find any task/project instantly. Must work across all lists.
- [ ] **Offline Mode** — Local storage, syncs when online. Corporate networks unreliable.

**Rationale**: These 11 features implement complete GTD workflow. User can capture → process → organize → review → engage. Anything less breaks GTD methodology.

### Add After Validation (v1.1-1.3)

Features to add once core workflow proves valuable.

- [ ] **Weekly Review Checklist** — Guided workflow through all GTD review steps. Add after user has 2-4 weeks of data to review.
- [ ] **Outlook Calendar Integration** — Two-way sync via Microsoft Graph API. Add after manual calendar reference proves valuable.
- [ ] **Defer Dates** — Start dates for future tasks. Add when users report "too many next actions visible."
- [ ] **Natural Language Parsing** — "Buy milk tomorrow @errands" → parsed task. Add when capture volume increases.
- [ ] **Template Projects** — Saved project structures for recurring workflows. Add when user has 10+ completed projects showing patterns.

**Triggers for adding:**
- Weekly Review: After 2 weeks of usage (user needs data to review)
- Outlook Integration: User feedback "I'm switching between GTD and Outlook constantly"
- Defer Dates: User reports list overwhelm or premature tasks visible
- NLP: Average >5 captures per day (efficiency matters)
- Templates: User completes 3+ similar projects (pattern exists)

### Future Consideration (v2+)

Features to defer until product-market fit established and core GTD workflow proven.

- [ ] **Sequential/Parallel Projects** — OmniFocus-style project types. Complex feature, benefits only power users.
- [ ] **Custom Perspectives** — Saved filter combinations. Requires understanding of context/project/date interplay (advanced).
- [ ] **Energy/Time Estimates** — Filter by "I have 15 minutes and low energy." Beyond core GTD, nice-to-have.
- [ ] **Reference Material System** — Integrated doc storage linked to projects. Can use external tools (OneDrive) initially.
- [ ] **Review Cycles per Project** — Different projects reviewed at different frequencies. Power user feature.
- [ ] **Teams Integration** — Capture tasks from Teams messages. Requires Graph API + UI for message → task flow.
- [ ] **Forecast View** — Calendar + due dates in timeline. Nice visualization, not essential.
- [ ] **Mobile Apps** — Native iOS/Android. Web responsive view sufficient for MVP in "runs in browser" context.

**Why defer:**
- Sequential/Parallel: Adds complexity before core proven. Can manually note "do in order" initially.
- Perspectives: Power user feature. Manual filtering sufficient until user has 50+ active tasks.
- Energy/Time: Beyond GTD core. Many GTD users don't use this.
- Reference: External tools (OneDrive/SharePoint) already available in corporate environment.
- Review Cycles: Weekly review sufficient for MVP. Monthly/quarterly cadences for mature systems.
- Teams: Outlook integration higher priority (calendar more essential than messages).
- Forecast: Visual enhancement, not workflow change. "Nice to see" not "need to work."
- Mobile: "Runs in browser alongside Outlook/Teams" = desktop web app. Mobile access via browser acceptable for MVP.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority | Phase |
|---------|------------|---------------------|----------|-------|
| Quick Capture | HIGH | LOW | P1 | MVP |
| Inbox Processing Workflow | HIGH | MEDIUM | P1 | MVP |
| Next Actions Lists | HIGH | LOW | P1 | MVP |
| Context Tags | HIGH | MEDIUM | P1 | MVP |
| Projects List | HIGH | MEDIUM | P1 | MVP |
| Waiting For List | HIGH | LOW | P1 | MVP |
| Someday/Maybe List | HIGH | LOW | P1 | MVP |
| Offline Mode | HIGH | MEDIUM | P1 | MVP |
| Search | HIGH | LOW | P1 | MVP |
| Basic Calendar View | MEDIUM | LOW | P1 | MVP |
| Weekly Review Checklist | HIGH | MEDIUM | P2 | v1.1 |
| Outlook Calendar Sync | HIGH | HIGH | P2 | v1.1 |
| Defer Dates | MEDIUM | LOW | P2 | v1.2 |
| Natural Language Parsing | MEDIUM | MEDIUM | P2 | v1.2 |
| GTD Onboarding Guide | HIGH | MEDIUM | P2 | v1.1 |
| Template Projects | MEDIUM | MEDIUM | P2 | v1.3 |
| Sequential/Parallel Projects | MEDIUM | HIGH | P3 | v2+ |
| Custom Perspectives | MEDIUM | HIGH | P3 | v2+ |
| Energy/Time Estimates | LOW | MEDIUM | P3 | v2+ |
| Reference Material System | LOW | HIGH | P3 | v2+ |
| Teams Integration | MEDIUM | HIGH | P3 | v2+ |
| Forecast View | LOW | MEDIUM | P3 | v2+ |

**Priority key:**
- P1: Must have for launch (MVP) — core GTD workflow
- P2: Should have, add when core proven (v1.x) — enhances core workflow
- P3: Nice to have, future consideration (v2+) — power user features

## Competitor Feature Analysis

Based on research of leading GTD apps in 2026 ecosystem.

| Feature | OmniFocus (GTD Gold Standard) | Todoist (Balance) | Nirvana (Pure GTD) | Our Approach (Corporate GTD) |
|---------|-------------------------------|-------------------|-------------------|------------------------------|
| **Platform** | Apple only | Cross-platform | Cross-platform | Web (runs alongside Outlook) |
| **GTD Fidelity** | Built for GTD, follows methodology exactly | Configurable for GTD, not GTD-native | Built for GTD | Built for GTD with beginner guidance |
| **Learning Curve** | Steep - power users love, beginners struggle | Gentle - mainstream usable | Moderate - GTD-focused | Gentle - guided onboarding for GTD newbies |
| **Context Implementation** | Contexts + tags both available | Labels (serve as contexts) | Contexts built-in | Contexts built-in + guided setup |
| **Project Types** | Sequential/Parallel distinction | Single type + sub-tasks | Single type | Start with single type, add sequential/parallel v2+ |
| **Perspectives/Views** | Highly customizable saved filters | Basic filters | GTD-specific views | Start basic, add custom perspectives v2+ |
| **Defer Dates** | Yes - "Available" date separate from due | No native support | Yes | v1.2 feature (after core proven) |
| **Calendar Integration** | Apple Calendar read/write | Google Calendar two-way | Limited | Outlook two-way (differentiation) |
| **Weekly Review** | Review mode with project scanning | Manual checklist templates | Built-in review workflow | Guided checklist (v1.1) |
| **Quick Capture** | Multiple methods, Siri shortcuts | Fast, natural language parsing | Quick add bar | Keyboard shortcut + NLP in v1.2 |
| **Offline Mode** | Full offline (Apple sync) | Full offline (local DB) | Full offline | Full offline (differentiation for corporate) |
| **Collaboration** | None - personal only | Team features available | None - personal only | None - personal GTD (avoid anti-feature) |
| **Reference Material** | Notes per task/project | Comments + file attachments | Notes area | Link to OneDrive/SharePoint (v2+) |
| **Price Model** | Premium ($99/yr) | Freemium ($4/mo premium) | Free basic, $5/mo pro | TBD - likely free (internal tool) |
| **Target User** | GTD power users, complex workflows | General productivity, GTD-compatible | GTD practitioners | Corporate GTD beginners |

**Our Competitive Position:**

1. **Microsoft Integration**: OmniFocus = Apple, Todoist = Google, We = Microsoft. Corporate environment differentiation.
2. **GTD Beginner-Friendly**: OmniFocus assumes GTD knowledge, we guide adoption. User is "new to GTD" per context.
3. **Offline Corporate**: Many GTD apps assume good connectivity. Corporate networks = spotty. Full offline mode table stakes.
4. **Pure Personal System**: Avoid Todoist's collaboration complexity. GTD is personal. Capture from Teams/Outlook but don't mix systems.

**What We Won't Match:**

- OmniFocus power features (perspectives, review cycles) — defer to v2+ after core proven
- Todoist's broad platform reach (mobile apps) — web-first, mobile via responsive design acceptable
- Nirvana's GTD purity with minimal features — we add beginner guidance and Microsoft integration

**What We Do Better:**

- Outlook/Teams integration (competitors weak here)
- Onboarding for GTD beginners (most assume GTD knowledge)
- Offline-first for corporate networks (most assume cloud connectivity)

## Sources

### GTD Methodology & Official Guidance
- [Getting Things Done Official Tools & Software](https://gettingthingsdone.com/common-tools-software/)
- [GTD Weekly Review Checklist](https://gettingthingsdone.com/wp-content/uploads/2014/10/Weekly_Review_Checklist.pdf)
- [Basic GTD: How to Process Your Stuff](https://facilethings.com/blog/en/basics-processing)
- [Basic GTD: The Weekly Review](https://facilethings.com/blog/en/basics-weekly-review)
- [GTD Contexts — Theoretical & Practical Guide](https://facilethings.com/blog/en/gtd-contexts)
- [Managing the Someday/Maybes with GTD](https://facilethings.com/blog/en/someday-maybes)

### GTD Apps Ecosystem 2026
- [9 Best GTD Apps & Software for Getting Things Done in 2026](https://clickup.com/blog/gtd-apps/)
- [Top GTD apps for Getting Things Done in 2026](https://www.onepagecrm.com/blog/gtd-business-software-to-stay-organized/)
- [Best To-Do Apps for GTD in 2026](https://toolfinder.co/best/gtd-task-management-apps)
- [Slant - 37 Best GTD apps as of 2026](https://www.slant.co/topics/4718/~gtd-apps)
- [The Best GTD® Apps For Getting Things Done](https://www.asianefficiency.com/technology/best-gtd-apps/)

### Feature Implementation Best Practices
- [Master Getting Things Done (GTD) Method in 5 Steps [2025]](https://asana.com/resources/getting-things-done-gtd)
- [Getting Things Done (GTD) - Productivity Methods](https://www.todoist.com/productivity-methods/getting-things-done)
- [GTD in 15 minutes – A Pragmatic Guide](https://hamberg.no/gtd)
- [Quick Start Guide: How to Start Implementing GTD Successfully](https://facilethings.com/blog/en/how-to-start-implementing-GTD-successfully)
- [GTD 101: The Beginner's Guide to Getting Things Done](https://www.asianefficiency.com/task-management/gtd-intro/)

### Weekly Review & Processing
- [GTD Weekly Review: The Habit That Makes GTD Work](https://super-productivity.com/blog/gtd-weekly-review-guide/)
- [The Ultimate Guide to Perform a GTD Weekly Review](https://www.asianefficiency.com/productivity/gtd-weekly-review/)
- [Free Weekly Review Template for 2024](https://www.todoist.com/templates/gtd-weekly-review)

### Context Tags & Filtering
- [GTD Contexts: How To Identify Them](https://www.dragosroua.com/gtd-contexts/)
- [FacileThings Tutorial: Tags and Contexts](https://facilethings.com/learning/en/tutorial/tags-and-contexts)
- [GTD context tags - Getting Things Done® Forums](https://forum.gettingthingsdone.com/threads/gtd-context-tags.17798/)

### Microsoft Outlook/Teams Integration
- [GTD and InBox Zero with Microsoft Outlook](https://simonangling.com/gtd-and-inbox-zero-with-outlook/)
- [Learn How to Implement a Seamless GTD Outlook Workflow](https://flow-e.com/gtd/outlook/)
- [GTD Outlook add-in - ClearContext](https://www.clearcontext.com/gtd/)
- [How to apply GTD in Microsoft Outlook](https://productivehappiness.substack.com/p/how-to-apply-gtd-in-microsoft-outlook)

### Calendar Integration Patterns
- [FacileThings Tutorial: Google Calendar Integration](https://facilethings.com/learning/en/tutorial/google-calendar-integration)
- [FacileThings Tutorial: Outlook Calendar Integration](https://facilethings.com/learning/en/tutorial/outlook-calendar-integration)
- [How important is calendar integration to you?](https://forum.gettingthingsdone.com/threads/how-important-is-calendar-integration-to-you.15188/)

### Common Mistakes & Problems
- [19 common mistakes in GTD (7): the wrap](https://medium.com/@rubengp/19-common-mistakes-in-gtd-7-the-wrap-a1c873390a99)
- [8 Potential Problems & Disadvantages of the GTD Method](https://productivitypatrol.com/gtd-problems-disadvantages/)
- [How to Manage Problems with GTD](https://facilethings.com/blog/en/how-to-manage-problems-with-gtd)

### Competitive Analysis
- [Things vs OmniFocus vs Todoist: A comparison of the best GTD app suites](https://thesweetsetup.com/articles/comparison-best-gtd-apps-things-todoist-omnifocus/)
- [Todoist vs Omnifocus detailed comparison as of 2026](https://www.slant.co/versus/4409/4436/~todoist_vs_omnifocus)
- [OmniFocus vs Todoist - 2026 Comparison](https://www.softwareadvice.com/project-management/omnifocus-profile/vs/todoist/)

### Reference Material Organization
- [How to Organize Your Reference Material](https://facilethings.com/blog/en/organize-reference-material)
- [GTD Dictionary: Reference Material](https://facilethings.com/gtd-dictionary/en/reference-material)
- [How to structure your Reference Material?](https://forum.gettingthingsdone.com/threads/how-to-structure-your-reference-material.17239/)

---
*Feature research for: GTD Productivity Planner (Web-based, Microsoft environment, beginner-friendly)*
*Researched: 2026-01-30*
*Confidence: HIGH (verified with official GTD sources, current 2026 ecosystem analysis, competitive research)*
