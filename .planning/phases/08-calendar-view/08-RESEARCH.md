# Phase 8: Calendar View - Research

**Researched:** 2026-01-30
**Domain:** Calendar UI implementation with Svelte
**Confidence:** HIGH

## Summary

Calendar view implementation requires a specialized calendar component library that supports day/week/month views, drag-and-drop event manipulation, and ICS file parsing. The standard stack for Svelte applications uses **@event-calendar/core** (EventCalendar) or **@schedule-x/svelte**, both offering Google Calendar-style time-block rendering with built-in drag support. For ICS parsing, **ical.js** is the authoritative standard (RFC 5545 compliant), while **rrule.js** handles recurrence patterns. The GTD project already uses Dexie 4.x for IndexedDB, which extends naturally to store calendar events alongside GTD data.

The architecture follows a separation of concerns: calendar events stored in IndexedDB, visual rendering handled by the calendar component library, and ICS import/export managed by dedicated parsing libraries. Critical considerations include timezone handling (use ical.js's built-in VTIMEZONE support), recurrence expansion (delegate to rrule.js), and event-GTD integration (foreign key to projects table).

**Primary recommendation:** Use @event-calendar/core (EventCalendar) with ical.js for parsing and rrule.js for recurrence, extending the existing Dexie schema with an events table.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @event-calendar/core | 5.x | Calendar UI with drag/drop | 35KB, zero dependencies, 70k+ websites, Svelte 5 support, Google Calendar-style time blocks |
| ical.js | 2.2.1+ | ICS file parsing | Mozilla-maintained, RFC 5545/7265 compliant, handles timezones/recurrence natively |
| rrule.js | latest | Recurrence rule handling | iCalendar RFC standard, natural language parsing, TypeScript support |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| chrono-node | 2.9.0+ | Natural language date parsing | Optional for quick-add form if implementing NLP input |
| @schedule-x/svelte | 3.0.0+ | Alternative calendar component | If you prefer Schedule-X's API over EventCalendar |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @event-calendar/core | @schedule-x/svelte | Schedule-X has more modern branding but requires Preact signals as dependency (adds weight) |
| @event-calendar/core | FullCalendar with svelte-fullcalendar wrapper | FullCalendar's commercial license required for advanced features ($480+), heavier bundle |
| rrule.js | simple-rrule | simple-rrule is lighter but incomplete RFC implementation, lacks natural language parsing |

**Installation:**
```bash
npm install @event-calendar/core @event-calendar/day-grid @event-calendar/time-grid @event-calendar/interaction ical.js rrule
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── db/
│   │   ├── schema.ts           # Add Event interface and events table
│   │   └── operations.ts       # Add event CRUD operations
│   ├── stores/
│   │   └── calendar.svelte.ts  # Calendar state management (Svelte 5 runes)
│   └── utils/
│       ├── ics-parser.ts       # ical.js wrapper for import/export
│       └── recurrence.ts       # rrule.js wrapper for expanding recurrences
└── routes/
    └── calendar/
        ├── +page.svelte        # Calendar view container
        ├── EventCalendar.svelte # EventCalendar component wrapper
        ├── EventForm.svelte    # Create/edit event form
        ├── QuickAdd.svelte     # Quick-add input (optional)
        └── SidePanel.svelte    # Next actions side panel
```

### Pattern 1: Event Data Model
**What:** Separate base events from recurrence instances
**When to use:** Always - prevents data duplication and simplifies recurrence editing

```typescript
// Source: Dexie EntityTable pattern + Martin Fowler recurring events pattern
export interface CalendarEvent {
  id: number;
  title: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  notes?: string;
  color?: string;           // User-assigned color or source color
  projectId?: number;       // Optional link to GTD project
  source?: string;          // e.g., "manual", "imported-work", "imported-personal"

  // Recurrence fields
  rrule?: string;           // RRULE string (RFC 5545)
  recurrenceId?: number;    // If this is an exception, parent event ID
  exceptionDates?: Date[];  // EXDATE: dates to exclude from recurrence

  created: Date;
  modified: Date;
}

// Dexie schema
db.version(6).stores({
  // ... existing tables ...
  events: "++id, startTime, endTime, projectId, source, recurrenceId, *exceptionDates"
});
```

### Pattern 2: Calendar Component Integration
**What:** Wrap EventCalendar with reactive state from Svelte 5 runes
**When to use:** Always - provides reactive updates when events change

```typescript
// Source: @event-calendar/core Svelte 5 documentation
import { Calendar } from '@event-calendar/core';
import TimeGrid from '@event-calendar/time-grid';
import DayGrid from '@event-calendar/day-grid';
import Interaction from '@event-calendar/interaction';

let calendarEvents = $state<CalendarEvent[]>([]);
let currentView = $state<'day' | 'week' | 'month'>('day');

// EventCalendar expects specific event format
const ecEvents = $derived(calendarEvents.map(e => ({
  id: e.id,
  title: e.title,
  start: e.startTime,
  end: e.endTime,
  backgroundColor: e.color,
  editable: true  // Enable drag/drop
})));

const plugins = [TimeGrid, DayGrid, Interaction];
const options = {
  view: currentView,
  events: ecEvents,
  eventDrop: handleEventDrop,
  eventResize: handleEventResize,
  eventClick: handleEventClick,
  dateClick: handleDateClick
};
```

### Pattern 3: ICS Import
**What:** Parse ICS files with ical.js, handle VTIMEZONE and RRULE, store events
**When to use:** File upload input or drag-and-drop ICS import

```typescript
// Source: ical.js documentation
import ICAL from 'ical.js';
import { RRule } from 'rrule';

async function importICSFile(fileContent: string) {
  const jcalData = ICAL.parse(fileContent);
  const comp = new ICAL.Component(jcalData);
  const vevents = comp.getAllSubcomponents('vevent');

  const events: Omit<CalendarEvent, 'id'>[] = [];

  for (const vevent of vevents) {
    const event = new ICAL.Event(vevent);
    const rrule = vevent.getFirstPropertyValue('rrule');

    events.push({
      title: event.summary,
      startTime: event.startDate.toJSDate(),
      endTime: event.endDate.toJSDate(),
      location: event.location || undefined,
      notes: event.description || undefined,
      rrule: rrule ? rrule.toString() : undefined,
      source: 'imported',
      created: new Date(),
      modified: new Date()
    });
  }

  await db.events.bulkAdd(events as CalendarEvent[]);
}
```

### Pattern 4: Recurrence Expansion
**What:** Expand RRULE to actual event instances for calendar display
**When to use:** Loading events for calendar view date range

```typescript
// Source: rrule.js documentation
import { RRule, RRuleSet } from 'rrule';

function expandRecurrence(
  event: CalendarEvent,
  startDate: Date,
  endDate: Date
): CalendarEvent[] {
  if (!event.rrule) return [event];

  const rule = RRule.fromString(event.rrule);
  const occurrences = rule.between(startDate, endDate, true);

  // Filter out exception dates
  const filtered = occurrences.filter(date =>
    !event.exceptionDates?.some(ex =>
      ex.getTime() === date.getTime()
    )
  );

  // Create instances
  return filtered.map((date, idx) => ({
    ...event,
    id: event.id * 1000 + idx, // Pseudo-ID for instances
    startTime: date,
    endTime: new Date(date.getTime() + (event.endTime.getTime() - event.startTime.getTime()))
  }));
}
```

### Pattern 5: Side Panel Integration
**What:** Show GTD next actions alongside calendar for planning context
**When to use:** Default calendar layout - provides "hard landscape + available actions" view

```typescript
// Side panel filters actions by:
// 1. Today's date context (if day view)
// 2. Optionally filter by project if event is project-linked
// 3. Show available time slots between events

const nextActionsForContext = $derived(() => {
  const today = new Date();
  const todayEvents = calendarEvents.filter(e =>
    isSameDay(e.startTime, today)
  );

  // Calculate free time blocks
  const freeBlocks = calculateFreeTime(todayEvents, today);

  // Get relevant next actions
  return db.items
    .where('type').equals('next-action')
    .filter(action => !action.completedAt)
    .toArray();
});
```

### Anti-Patterns to Avoid
- **Custom recurrence logic:** Don't write your own RRULE parser or expander - delegate to rrule.js
- **Storing expanded instances:** Don't store each recurrence instance as separate DB row - store base event + RRULE, expand on-demand
- **Ignoring timezones:** Don't use naive Date objects - use ical.js's timezone-aware components for imported events
- **Inline event editing:** Don't edit events directly in calendar props - use modal/form for data validation and GTD integration

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ICS file parsing | Custom RFC 5545 parser | ical.js | Timezones, VTIMEZONE definitions, VEVENT properties, RRULE syntax - all RFC-compliant |
| Recurrence patterns | String parsing + date math | rrule.js | DST handling, exception dates, complex patterns (e.g., "2nd Tuesday of month") |
| Natural language dates | Regex date parser | chrono-node | Ambiguity resolution, locale support, relative dates ("next Friday") |
| Calendar grid rendering | CSS Grid + date loops | @event-calendar/core or @schedule-x/svelte | Event overlap detection, drag-drop collision, time slot snapping, all-day events |
| Drag and drop | Browser drag API + position calc | Library's built-in interaction plugin | Touch support, auto-scroll, constraint validation, visual feedback |
| Timezone conversion | Manual UTC offset math | ical.js or Temporal API | DST transitions, historical timezone changes, IANA database |

**Key insight:** Calendar domain has decades of edge cases encoded in RFC standards. Libraries implementing these RFCs have battle-tested thousands of real-world calendars. Custom solutions inevitably hit "works for my calendar but breaks on import" issues.

## Common Pitfalls

### Pitfall 1: Missing VTIMEZONE Definitions
**What goes wrong:** Imported ICS files reference timezones (TZID) but don't include VTIMEZONE component definitions, causing parser errors or incorrect times.
**Why it happens:** ICS exporters (Outlook, Exchange) assume receiver has timezone database, but JavaScript needs explicit definitions.
**How to avoid:** Use ical.js which handles VTIMEZONE components natively. When VTIMEZONE is missing, ical.js falls back to IANA timezone database.
**Warning signs:** Events imported at wrong times, parser throws "TZID not found" errors.

### Pitfall 2: Naive Recurrence Instance Storage
**What goes wrong:** Storing each recurrence as separate database row leads to edit/delete complexity ("delete just this instance or all?") and data bloat.
**Why it happens:** Seems simpler to treat recurrences as individual events for calendar rendering.
**How to avoid:** Store base event with RRULE string, expand to instances at query time. Store exceptions as modifications to recurrenceId.
**Warning signs:** Database grows rapidly with recurring events, "edit series" functionality becomes complex.

### Pitfall 3: Drag-Drop Timing Granularity
**What goes wrong:** Events snap to wrong time slots during drag, or snap is too coarse/fine for user intent.
**Why it happens:** Default snap interval (usually 30min) doesn't match user needs, or snap algorithm rounds incorrectly.
**How to avoid:** Configure EventCalendar's `slotDuration` (display granularity) and snap behavior separately. Use `eventDurationEditable` and `eventStartEditable` to control what's draggable.
**Warning signs:** Users complain events "jump" to unexpected times, difficulty scheduling precise times like "2:15 PM".

### Pitfall 4: Event Color Overload
**What goes wrong:** Too many color categories creates visual chaos, users can't quickly scan schedule.
**Why it happens:** Desire to categorize everything (work, personal, project A, project B, etc.) leads to rainbow calendar.
**How to avoid:** Limit to 4-6 semantic colors. For GTD use case: source-based coloring (manual, work import, personal import) plus optional project color override. Use text/icons for finer distinctions.
**Warning signs:** User testing shows confusion about color meanings, calendar looks "busy" even with few events.

### Pitfall 5: Form Validation Timezone Issues
**What goes wrong:** User selects "3 PM" in form but event displays at "10 AM" because timezone mismatch between form and storage.
**Why it happens:** Mixing browser local time with stored UTC time without proper conversion, or assuming all dates are in one timezone.
**How to avoid:** Store events in UTC, display in user's local timezone. Use native Date objects for local times, convert to UTC only at storage boundary. For imported ICS, preserve original timezone.
**Warning signs:** Events shift times after save/reload, "morning meeting" appears in afternoon.

### Pitfall 6: Empty State Neglect
**What goes wrong:** Blank calendar on first use provides no guidance, users unsure how to add events.
**Why it happens:** Focus on feature-complete state, empty state feels like "nice to have."
**How to avoid:** Design empty state with call-to-action ("Add your first event", "Import calendar"), contextual help, and visual consistency with rest of app. Follow GTD app's existing empty state patterns.
**Warning signs:** User drop-off on calendar page, support questions about "how do I add events?"

### Pitfall 7: Side Panel Context Mismatch
**What goes wrong:** Side panel shows next actions unrelated to calendar's current view, breaking the "hard landscape + available actions" mental model.
**Why it happens:** Static next actions list doesn't react to calendar view changes (day/week/month, date navigation).
**How to avoid:** Filter next actions by visible date range, optionally by project if event is project-linked. Highlight time gaps between events for "what can I do now?" context.
**Warning signs:** Users don't use side panel, treat calendar as separate tool from GTD lists.

## Code Examples

Verified patterns from official sources:

### EventCalendar Setup with Svelte 5
```typescript
// Source: @event-calendar/core Svelte 5 documentation
// https://github.com/vkurko/calendar

<script lang="ts">
import Calendar from '@event-calendar/core';
import TimeGrid from '@event-calendar/time-grid';
import DayGrid from '@event-calendar/day-grid';
import Interaction from '@event-calendar/interaction';

let plugins = [TimeGrid, DayGrid, Interaction];

let options = $state({
  view: 'timeGridDay',
  headerToolbar: {
    start: 'prev,next today',
    center: 'title',
    end: 'dayGridMonth,timeGridWeek,timeGridDay'
  },
  events: [],
  editable: true,
  eventDrop: (info) => handleEventDrop(info),
  eventResize: (info) => handleEventResize(info),
  eventClick: (info) => handleEventClick(info),
  dateClick: (info) => handleDateClick(info),
  slotDuration: '00:30:00',
  slotMinTime: '06:00:00',
  slotMaxTime: '22:00:00'
});
</script>

<Calendar {plugins} {options} />
```

### ICS Import with ical.js
```typescript
// Source: ical.js v2 documentation
// https://github.com/mozilla-comm/ical.js/

import ICAL from 'ical.js';

function parseICSFile(icsContent: string): Partial<CalendarEvent>[] {
  const jcalData = ICAL.parse(icsContent);
  const comp = new ICAL.Component(jcalData);
  const vevents = comp.getAllSubcomponents('vevent');

  return vevents.map(vevent => {
    const event = new ICAL.Event(vevent);

    return {
      title: event.summary,
      startTime: event.startDate.toJSDate(),
      endTime: event.endDate.toJSDate(),
      location: event.location || undefined,
      notes: event.description || undefined,
      rrule: vevent.getFirstPropertyValue('rrule')?.toString(),
      created: new Date(),
      modified: new Date()
    };
  });
}
```

### Recurrence Expansion with rrule.js
```typescript
// Source: rrule.js documentation
// https://github.com/jkbrzt/rrule

import { rrulestr } from 'rrule';

function expandRecurringEvent(
  event: CalendarEvent,
  rangeStart: Date,
  rangeEnd: Date
): CalendarEvent[] {
  if (!event.rrule) return [event];

  const rule = rrulestr(event.rrule, { dtstart: event.startTime });
  const occurrences = rule.between(rangeStart, rangeEnd, true);

  const duration = event.endTime.getTime() - event.startTime.getTime();

  return occurrences.map((occurrence, index) => ({
    ...event,
    id: event.id * 10000 + index, // Temporary ID for instance
    startTime: occurrence,
    endTime: new Date(occurrence.getTime() + duration),
    isRecurrenceInstance: true,
    originalEventId: event.id
  }));
}
```

### Dexie Event Operations
```typescript
// Source: Dexie 4.x EntityTable documentation + GTD project patterns

import { db } from '$lib/db/schema';
import type { CalendarEvent } from '$lib/db/schema';

// Create event
async function createEvent(event: Omit<CalendarEvent, 'id'>): Promise<number> {
  return await db.events.add(event as CalendarEvent);
}

// Get events in date range
async function getEventsInRange(start: Date, end: Date): Promise<CalendarEvent[]> {
  return await db.events
    .where('startTime')
    .between(start, end, true, true)
    .toArray();
}

// Update event after drag/drop
async function updateEventTime(
  id: number,
  newStart: Date,
  newEnd: Date
): Promise<void> {
  await db.events.update(id, {
    startTime: newStart,
    endTime: newEnd,
    modified: new Date()
  });
}

// Link event to project
async function linkEventToProject(
  eventId: number,
  projectId: number
): Promise<void> {
  await db.events.update(eventId, { projectId });
}
```

### Natural Language Quick Add (Optional)
```typescript
// Source: chrono-node v2 documentation
// https://github.com/wanasit/chrono

import * as chrono from 'chrono-node';

function parseQuickAdd(input: string): Partial<CalendarEvent> {
  // Example: "Team meeting tomorrow at 2pm for 1 hour"
  const results = chrono.parse(input, new Date(), { forwardDate: true });

  if (results.length === 0) return {};

  const parsed = results[0];
  const title = input.replace(parsed.text, '').trim();

  return {
    title: title || 'New Event',
    startTime: parsed.start.date(),
    endTime: parsed.end?.date() || new Date(parsed.start.date().getTime() + 60 * 60 * 1000)
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| FullCalendar with jQuery | EventCalendar or Schedule-X | 2020-2024 | Zero dependencies, smaller bundle (35KB vs 150KB+), native framework support |
| Manual RRULE parsing | rrule.js library | Established ~2015 | RFC-compliant recurrence, natural language support, DST handling |
| Custom ICS parsers | ical.js (Mozilla) | Established ~2014 | VTIMEZONE support, RFC 5545/7265 compliance, vCard support |
| Moment.js for dates | Native Date + Temporal API polyfill | 2020-2023 | Moment is deprecated, Temporal is stage 3 standard, smaller bundles |
| String-based date parsing | chrono-node | Established ~2014 | Locale-aware, ambiguity resolution, relative dates |
| Server-side recurrence expansion | Client-side with rrule.js | 2018-2020 | Offline-first apps, reduced server load, better UX |

**Deprecated/outdated:**
- **FullCalendar v3/v4:** Requires jQuery, heavier bundle. v5+ is framework-agnostic but commercial license needed for timeline/resource views.
- **Moment.js:** Officially deprecated, large bundle size (67KB), mutable API. Use native Date or Temporal.
- **date-fns:** Not deprecated but unnecessary for this use case - ical.js and rrule.js handle date math.
- **node-ical:** Works but less RFC-compliant than ical.js, weaker timezone handling.

## Open Questions

Things that couldn't be fully resolved:

1. **Natural Language Quick Add Complexity**
   - What we know: chrono-node can parse "tomorrow at 2pm" effectively
   - What's unclear: Whether NLP quick-add justifies 100KB+ bundle size vs simple form with date/time pickers
   - Recommendation: Start with structured form (date picker + time inputs), add chrono-node in Phase 9+ if user testing shows demand. Context says "Claude's Discretion" - lean toward simple structured form initially.

2. **All-Day Event Support**
   - What we know: Context defers "all-day events / multi-day events" to later
   - What's unclear: Whether ICS imports will include all-day events that need basic display
   - Recommendation: EventCalendar supports all-day events natively. Include basic all-day support (flag + display) but defer creation UI to future phase. This prevents import failures.

3. **Side Panel Content Strategy**
   - What we know: Side panel should show next actions for planning context
   - What's unclear: Exact filtering logic (all actions? today's only? project-linked only?)
   - Recommendation: Start with today's next actions (if day view) or visible date range (if week/month), no project filtering. Test with users, iterate in Phase 9+.

4. **Recurrence Exception Editing UX**
   - What we know: Need "edit this occurrence" vs "edit all" choice
   - What's unclear: Exact modal flow and data model for storing exceptions
   - Recommendation: Store exceptions as separate events with `recurrenceId` pointing to parent. Modal shows two buttons: "This event" (create exception), "All events" (edit parent RRULE). Standard pattern from Google Calendar.

## Sources

### Primary (HIGH confidence)
- [@event-calendar/core GitHub repository](https://github.com/vkurko/calendar) - Official EventCalendar documentation, features, and examples
- [ical.js GitHub repository](https://github.com/mozilla-comm/ical.js/) - Mozilla-maintained RFC 5545/7265 parser, v2.2.1 documentation
- [rrule.js GitHub repository](https://github.com/jkbrzt/rrule) - iCalendar recurrence rule library documentation
- [Dexie.js official documentation](https://dexie.org/docs/Tutorial/Understanding-the-basics) - IndexedDB wrapper, EntityTable patterns
- [chrono-node GitHub repository](https://github.com/wanasit/chrono) - Natural language date parser, v2 documentation

### Secondary (MEDIUM confidence)
- [Martin Fowler - Recurring Events for Calendars (PDF)](https://martinfowler.com/apsupp/recurring.pdf) - Temporal expression pattern for recurrence architecture
- [The Complex World of Calendars: Database Design (Medium)](https://medium.com/tomorrowapp/the-complex-world-of-calendars-database-design-fccb3a71a74b) - Event data model patterns verified against iCalendar spec
- [CalConnect iCalendar Data Model](https://devguide.calconnect.org/Data-Model/Data-Model/) - Official iCalendar standard concepts
- [FullCalendar Event Dragging & Resizing Docs](https://fullcalendar.io/docs/event-dragging-resizing) - Verified patterns for drag-drop (EventCalendar uses similar API)
- [Calendar Design: UX/UI Tips for Functionality (Page Flows)](https://pageflows.com/resources/exploring-calendar-design/) - 2026 UX patterns verified with multiple sources

### Tertiary (LOW confidence)
- [SVAR Svelte Calendar](https://svar.dev/svelte/calendar/) - Alternative library, license unclear, less community adoption
- WebSearch results on color coding best practices - General UX guidance, not library-specific
- WebSearch results on empty state patterns - UI design patterns, not calendar-specific implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Libraries verified via official documentation, npm packages confirmed current, widespread adoption validated
- Architecture: HIGH - Patterns verified in official docs (Dexie, EventCalendar, ical.js), cross-referenced with RFC standards
- Pitfalls: MEDIUM - Timezone/recurrence issues verified in GitHub issues and RFC docs, other pitfalls from general UX research

**Research date:** 2026-01-30
**Valid until:** 2026-03-01 (30 days - calendar libraries are stable, but Svelte 5 ecosystem is evolving)
