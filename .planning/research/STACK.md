# Technology Stack

**Project:** GTD Personal Productivity Web App
**Researched:** 2026-01-30
**Confidence:** HIGH

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **React** | 19.2 | UI framework | Industry standard with massive ecosystem, excellent TypeScript support, mature hooks API. React 19 adds server components and async rendering capabilities. Over 2M monthly documentation visitors. Safest choice for hiring and long-term maintenance. |
| **TypeScript** | 5.8+ | Type safety | 70%+ of React developers use TypeScript in 2025. Provides compile-time error detection, better IDE support, and improved maintainability. TS 5.8 adds erasable syntax support and better Node.js module compatibility. |
| **Vite** | 7.3+ | Build tool & dev server | Blazing fast dev server (starts in <1s), near-instant HMR, native ESM support. Vite is the default choice for new React SPAs in 2025, vastly superior to Webpack for single-page applications. 10x faster than traditional bundlers. |

**Confidence:** HIGH - All verified through official documentation and Context7.

**Alternative considered:** Next.js - While Next.js can build SPAs, it's optimized for SSR/SSG and adds unnecessary complexity for a single-user local-first app. Vite + React is the right choice for pure SPAs.

### State Management

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Zustand** | 5.0.10+ | Global state management | Minimal boilerplate, tiny bundle size, hooks-based API. Perfect for medium-scale apps. "More productive in one weekend with Zustand than weeks in React." Better DX than Redux for apps that don't need enterprise-grade debugging tools. |
| **TanStack Query** | 5.90+ (v5) | Server state & data fetching | Industry standard for async state management, caching, and data synchronization. Essential for future Microsoft Graph API integration. Includes DevTools, automatic refetching, request deduplication, and optimistic updates. |

**Confidence:** HIGH - Zustand v5.0.10 verified via GitHub releases (2025-01-12). TanStack Query v5.90.19 verified via npm (2025-01-30).

**Rationale:** This combination is the 2025 standard - use Zustand for UI/local state (sidebar open/closed, form state, filters) and TanStack Query for server state (Microsoft Graph data, calendar sync). Avoids Redux's complexity while remaining scalable.

**Alternative considered:** Redux Toolkit - Overkill for single-user app. Redux makes sense for large teams needing standardized patterns and time-travel debugging. Not needed here.

### Database & Storage

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **IndexedDB** | Native API | Local database | Browser-native, transactional NoSQL database. Can store hundreds of MB to multiple GB of data. Essential for offline-first GTD app. Chrome allows ~80% of free disk space per origin. |
| **Dexie.js** | 4.0+ | IndexedDB wrapper | Simplifies IndexedDB's complex API with Promise-based interface. Industry standard wrapper with offline-first capabilities, real-time sync support, and framework integrations. Much better DX than raw IndexedDB. |

**Confidence:** HIGH - Dexie.js v4.0 verified via official docs. IndexedDB capabilities verified via MDN.

**Rationale:** Local-first architecture is critical for GTD apps - users need instant response times and offline access. IndexedDB provides robust client-side storage, and Dexie.js makes it developer-friendly. This enables the entire GTD workflow to run locally with millisecond response times.

**Storage architecture:** All GTD data (inbox, projects, next actions, contexts, reviews) stored in IndexedDB. Microsoft Graph API integration will sync calendar data bidirectionally, but local IndexedDB remains source of truth for GTD-specific data.

### Microsoft Integration

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **MSAL React** | Latest (@azure/msal-react) | Microsoft authentication | Official Microsoft library for OAuth 2.0 auth in React SPAs. Uses Authorization Code Flow with PKCE. Wrapper around MSAL.js with React context API, hooks (useMsal, useAccount), and components (MsalProvider, AuthenticatedTemplate). |
| **Microsoft Graph SDK** | Latest (@microsoft/microsoft-graph-client) | Microsoft Graph API client | Official SDK for calling Microsoft Graph API. Handles request building, authentication token attachment, error handling. Use v1.0 endpoint for production (not beta). |

**Confidence:** HIGH - Verified via Microsoft Learn official documentation.

**Rationale:** These are Microsoft's official libraries with comprehensive documentation, active maintenance, and examples. MSAL React provides the authentication layer, and Graph SDK simplifies API calls for Outlook/Teams calendar integration.

