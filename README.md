# GTD Planner

A web-based personal productivity app that implements the full [Getting Things Done](https://gettingthingsdone.com/) methodology. Captures everything on your plate, routes it through a guided GTD decision tree, and always surfaces what to do next.

**Stack:** SvelteKit 2 · Svelte 5 · Dexie (IndexedDB) · Tailwind v4 · Netlify

---

## Features

### Core GTD System
- **Inbox capture** — quick entry via keyboard shortcut (`Cmd+I` / `/`) with inline input
- **Processing workflow** — 5-step GTD decision tree routing items to all destination lists
- **Next actions** — context-filtered views (`@computer`, `@office`, `@phone`, `@home`, `@errands`) with custom contexts, drag-and-drop reordering, and project linking
- **Projects** — multi-step outcome tracking with stalled detection and action linking
- **Waiting-for** — delegation tracking with follow-up dates and overdue indicators
- **Someday/maybe** — idea parking across 8 categories with promote-to-project/action
- **Weekly review** — guided 8-step wizard with live item counts and confetti on completion

### App
- **Offline-first** — Dexie IndexedDB with service worker caching; works without a connection
- **Data export/import** — JSON backup with download and restore
- **Calendar view** — day/week/month views with ICS import, recurrence support, and next-actions side panel
- **GTD onboarding** — 5-step wizard with real capture and contextual feature hints for newcomers
- **Dark mode** — class-based theming

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Install & run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Build

```bash
npm run build
npm run preview
```

---

## Project Structure

```
src/
├── lib/
│   ├── components/   # Svelte UI components
│   ├── db/           # Dexie schema and operations
│   ├── stores/       # Svelte 5 $state stores
│   ├── sync/         # Sync utilities (crypto, merge)
│   ├── services/     # External integrations
│   └── utils/        # Shared helpers
└── routes/
    ├── actions/      # Next actions view
    ├── calendar/     # Calendar view
    ├── projects/     # Projects view
    ├── waiting/      # Waiting-for view
    ├── someday/      # Someday/maybe view
    ├── review/       # Weekly review
    └── settings/     # App settings
```

---

## Testing

```bash
# Unit tests
npm run test

# Unit tests with coverage
npm run test:coverage

# End-to-end tests (Playwright)
npm run test:e2e
```

---

## Deployment

Deployed to Netlify. Any push to `main` triggers a production deploy via `netlify.toml`.

```bash
npm run build   # outputs to /build
```

---

## Roadmap

### v1.1 — Outlook Calendar Sync *(in progress)*
- Read Outlook calendar events into GTD's calendar view
- Push GTD tasks with scheduled times to Outlook as calendar events
- OAuth 2.0 via MSAL (user + admin consent flows)
- Delta query sync, offline-aware sync queue, conflict resolution (Outlook wins)

### Future
- Defer dates — hide tasks until relevant
- Natural language capture ("buy milk tomorrow @errands")
- Template projects for recurring workflows
- Custom perspectives (saved filter combinations)

---

## Architecture Notes

| Decision | Rationale |
|----------|-----------|
| Offline-first with Dexie | Works without connection; Storage Manager API prevents eviction |
| Svelte 5 `$state` runes | Consistent reactive store pattern across all features |
| Tailwind v4 via Vite plugin | No PostCSS config needed; `@custom-variant dark` for class-based dark mode |
| `@event-calendar/core` over FullCalendar | 35 KB vs 150 KB+; native Svelte 5 support |
| Schema extension over separate tables | Optional fields on `GTDItem` for waiting/someday; simpler queries |
| `ProcessingFlow` as central routing hub | Single component handles all 7 GTD decision paths |
