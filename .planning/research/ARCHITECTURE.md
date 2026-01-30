# Architecture Research

**Domain:** GTD/Productivity Web Application
**Researched:** 2026-01-30
**Confidence:** MEDIUM

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  Inbox   │  │ Projects │  │ Contexts │  │  Review  │    │
│  │   View   │  │   View   │  │   View   │  │   View   │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│       │             │             │             │           │
├───────┴─────────────┴─────────────┴─────────────┴───────────┤
│                    STATE MANAGEMENT                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Local State  │  │ Server Cache │  │ Sync Engine  │      │
│  │ (UI/Forms)   │  │(React Query) │  │  (Optional)  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │              │
├─────────┴─────────────────┴─────────────────┴───────────────┤
│                    PERSISTENCE LAYER                         │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐   │
│  │           IndexedDB (Local Storage)                   │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │   │
│  │  │  Items   │  │ Projects │  │ Contexts/Config  │   │   │
│  │  └──────────┘  └──────────┘  └──────────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│              INTEGRATION LAYER (Future)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │        Microsoft Graph API Connector                  │   │
│  │  (Calendar/Teams Sync - Two-way via Delta Query)     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Inbox View** | Capture and process new items; Zero-inbox UI | React component with form inputs, drag-drop for processing |
| **Projects View** | Display multi-step projects with next actions | Nested list component, expandable project details |
| **Contexts View** | Filter next actions by context (@home, @computer, etc.) | Tab/filter UI, grouped action lists |
| **Review View** | Weekly review workflow guide | Multi-step wizard showing projects, waiting-for, someday/maybe |
| **Local State** | Ephemeral UI state (form values, modal visibility) | useState/useReducer for component-level state |
| **Server Cache** | API response caching and invalidation | React Query/TanStack Query for future calendar sync |
| **Sync Engine** | Handle bidirectional sync with Microsoft Graph | Delta query tracking, conflict resolution, offline queue |
| **IndexedDB Store** | Persistent local storage for all GTD data | Dexie.js wrapper for structured storage with indexes |
| **Graph Connector** | Microsoft 365 integration adapter | REST client with delta sync, webhook subscriptions |

## Recommended Project Structure

```
src/
├── features/               # Feature-based organization (2026 best practice)
│   ├── inbox/              # Inbox capture and processing
│   │   ├── InboxView.tsx   # Main inbox view component
│   │   ├── InboxItem.tsx   # Individual inbox item
│   │   ├── CaptureForm.tsx # Quick capture input
│   │   └── useInbox.ts     # Inbox-specific hooks
│   ├── projects/           # Projects and next actions
│   │   ├── ProjectsView.tsx
│   │   ├── ProjectDetail.tsx
│   │   ├── NextActionsList.tsx
│   │   └── useProjects.ts
│   ├── contexts/           # Context-based filtering
│   │   ├── ContextsView.tsx
│   │   ├── ContextFilter.tsx
│   │   └── useContexts.ts
│   ├── review/             # Weekly review workflow
│   │   ├── ReviewWizard.tsx
│   │   ├── ReviewSteps.tsx
│   │   └── useReview.ts
│   ├── waiting/            # Waiting-for tracking
│   │   ├── WaitingView.tsx
│   │   └── useWaiting.ts
│   └── someday/            # Someday/maybe list
│       ├── SomedayView.tsx
│       └── useSomeday.ts
├── shared/                 # Shared/common components only
│   ├── ui/                 # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   └── DragDropList.tsx
│   ├── form/               # Form controls
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── DatePicker.tsx
│   │   └── ContextSelector.tsx
│   └── layout/             # Layout components
│       ├── MainLayout.tsx
│       ├── Sidebar.tsx
│       └── Header.tsx
├── services/               # External service integrations
│   ├── db/                 # Database service
│   │   ├── schema.ts       # IndexedDB schema definitions
│   │   ├── migrations.ts   # Schema migrations
│   │   └── client.ts       # Dexie.js client instance
│   ├── graph/              # Microsoft Graph integration (future)
│   │   ├── auth.ts         # OAuth authentication
│   │   ├── calendar.ts     # Calendar API wrapper
│   │   ├── delta-sync.ts   # Delta query handler
│   │   └── webhooks.ts     # Change notification handler
│   └── storage/            # Storage abstractions
│       ├── local.ts        # IndexedDB operations
│       └── sync.ts         # Sync coordination logic
├── hooks/                  # Global reusable hooks only
│   ├── useLocalStorage.ts  # Browser storage hook
│   ├── useOfflineStatus.ts # Network status detection
│   └── useKeyboardShortcuts.ts # Global shortcuts
├── store/                  # Global state management
│   ├── settingsStore.ts    # User preferences (Zustand)
│   └── uiStore.ts          # Global UI state
├── utils/                  # Utility functions
│   ├── date.ts             # Date formatting helpers
│   ├── gtd.ts              # GTD-specific logic (next action extraction)
│   └── validation.ts       # Input validation
├── types/                  # TypeScript type definitions
│   ├── gtd.ts              # Core GTD domain types
│   ├── graph.ts            # Microsoft Graph types
│   └── ui.ts               # UI-specific types
└── App.tsx                 # Root application component
```