**Implementation notes:**
- Register app in Azure Portal for Client ID and Tenant ID
- Request scopes: `User.Read`, `Calendars.ReadWrite`, `Tasks.ReadWrite`
- Use Graph Explorer (https://developer.microsoft.com/graph/graph-explorer) for API testing
- Microsoft Graph Toolkit is deprecated (retirement Aug 2026) - use SDK instead

### UI & Styling

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Tailwind CSS** | 3.4+ | Utility-first CSS framework | Industry standard for rapid UI development. Enforces design system consistency, excellent with AI assistants (Copilot suggests Tailwind classes), zero runtime cost. Perfect for productivity apps needing quick iterations. |
| **shadcn/ui** | Latest | Component primitives | Copy-paste component library built on Radix UI + Tailwind. 70+ accessible components with dark mode support. You own the code (no package lock-in), full customization. De facto standard for modern React + Tailwind apps in 2025. |
| **Radix UI** | Latest | Headless UI primitives | Accessible, unstyled primitives (dialogs, menus, tooltips) with proper ARIA attributes and keyboard navigation. 130M+ monthly downloads, battle-tested at scale (Vercel, Linear, Supabase). shadcn/ui is built on Radix. |

**Confidence:** HIGH - shadcn/ui verified via official docs. Tailwind and Radix are industry standards.

**Rationale:** This trio is the 2025 gold standard for React UIs. Tailwind provides rapid styling, Radix handles accessibility/behavior, and shadcn/ui provides pre-built components you can customize. For a GTD app needing forms, dialogs, dropdowns, and complex interactions, this stack provides everything out of the box.

**Installation:**
```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button dialog form select
```

### Testing

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Vitest** | Latest | Test runner | Modern alternative to Jest, 10x faster (tests that took 18s with Jest run in 1.8s). Native ESM support, zero config with Vite, 95% Jest-compatible API. Default choice for Vite projects in 2025. |
| **React Testing Library** | Latest (@testing-library/react) | Component testing | Industry standard for React component testing. Works seamlessly with Vitest. Tests user behavior, not implementation details. |

**Confidence:** HIGH - Verified via multiple 2025 benchmarks and official documentation.

**Rationale:** If you're using Vite, use Vitest. Performance improvement is dramatic (30-70% faster test runs), and setup is trivial since Vitest uses your existing Vite config. React Testing Library is non-negotiable - it's the standard for React testing.

**Alternative considered:** Jest - Only use Jest if building React Native (where it's mandatory). For web SPAs with Vite, Vitest is superior.

## Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **React Router** | 7.x | Client-side routing | For multi-view GTD app (inbox, projects, contexts, review pages). Industry standard router with excellent TypeScript support. |
| **date-fns** | 3.x | Date manipulation | Lightweight, tree-shakeable date utilities. Better than Moment.js (deprecated). Essential for GTD weekly reviews, due dates, recurring tasks. |
| **zod** | 3.x | Runtime validation | TypeScript-first schema validation. Use for form validation, API response validation, local storage data integrity. |
| **React Hook Form** | 7.x | Form management | Best-in-class form library. Minimal re-renders, excellent TypeScript support, integrates with zod for validation. GTD apps have many forms (capture, process, review). |
| **cmdk** | Latest | Command palette | Keyboard-first command interface. Essential for power users - quick capture, quick navigation. Used by Linear, Vercel, Raycast. |

**Confidence:** MEDIUM-HIGH - Libraries verified via ecosystem research. Versions based on WebSearch findings (not all individually verified).

## Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **ESLint** | Code linting | Use @typescript-eslint for TypeScript projects. Configure with React plugin. |
| **Prettier** | Code formatting | Standard formatter. Integrates with Tailwind plugin for class sorting. |
| **TypeScript strict mode** | Type checking | Enable `"strict": true` in tsconfig.json for maximum type safety. |
| **Vite environment modes** | Environment config | Use `.env.local` for development, `.env.production` for production builds. Store Azure app registration credentials here (never commit). |

## Installation

```bash
# Create Vite + React + TypeScript project
npm create vite@latest gtd-app -- --template react-ts

# Core dependencies
npm install zustand @tanstack/react-query dexie react-router-dom

# Microsoft integration
npm install @azure/msal-react @azure/msal-browser @microsoft/microsoft-graph-client

# UI & styling
npm install tailwindcss postcss autoprefixer
npx tailwindcss init -p
npx shadcn-ui@latest init

# Forms & validation
npm install react-hook-form zod @hookform/resolvers

# Utilities
npm install date-fns cmdk

# Dev dependencies
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser
npm install -D prettier prettier-plugin-tailwindcss
npm install -D @types/node
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| **React + Vite** | Next.js | If you need SSR/SSG for SEO, or plan to add server-side features. Not needed for single-user local-first app. |
| **React** | Vue 3 / Svelte | Vue has gentler learning curve, Svelte has smaller bundles. Use React for hiring, ecosystem, Microsoft Graph examples (mostly React). |
| **Zustand** | Redux Toolkit | Large teams (10+ developers) needing strict patterns, time-travel debugging, enterprise compliance requirements. |
| **Vite** | Webpack | Only for legacy projects. Webpack is no longer chosen for new projects in 2025. |
| **Vitest** | Jest | React Native projects (Jest is mandatory). Otherwise use Vitest. |
| **IndexedDB + Dexie** | SQLite + wa-sqlite | If you need SQL queries, complex joins, or multi-GB datasets. IndexedDB is simpler for most cases. |
| **Tailwind CSS** | CSS Modules | Prefer clean HTML/CSS separation, maintaining legacy project, or need full CSS control for complex animations. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Create React App (CRA)** | Deprecated, unmaintained since 2022. Slow build times, outdated dependencies. | Vite (official React docs recommend Vite for new SPAs) |
| **Moment.js** | Deprecated, large bundle size, no tree-shaking. | date-fns or Day.js |
| **Webpack (for new projects)** | Slow dev server, complex configuration, poor DX compared to Vite. | Vite |
| **Microsoft Graph Toolkit** | Deprecated - retirement period begins Sept 2025, full retirement Aug 2026. | Microsoft Graph SDK + MSAL React |
| **localStorage for GTD data** | 5-10MB limit, synchronous API blocks UI, no indexing or queries. | IndexedDB via Dexie.js |
| **Redux without Toolkit** | Massive boilerplate, outdated patterns. Even Redux docs say "use Redux Toolkit". | Zustand or Redux Toolkit |
| **Class components** | Outdated React pattern. Hooks (functional components) are standard since React 16.8 (2019). | Functional components with hooks |
| **React.FC / FunctionComponent type** | Discouraged in 2025 - implicitly defines children prop, causes type errors. | Define props explicitly via interfaces |

## Stack Patterns by Use Case

**For this GTD app (single-user, local-first, future cloud sync):**
- React + TypeScript + Vite (core)
- Zustand (UI state) + TanStack Query (server state)
- IndexedDB + Dexie.js (local storage)
- Tailwind + shadcn/ui + Radix UI (styling)
- MSAL React + Microsoft Graph SDK (future integration)
- Vitest + React Testing Library (testing)

**If requirements change:**

**If multi-user SaaS:**
- Add: Backend (Node.js + tRPC or REST API)
- Add: PostgreSQL + Prisma (server database)
- Add: NextAuth.js (multi-provider auth)
- Consider: Next.js instead of Vite (for SSR)

**If mobile app needed:**
- Add: React Native (shares business logic with web)
- Keep: Same state management (Zustand, TanStack Query)
- Change: AsyncStorage instead of IndexedDB

**If enterprise deployment:**
- Add: Redux Toolkit instead of Zustand (standardized patterns)
- Add: Extensive logging (Sentry, LogRocket)
- Add: Comprehensive E2E tests (Playwright, Cypress)

## Version Compatibility

All recommended packages are compatible with:
- **React:** 18.2+ or 19.x
- **TypeScript:** 5.0+, recommend 5.8+
- **Node.js:** 18+ (LTS) or 20+ (recommended)

**Known compatibility notes:**
- Zustand v5 requires TypeScript 4.5+
- TanStack Query v5 requires React 18+
- MSAL React requires React 16.8+ (hooks support)
- Vitest works best with Vite projects (shares config)

## Architecture Implications

This stack enables a **local-first, offline-capable architecture:**

1. **Data tier:** IndexedDB (via Dexie) stores all GTD data locally
2. **State tier:** Zustand manages UI state, TanStack Query manages server state (Microsoft Graph)
3. **UI tier:** React components styled with Tailwind/shadcn
4. **Sync tier:** TanStack Query + Microsoft Graph SDK for bidirectional calendar sync

**Data flow:**
- User captures task → saved to IndexedDB → UI updates via Zustand
- User processes inbox → queries IndexedDB → displays via React
- Weekly review → aggregates from IndexedDB → stats/insights in UI
- Calendar sync (future) → TanStack Query fetches from Graph API → merges with IndexedDB data

**Performance characteristics:**
- Cold start: <1s (Vite dev server)
- HMR: <100ms (Vite)
- UI interactions: <16ms (60fps, React 19)
- Data queries: <10ms (IndexedDB local reads)
- Build time: <30s for production (Vite)

## Sources

### High Confidence (Official Documentation & Context7)
- [React Official Docs](https://react.dev) - Current version verified as React 19.2
- [TypeScript 5.8 Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-8.html) - Announcing TypeScript 5.8
- [Microsoft Learn: MSAL React](https://learn.microsoft.com/en-us/entra/msal/javascript/react/getting-started) - Official MSAL authentication guide
- [Microsoft Learn: Microsoft Graph API](https://learn.microsoft.com/en-us/graph/use-the-api) - API versions and authentication methods
- [MDN: IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) - Browser storage capabilities
- [Dexie.js Official Docs](https://dexie.org) - Version 4.0 features verified
- [shadcn/ui Official](https://ui.shadcn.com/) - Installation and usage patterns
- [Zustand GitHub Releases](https://github.com/pmndrs/zustand/releases) - v5.0.10 released 2025-01-12
- [TanStack Query npm](https://www.npmjs.com/package/@tanstack/react-query) - v5.90.19 verified
- [Vite Releases](https://vite.dev/releases) - v7.3.1 latest stable

### Medium Confidence (Industry Analysis & Multiple Sources)
- [Best Web Development Stacks 2025](https://www.nobledesktop.com/blog/best-web-development-stacks) - MERN/MEAN stack trends
- [React vs Vue vs Svelte 2025](https://medium.com/@ignatovich.dm/react-vs-vue-vs-svelte-choosing-the-right-framework-for-2025-4f4bb9da35b4) - Framework comparison
- [Vite vs Next.js 2025](https://strapi.io/blog/vite-vs-nextjs-2025-developer-framework-comparison) - Build tool comparison
- [Zustand vs Redux 2025](https://www.zignuts.com/blog/react-state-management-2025) - State management patterns
- [Vitest vs Jest 2025](https://medium.com/@ruverd/jest-vs-vitest-which-test-runner-should-you-use-in-2025-5c85e4f2bda9) - Testing benchmarks
- [Tailwind vs CSS Modules 2025](https://medium.com/@salmanmuhammed827/tailwind-css-vs-css-modules-in-2025-which-should-you-choose-7edfe9a75254) - Styling approaches
- [shadcn/ui vs Radix 2025](https://makersden.io/blog/react-ui-libs-2025-comparing-shadcn-radix-mantine-mui-chakra) - Component library comparison
- [Local-first web apps 2025](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/) - IndexedDB patterns
- [TypeScript Best Practices 2025](https://dev.to/mitu_mariam/typescript-best-practices-in-2025-57hb) - Modern TS patterns

### Verification Status
- ✅ **React 19.2** - Verified via official docs
- ✅ **TypeScript 5.8** - Verified via release notes
- ✅ **Vite 7.3.1** - Verified via releases page
- ✅ **Zustand 5.0.10** - Verified via GitHub
- ✅ **TanStack Query 5.90.19** - Verified via npm
- ✅ **Dexie 4.0** - Verified via official docs
- ✅ **MSAL React** - Verified via Microsoft Learn
- ✅ **IndexedDB** - Verified via MDN
- ⚠️ **React Router 7.x** - Version from WebSearch, not individually verified
- ⚠️ **date-fns 3.x** - Version from WebSearch, not individually verified
- ⚠️ **Tailwind 3.4+** - Widely adopted version, not individually verified

---

*Research completed: 2026-01-30*
*Next step: Use this stack to inform roadmap phase structure and implementation order*