### Structure Rationale

- **features/:** Groups all code for a feature together (component, hooks, tests). Follows 2026 best practice of feature-based organization over type-based. Each feature is self-contained, making it easy to understand and modify independently.

- **shared/:** Contains only truly shared/reusable components used across multiple features. Avoids premature abstraction — components stay in features/ until actually reused.

- **services/:** External dependencies and integrations isolated in one place. Database schema, Graph API client, and sync logic kept separate from UI concerns.

- **Colocation principle:** Tests live next to components (InboxView.test.tsx), feature-specific hooks stay in feature folders, only shared hooks in hooks/.

- **TypeScript-first:** All files use .ts/.tsx extensions, with comprehensive type definitions in types/ folder for domain modeling and API contracts.

## Architectural Patterns

### Pattern 1: Feature-Slice Architecture

**What:** Organize code by user-facing features rather than technical layers. Each feature contains its views, hooks, and business logic together.

**When to use:** Building apps with distinct user workflows (perfect for GTD: inbox processing, weekly review, context filtering are separate workflows).

**Trade-offs:**
- **Pro:** Easy to understand what code belongs to which feature, team can work on features independently
- **Pro:** Reduces cognitive load — all related code is colocated
- **Con:** May lead to some duplication across features (acceptable trade-off)
- **Con:** Requires discipline to avoid tight coupling between features

**Example:**
```typescript
// features/inbox/InboxView.tsx
import { useInbox } from './useInbox'; // Feature-specific hook
import { InboxItem } from './InboxItem'; // Feature-specific component

export function InboxView() {
  const { items, processItem, clearInbox } = useInbox();

  return (
    <div className="inbox">
      <h1>Inbox ({items.length})</h1>
      {items.map(item => (
        <InboxItem
          key={item.id}
          item={item}
          onProcess={processItem}
        />
      ))}
    </div>
  );
}
```

### Pattern 2: Offline-First with IndexedDB

**What:** Store all GTD data locally in IndexedDB as the primary data store. Treat network connectivity as an enhancement for future calendar sync, not a requirement.

**When to use:** Building browser-based productivity apps where instant response is critical and users need access without internet.

**Trade-offs:**
- **Pro:** Near-instant UI updates (no network latency), works fully offline
- **Pro:** Multi-tab synchronization (IndexedDB shared across tabs)
- **Con:** Browser storage limits (~50MB-10GB depending on browser)
- **Con:** Data persistence not guaranteed (browsers may evict data, especially Safari after ~7 days of inactivity)
- **Mitigation:** Implement export/backup functionality, warn users about browser storage limits

**Example:**
```typescript
// services/db/client.ts using Dexie.js
import Dexie, { Table } from 'dexie';
import { GtdItem, Project, Context } from '@/types/gtd';

class GtdDatabase extends Dexie {
  items!: Table<GtdItem>;
  projects!: Table<Project>;
  contexts!: Table<Context>;

  constructor() {
    super('GTDDatabase');
    this.version(1).stores({
      items: '++id, type, projectId, contextId, status, createdAt',
      projects: '++id, name, status, createdAt',
      contexts: '++id, name, type'
    });
  }
}

export const db = new GtdDatabase();
```

### Pattern 3: Hybrid State Management

**What:** Use different state management tools for different types of state:
- **Local component state** (useState/useReducer) for ephemeral UI state
- **React Query** for server data caching (future calendar sync)
- **Zustand** for lightweight global app state (settings, UI preferences)

**When to use:** Modern SPAs with mix of local and server data. Avoids "one size fits all" state management complexity.

**Trade-offs:**
- **Pro:** Each tool optimized for its use case, less boilerplate than Redux
- **Pro:** Simpler to reason about — clear separation of concerns
- **Con:** Team needs to learn multiple libraries (small learning curve)
- **Con:** Three different patterns to maintain

**Example:**
```typescript
// store/settingsStore.ts (Zustand for global settings)
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsStore {
  defaultContext: string | null;
  weeklyReviewDay: number; // 0-6 for Sunday-Saturday
  setDefaultContext: (context: string) => void;
  setWeeklyReviewDay: (day: number) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      defaultContext: null,
      weeklyReviewDay: 5, // Friday
      setDefaultContext: (context) => set({ defaultContext: context }),
      setWeeklyReviewDay: (day) => set({ weeklyReviewDay: day })
    }),
    { name: 'gtd-settings' }
  )
);

// features/inbox/useInbox.ts (Local state for feature)
import { useState } from 'react';
import { db } from '@/services/db/client';

export function useInbox() {
  const [items, setItems] = useState<GtdItem[]>([]);

  const loadInbox = async () => {
    const inbox = await db.items.where('type').equals('inbox').toArray();
    setItems(inbox);
  };

  const processItem = async (id: number, action: 'project' | 'action' | 'trash') => {
    // Processing logic
  };

  return { items, loadInbox, processItem };
}
```

### Pattern 4: Delta Query Sync (Future)

**What:** For Microsoft Graph integration, use delta queries to track changes since last sync rather than fetching entire calendar each time. Maintains local change tracking to detect conflicts.

**When to use:** Bidirectional sync with external APIs that support delta/incremental sync patterns (Microsoft Graph supports this).

**Trade-offs:**
- **Pro:** Minimizes API calls and bandwidth, respects rate limits
- **Pro:** Enables efficient bidirectional sync
- **Con:** Complex to implement correctly (conflict resolution, sync loops)
- **Con:** Requires persistent sync state (last sync token, change tracking)

**Example:**
```typescript
// services/graph/delta-sync.ts
interface SyncState {
  lastDeltaToken: string | null;
  lastSyncTime: Date;
}

export class CalendarSyncEngine {
  private syncState: SyncState;

  async syncCalendar() {
    if (this.syncState.lastDeltaToken) {
      // Incremental sync
      const changes = await this.getDeltaChanges(this.syncState.lastDeltaToken);
      await this.applyChanges(changes);
    } else {
      // Full sync (first time)
      const events = await this.getAllEvents();
      await this.importEvents(events);
    }
  }

  private async getDeltaChanges(deltaToken: string) {
    // Call Microsoft Graph delta endpoint
    // GET /me/calendar/events/delta?deltaToken={token}
  }

  private async applyChanges(changes: CalendarChange[]) {
    for (const change of changes) {
      // Conflict detection: check if local item modified since last sync
      const localItem = await db.items.get(change.localId);
      if (localItem.modifiedAt > this.syncState.lastSyncTime) {
        // Conflict! Need resolution strategy
        await this.resolveConflict(localItem, change);
      } else {
        // No conflict, apply remote change
        await db.items.update(change.localId, change.data);
      }
    }
  }
}
```

## Data Flow

### Request Flow (Current: Offline-First)

```
[User Action: Add Inbox Item]
    ↓
[InboxView Component] → [useInbox Hook] → [db.items.add()]
    ↓                                           ↓
[Optimistic Update]  ←─────────────────  [IndexedDB Write]
    ↓
[UI Re-renders with New Item]
```

### Future: Bidirectional Calendar Sync Flow

```
[Local GTD Item Created]
    ↓
[IndexedDB] → [Sync Queue] → [Graph API: Create Event]
    ↓               ↓                    ↓
[Mark as Synced] ← [Track Change] ← [Receive Event ID]

[Remote Calendar Updated]
    ↓
[Graph Webhook] → [Delta Sync] → [Conflict Check] → [IndexedDB Update]
    ↓
[React Query Invalidation] → [UI Re-renders]
```

### State Management Flow

```
┌─────────────────────────────────────────────────────────┐
│                   Component Tree                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │  Inbox   │  │ Projects │  │ Settings │               │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘               │
└───────┼─────────────┼─────────────┼───────────────────────┘
        │             │             │
        ↓             ↓             ↓
┌───────────────┐ ┌──────────────┐ ┌──────────────────────┐
│ Local State   │ │ IndexedDB    │ │ Zustand Store        │
│ (ephemeral)   │ │ (persistent) │ │ (global settings)    │
└───────────────┘ └──────────────┘ └──────────────────────┘
```

### Key Data Flows

1. **Inbox Processing Flow:** User captures item → Stored in IndexedDB with type='inbox' → User processes during daily review → Item converted to next action/project/reference/trash → IndexedDB updated with new type and metadata

2. **Next Action Selection Flow:** User selects context filter (@computer) → Query IndexedDB for items with matching context and status='next_action' → Display filtered list ordered by priority → User marks action complete → Update IndexedDB status → Re-query and refresh UI

3. **Weekly Review Flow:** User starts review wizard → System queries all projects → For each project, check if has at least one next action → Display projects missing next actions → User adds next actions or marks project as someday/complete → Update IndexedDB → Move to next review step (waiting-for, someday/maybe, etc.)

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| **0-1k items** | Single IndexedDB database, no optimization needed. Simple date-based filtering and in-memory sorting sufficient. |
| **1k-10k items** | Add indexes on commonly queried fields (projectId, contextId, status, createdAt). Implement virtual scrolling for long lists. Consider archiving completed items older than 6 months. |
| **10k+ items** | Implement full-text search with dedicated search index. Add lazy loading and pagination. Consider splitting into multiple databases (active items vs. archive). Background worker for search indexing. |

### Scaling Priorities

1. **First bottleneck: List rendering performance**
   - **Symptom:** UI becomes sluggish when displaying large next action lists
   - **Solution:** Implement virtual scrolling (react-window or react-virtual) to render only visible items. Limit default query results to 50-100 items with "load more" pattern.

2. **Second bottleneck: Search and filtering speed**
   - **Symptom:** Filtering by context or searching items takes >100ms
   - **Solution:** Add compound indexes in IndexedDB (e.g., [status+contextId] for filtering next actions by context). For full-text search, use dedicated search library like Fuse.js or MiniSearch on indexed data.

3. **Third bottleneck: Microsoft Graph API rate limits (future)**
   - **Symptom:** Sync failures due to hitting 10k requests/10 minutes limit
   - **Solution:** Implement exponential backoff, batch operations where possible, and use delta queries exclusively (never full sync after initial). Queue local changes and sync in batches rather than real-time.

**Note:** For single-user GTD app, hitting 10k items is rare (typical user has 50-500 active items). Optimize when needed, not prematurely.

## Anti-Patterns

### Anti-Pattern 1: Global State for Everything

**What people do:** Put all GTD data (inbox items, projects, contexts) into Redux/Zustand global store and update on every change.

**Why it's wrong:**
- IndexedDB already acts as shared storage across tabs
- Forces entire component tree to re-render on any data change
- Creates tight coupling between all components
- Duplicates data (IndexedDB + in-memory store)

**Do this instead:**
- Use IndexedDB as single source of truth
- Query data directly in components via hooks (useInbox, useProjects)
- Use React Query for caching if needed (future server sync)
- Reserve Zustand only for true global UI state (theme, sidebar visibility, user preferences)

### Anti-Pattern 2: Premature Componentization

**What people do:** Create shared/ui/InboxListItem.tsx before InboxListItem is used anywhere except Inbox feature.

**Why it's wrong:**
- Creates artificial separation between related code
- Makes changes harder (must navigate between features/ and shared/)
- Leads to overly generic components trying to handle all use cases
- Violates colocation principle

**Do this instead:**
- Keep components in their feature folder until actually used in 2+ features
- When extracting to shared/, only extract what's truly reusable
- Prefer feature-specific variants over complex configurable shared components
- Example: `features/inbox/InboxItem.tsx` stays local until Projects needs similar item display

### Anti-Pattern 3: Synchronous IndexedDB Operations

**What people do:** Use IndexedDB synchronously or blocking the UI thread while waiting for database operations.

**Why it's wrong:**
- IndexedDB is inherently asynchronous
- Blocking operations freeze the UI
- Browsers don't support synchronous IndexedDB access
- Degrades user experience

**Do this instead:**
```typescript
// ❌ WRONG: Trying to use IndexedDB synchronously
function addItem(item: GtdItem) {
  db.items.add(item); // Returns a Promise, not the result
  const items = db.items.toArray(); // Won't work as expected
  return items;
}

// ✅ CORRECT: Async/await pattern
async function addItem(item: GtdItem) {
  await db.items.add(item);
  const items = await db.items.toArray();
  return items;
}

// ✅ BETTER: Optimistic UI updates
function useInboxMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (item: GtdItem) => db.items.add(item),
    onMutate: async (newItem) => {
      // Optimistic update: show in UI immediately
      await queryClient.cancelQueries({ queryKey: ['inbox'] });
      const previous = queryClient.getQueryData(['inbox']);
      queryClient.setQueryData(['inbox'], (old) => [...old, newItem]);
      return { previous };
    },
    onError: (err, newItem, context) => {
      // Rollback on error
      queryClient.setQueryData(['inbox'], context.previous);
    }
  });
}
```

### Anti-Pattern 4: Ignoring Offline/Online State

**What people do:** Assume network is always available when building Microsoft Graph integration. Attempt sync operations without checking connectivity.

**Why it's wrong:**
- Browser-based apps run in unreliable network conditions
- Failed API calls without retry logic lose user data
- Confusing error states when offline
- GTD app should work offline (core workflow doesn't need network)

**Do this instead:**
```typescript
// Track online/offline status
function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// Queue sync operations when offline
class SyncQueue {
  private queue: SyncOperation[] = [];

  async enqueue(operation: SyncOperation) {
    await db.syncQueue.add(operation);
    if (navigator.onLine) {
      this.processPendingQueue();
    }
  }

  async processPendingQueue() {
    const pending = await db.syncQueue.toArray();
    for (const op of pending) {
      try {
        await this.executeSync(op);
        await db.syncQueue.delete(op.id);
      } catch (error) {
        // Keep in queue, retry later
        console.error('Sync failed, will retry', error);
      }
    }
  }
}

// Resume sync when back online
window.addEventListener('online', () => {
  syncQueue.processPendingQueue();
});
```

### Anti-Pattern 5: Building Custom GTD Logic Instead of Modeling the Methodology

**What people do:** Create custom task organization that doesn't follow GTD principles (mixing contexts with projects, unclear next actions, no inbox zero workflow).

**Why it's wrong:**
- User expects GTD app to follow David Allen's methodology
- Confuses users new to GTD (project says it's GTD but behaves differently)
- Makes weekly review workflow unclear
- Defeats purpose of GTD system

**Do this instead:**
- Model data exactly as GTD defines:
  - **Inbox:** Unprocessed items only (everything starts here)
  - **Next Actions:** Single, physical, visible actions organized by context
  - **Projects:** Any outcome requiring 2+ actions (broad definition)
  - **Waiting For:** Delegated items you're tracking
  - **Someday/Maybe:** Ideas to revisit later
- Enforce GTD rules in code:
  - Every project MUST have at least one next action (or be someday/complete)
  - Next actions must have a context
  - Inbox items must be processed (can't stay in inbox indefinitely)
- Guide user through GTD workflow (weekly review checklist, inbox processing flow)

```typescript
// Model GTD concepts explicitly
type GtdItemType =
  | 'inbox'          // Unprocessed
  | 'next_action'    // Single action with context
  | 'project'        // Multi-step outcome
  | 'waiting'        // Delegated, tracking response
  | 'someday'        // Deferred ideas
  | 'reference';     // Stored information

interface GtdItem {
  id: number;
  type: GtdItemType;
  title: string;
  description?: string;

  // Context required for next_actions
  contextId?: number;  // @computer, @home, @phone, etc.

  // Project association
  projectId?: number;  // Links next_actions to projects

  // Waiting for tracking
  waitingFor?: string; // Person/entity we're waiting on

  status: 'active' | 'completed' | 'archived';
  createdAt: Date;
  completedAt?: Date;
}

// Enforce GTD rules
async function validateProject(projectId: number): Promise<boolean> {
  const nextActions = await db.items
    .where({ projectId, type: 'next_action', status: 'active' })
    .count();

  if (nextActions === 0) {
    throw new Error('Every project must have at least one next action');
  }

  return true;
}
```

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **Microsoft Graph API** | OAuth 2.0 + REST + Delta Query | Use MSAL.js for authentication, delta queries for incremental sync. Rate limit: 10k requests/10 min. |
| **Outlook Calendar** | Graph Calendar API v1.0 | Bidirectional sync: GTD next actions with due dates ↔ Calendar events. Webhook subscriptions for real-time updates. |
| **Teams Calendar** | Same Graph Calendar API | Teams uses same calendar store as Outlook, no separate integration needed. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **Presentation ↔ Services** | Direct function calls (async) | Components import from services/, call async functions, handle promises with async/await |
| **Features ↔ Shared UI** | React props and composition | Shared components expose clean prop interfaces, features compose them into feature-specific UIs |
| **DB Service ↔ IndexedDB** | Dexie.js abstraction layer | Never access IndexedDB directly, always through Dexie client. Enables future migration to different storage. |
| **Sync Engine ↔ Graph API** | REST client (axios/fetch) | Separate sync logic from API client. API client handles auth/requests, sync engine handles delta tracking/conflicts. |

## Build Order Implications

Based on component dependencies and GTD methodology, recommended build sequence:

### Phase 1: Core Data Layer
1. IndexedDB schema and Dexie setup
2. Type definitions for GTD domain model
3. Basic CRUD operations for items

**Why first:** Foundation for everything else. Can't build UI without data persistence.

### Phase 2: Inbox Capture & Processing
1. Inbox view component
2. Quick capture form
3. Processing workflow (is it actionable? what's the next action?)

**Why second:** GTD starts with inbox. Users need somewhere to capture items before organizing them.

### Phase 3: Next Actions & Contexts
1. Contexts management (create/edit @contexts)
2. Next actions list with context filtering
3. Mark actions complete

**Why third:** Once items are processed, they become next actions. This is the "doing" part of GTD.

### Phase 4: Projects
1. Projects list view
2. Project creation and next action association
3. Validation: every project has ≥1 next action

**Why fourth:** Projects organize next actions. Build after next actions exist, so you can link them.

### Phase 5: Waiting For & Someday/Maybe
1. Waiting-for list with delegation tracking
2. Someday/maybe list with periodic review prompts

**Why fifth:** Supporting lists for complete GTD system. Less critical than core capture/action workflow.

### Phase 6: Weekly Review
1. Review wizard UI
2. Project review checklist
3. Waiting-for review
4. Someday/maybe review

**Why sixth:** Review requires all other components to exist. Guides user through reviewing projects, next actions, waiting, someday.

### Phase 7+: Microsoft Graph Integration
1. OAuth authentication flow
2. Read-only calendar viewing
3. One-way sync (GTD → Calendar)
4. Two-way sync with conflict resolution
5. Webhook subscriptions for real-time updates

**Why last:** Complex, depends on stable core system. Can't sync to calendar until next actions with due dates are working. Each sub-phase builds on previous.

**Critical path:** Phase 1 → 2 → 3 are mandatory for usable GTD app. Phases 4-6 complete the methodology. Phase 7 adds enterprise integration.

## Sources

**GTD Methodology & Implementation:**
- [Top GTD apps for Getting Things Done in 2026](https://www.onepagecrm.com/blog/gtd-business-software-to-stay-organized/)
- [9 Best GTD Apps & Software for Getting Things Done in 2026](https://clickup.com/blog/gtd-apps/)
- [Getting Things Done - Wikipedia](https://en.wikipedia.org/wiki/Getting_Things_Done)
- [GTD in 15 minutes – A Pragmatic Guide to Getting Things Done](https://hamberg.no/gtd)

**Web Application Architecture Patterns:**
- [Modern Web Application Architecture in 2026: A Practical Guide](https://quokkalabs.com/blog/modern-web-application-architecture/)
- [5+ software architecture patterns you should know in 2026](https://www.sayonetech.com/blog/software-architecture-patterns/)
- [Frontend Design Patterns That Actually Work in 2026](https://www.netguru.com/blog/frontend-design-patterns)

**Task Management App Architecture:**
- [Chapter 2 — High-Level Design: Architecting the Task Management System](https://medium.com/@natarajanck2/chapter-2-high-level-design-architecting-the-task-management-system-1f82a489ecab)
- [How to Build a Task Management App [2026 Guide]](https://www.freshcodeit.com/blog/how-to-create-task-management-app-mvp)
- [Building a Task Management App from Scratch Part 1 — Choosing the Tech Stack](https://gabrielgomes61320.medium.com/building-a-task-management-app-from-scratch-part-1-choosing-the-tech-stack-24a03670c667)

**Frontend Architecture Best Practices:**
- [Modern Front End Development: Complete 2025 Guide](https://devcrew.io/modern-front-end-development-guide/)
- [Frontend Architectures: A Complete Guide for 2025](https://blog.gauravdalvi.com/frontend-architectures-a-complete-guide-for-2025)
- [Frontend Architecture 2025: Structure Large Apps](https://www.frontendtools.tech/blog/frontend-architecture-structure-large-scale-web-apps)

**React Component Architecture:**
- [React Folder Structure in 5 Steps [2025]](https://www.robinwieruch.de/react-folder-structure/)
- [Popular React Folder Structures and Screaming Architecture](https://profy.dev/article/react-folder-structure)
- [React Architecture Patterns and Best Practices for 2026](https://www.bacancytechnology.com/blog/react-architecture-patterns-and-best-practices)

**State Management:**
- [State Management in Vanilla JS: 2026 Trends](https://medium.com/@chirag.dave/state-management-in-vanilla-js-2026-trends-f9baed7599de)
- [State Management in 2026: Redux, Context API, and Modern Patterns](https://www.nucamp.co/blog/state-management-in-2026-redux-context-api-and-modern-patterns)

**Offline-First Architecture:**
- [Offline-first frontend apps in 2025: IndexedDB and SQLite in the browser](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/)
- [Local First / Offline First | RxDB](https://rxdb.info/offline-first.html)
- [Dexie.js - Build Offline-First Apps with IndexedDB Made Simple](https://dexie.org/)

**Microsoft Graph Integration:**
- [Outlook calendar API overview - Microsoft Graph](https://learn.microsoft.com/en-us/graph/outlook-calendar-concept-overview)
- [Common integration patterns with Microsoft Graph](https://learn.microsoft.com/en-us/graph/integration-patterns-overview)
- [Get incremental changes to events in a calendar view - Microsoft Graph](https://learn.microsoft.com/en-us/graph/delta-query-events)
- [Implement Bidirectional Calendar Sync - Developer Guide 2025](https://calendhub.com/blog/implement-bidirectional-calendar-sync-2025/)

---
*Architecture research for: GTD Productivity Web Application*
*Researched: 2026-01-30*
