import { db, type GTDItem, type Context, type AppSettings, type CalendarEvent, type SyncMeta } from './schema';
import { generateUUID } from '../utils/uuid';

// Sync notification callback - set by sync store to avoid circular imports
let onDataChanged: (() => void) | null = null;

export function setSyncNotifier(callback: () => void): void {
	onDataChanged = callback;
}

function notifyDataChanged(): void {
	if (onDataChanged) onDataChanged();
}

export async function addItem(item: Omit<GTDItem, 'id' | 'created' | 'modified'>): Promise<string> {
	const newItem: GTDItem = {
		...item,
		id: generateUUID(),
		created: new Date(),
		modified: new Date()
	} as GTDItem;
	await db.items.add(newItem);
	notifyDataChanged();
	return newItem.id;
}

export async function updateItem(id: string, changes: Partial<GTDItem>): Promise<number> {
	const result = await db.items.update(id, {
		...changes,
		modified: new Date()
	});
	notifyDataChanged();
	return result;
}

export async function deleteItem(id: string): Promise<void> {
	await db.items.update(id, {
		deleted: true,
		deletedAt: new Date(),
		modified: new Date()
	});
	notifyDataChanged();
}

export async function getItem(id: string): Promise<GTDItem | undefined> {
	return await db.items.get(id);
}

export async function getAllInbox(): Promise<GTDItem[]> {
	return await db.items
		.where('type')
		.equals('inbox')
		.filter(item => !item.deleted)
		.sortBy('created');
}

export async function getItemsByType(type: GTDItem['type']): Promise<GTDItem[]> {
	return await db.items
		.where('type')
		.equals(type)
		.filter(item => !item.deleted)
		.toArray();
}

export async function bulkDeleteItems(ids: string[]): Promise<void> {
	const now = new Date();
	await Promise.all(
		ids.map(id =>
			db.items.update(id, {
				deleted: true,
				deletedAt: now,
				modified: now
			})
		)
	);
	notifyDataChanged();
}

// ============================================================================
// Context Operations
// ============================================================================

export async function getAllContexts(): Promise<Context[]> {
	return await db.contexts
		.orderBy('sortOrder')
		.filter(ctx => !ctx.deleted)
		.toArray();
}

export async function addContext(name: string): Promise<string> {
	// Ensure name starts with @
	if (!name.startsWith('@')) {
		throw new Error('Context name must start with @');
	}

	// Get the max sortOrder and add 1
	const contexts = await db.contexts.toArray();
	const maxSortOrder = contexts.reduce((max, ctx) => Math.max(max, ctx.sortOrder), -1);

	const newContext: Context = {
		id: generateUUID(),
		name,
		sortOrder: maxSortOrder + 1,
		isDefault: false,
		created: new Date()
	};
	await db.contexts.add(newContext);
	notifyDataChanged();
	return newContext.id;
}

export async function updateContext(id: string, changes: Partial<Context>): Promise<number> {
	const result = await db.contexts.update(id, changes);
	notifyDataChanged();
	return result;
}

export async function deleteContext(id: string): Promise<void> {
	// Get the context to find its name
	const context = await db.contexts.get(id);
	if (!context) return;

	// Clear the context field on any items that reference this context
	const itemsWithContext = await db.items
		.where('context')
		.equals(context.name)
		.toArray();

	if (itemsWithContext.length > 0) {
		await Promise.all(
			itemsWithContext.map(item =>
				db.items.update(item.id, { context: undefined, modified: new Date() })
			)
		);
	}

	// Soft-delete the context
	await db.contexts.update(id, {
		deleted: true,
		deletedAt: new Date()
	});
	notifyDataChanged();
}

// ============================================================================
// Action Operations
// ============================================================================

export async function getAllNextActions(): Promise<GTDItem[]> {
	const actions = await db.items
		.where('type')
		.equals('next-action')
		.filter(item => !item.completedAt && !item.deleted)
		.toArray();

	// Sort by sortOrder (ascending, nulls last), then by created (FIFO)
	return actions.sort((a, b) => {
		// Handle sortOrder nulls/undefined
		const aSort = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
		const bSort = b.sortOrder ?? Number.MAX_SAFE_INTEGER;

		if (aSort !== bSort) {
			return aSort - bSort;
		}

		// If sortOrder is same (or both null), sort by created date
		return a.created.getTime() - b.created.getTime();
	});
}

export async function getActionsByContext(contexts: string[]): Promise<GTDItem[]> {
	// Use in-memory filter since Dexie doesn't support OR queries on indexed fields
	const actions = await db.items
		.where('type')
		.equals('next-action')
		.filter(item => {
			return !item.completedAt && !item.deleted && !!item.context && contexts.includes(item.context);
		})
		.toArray();

	// Sort by sortOrder (ascending, nulls last), then by created (FIFO)
	return actions.sort((a, b) => {
		// Handle sortOrder nulls/undefined
		const aSort = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
		const bSort = b.sortOrder ?? Number.MAX_SAFE_INTEGER;

		if (aSort !== bSort) {
			return aSort - bSort;
		}

		// If sortOrder is same (or both null), sort by created date
		return a.created.getTime() - b.created.getTime();
	});
}

export async function completeAction(id: string): Promise<() => Promise<void>> {
	await db.items.update(id, {
		completedAt: new Date(),
		modified: new Date()
	});
	notifyDataChanged();

	// Return undo function
	return async () => {
		await db.items.update(id, {
			completedAt: undefined,
			modified: new Date()
		});
		notifyDataChanged();
	};
}

export async function undoCompleteAction(id: string): Promise<void> {
	await db.items.update(id, {
		completedAt: undefined,
		modified: new Date()
	});
	notifyDataChanged();
}

export async function reorderActions(orderedIds: string[]): Promise<void> {
	await Promise.all(
		orderedIds.map((id, index) =>
			db.items.update(id, {
				sortOrder: index,
				modified: new Date()
			})
		)
	);
	notifyDataChanged();
}

export async function bulkCompleteActions(ids: string[]): Promise<() => Promise<void>> {
	const now = new Date();

	await Promise.all(
		ids.map(id =>
			db.items.update(id, {
				completedAt: now,
				modified: now
			})
		)
	);
	notifyDataChanged();

	// Return undo function
	return async () => {
		await Promise.all(
			ids.map(id =>
				db.items.update(id, {
					completedAt: undefined,
					modified: new Date()
				})
			)
		);
		notifyDataChanged();
	};
}

// ============================================================================
// Project Operations
// ============================================================================

export async function getAllProjects(): Promise<GTDItem[]> {
	return await db.items
		.where('type')
		.equals('project')
		.filter(item => !item.completedAt && !item.deleted)
		.sortBy('created');
}

export async function getActionsByProject(projectId: string): Promise<GTDItem[]> {
	return await db.items
		.where('type')
		.equals('next-action')
		.filter(item => !item.completedAt && !item.deleted && item.projectId === projectId)
		.toArray();
}

export async function getStalledProjects(): Promise<GTDItem[]> {
	// Use 2-query pattern to avoid N+1
	const projects = await db.items
		.where('type')
		.equals('project')
		.filter(item => !item.completedAt && !item.deleted)
		.toArray();

	const actionsWithProject = await db.items
		.where('type')
		.equals('next-action')
		.filter(item => !item.completedAt && !item.deleted && item.projectId !== undefined)
		.toArray();

	// Build Set of project IDs that have active actions
	const activeProjectIds = new Set(
		actionsWithProject.map(action => action.projectId!)
	);

	// Return projects NOT in the active set
	return projects.filter(project => !activeProjectIds.has(project.id));
}

export async function completeProject(id: string): Promise<() => Promise<void>> {
	await db.items.update(id, {
		completedAt: new Date(),
		modified: new Date()
	});
	notifyDataChanged();

	// Return undo function
	return async () => {
		await db.items.update(id, {
			completedAt: undefined,
			modified: new Date()
		});
		notifyDataChanged();
	};
}

export async function moveProjectToSomeday(id: string): Promise<void> {
	await db.items.update(id, {
		type: 'someday',
		modified: new Date()
	});
	notifyDataChanged();
}

export async function addProject(title: string, notes?: string): Promise<string> {
	const newProject: GTDItem = {
		id: generateUUID(),
		title,
		type: 'project',
		notes: notes || '',
		created: new Date(),
		modified: new Date()
	} as GTDItem;
	await db.items.add(newProject);
	notifyDataChanged();
	return newProject.id;
}

// ============================================================================
// Waiting For Operations
// ============================================================================

export async function getAllWaitingFor(): Promise<GTDItem[]> {
	const items = await db.items
		.where('type')
		.equals('waiting')
		.filter(item => !item.completedAt && !item.deleted)
		.toArray();

	// Sort by followUpDate ascending (nulls last using MAX_SAFE_INTEGER pattern), then by created date
	return items.sort((a, b) => {
		// Handle followUpDate nulls/undefined
		const aDate = a.followUpDate ? a.followUpDate.getTime() : Number.MAX_SAFE_INTEGER;
		const bDate = b.followUpDate ? b.followUpDate.getTime() : Number.MAX_SAFE_INTEGER;

		if (aDate !== bDate) {
			return aDate - bDate;
		}

		// If followUpDate is same (or both null), sort by created date
		return a.created.getTime() - b.created.getTime();
	});
}

export async function resolveWaitingFor(id: string): Promise<() => Promise<void>> {
	await db.items.update(id, {
		completedAt: new Date(),
		modified: new Date()
	});
	notifyDataChanged();

	// Return undo function
	return async () => {
		await db.items.update(id, {
			completedAt: undefined,
			modified: new Date()
		});
		notifyDataChanged();
	};
}

export async function addWaitingFor(
	title: string,
	delegatedTo: string,
	followUpDate?: Date,
	projectId?: string,
	notes?: string
): Promise<string> {
	const newItem: GTDItem = {
		id: generateUUID(),
		title,
		type: 'waiting',
		delegatedTo,
		followUpDate,
		projectId,
		notes: notes || '',
		created: new Date(),
		modified: new Date()
	} as GTDItem;
	await db.items.add(newItem);
	notifyDataChanged();
	return newItem.id;
}

// ============================================================================
// Someday/Maybe Operations
// ============================================================================

export async function getAllSomedayMaybe(): Promise<GTDItem[]> {
	return await db.items
		.where('type')
		.equals('someday')
		.filter(item => !item.completedAt && !item.deleted)
		.sortBy('created');
}

export async function promoteSomedayToActive(id: string, newType: 'project' | 'next-action'): Promise<void> {
	await db.items.update(id, {
		type: newType,
		category: undefined,
		modified: new Date()
	});
	notifyDataChanged();
}

export async function addSomedayItem(title: string, notes?: string, category?: string): Promise<string> {
	const newItem: GTDItem = {
		id: generateUUID(),
		title,
		type: 'someday',
		notes: notes || '',
		category,
		created: new Date(),
		modified: new Date()
	} as GTDItem;
	await db.items.add(newItem);
	notifyDataChanged();
	return newItem.id;
}

// ============================================================================
// Settings Operations
// ============================================================================

export async function getSetting(key: string): Promise<any | null> {
	const setting = await db.settings.where('key').equals(key).first();
	return setting?.value ?? null;
}

export async function setSetting(key: string, value: any): Promise<void> {
	const existing = await db.settings.where('key').equals(key).first();
	if (existing) {
		await db.settings.update(existing.id, { value, updatedAt: new Date() });
	} else {
		await db.settings.add({ key, value, updatedAt: new Date() } as AppSettings);
	}
	// Only notify if NOT a sync-related setting to prevent infinite loop
	if (!key.startsWith('sync-')) {
		notifyDataChanged();
	}
}

// ============================================================================
// Calendar Event Operations
// ============================================================================

export async function addEvent(event: Omit<CalendarEvent, 'id' | 'created' | 'modified'>): Promise<string> {
	const newEvent: CalendarEvent = {
		...event,
		id: generateUUID(),
		created: new Date(),
		modified: new Date()
	} as CalendarEvent;
	await db.events.add(newEvent);
	notifyDataChanged();
	return newEvent.id;
}

export async function updateEvent(id: string, changes: Partial<CalendarEvent>): Promise<number> {
	const result = await db.events.update(id, {
		...changes,
		modified: new Date()
	});
	notifyDataChanged();
	return result;
}

export async function deleteEvent(id: string): Promise<void> {
	await db.events.update(id, {
		deleted: true,
		deletedAt: new Date(),
		modified: new Date()
	});
	notifyDataChanged();
}

export async function getEvent(id: string): Promise<CalendarEvent | undefined> {
	return await db.events.get(id);
}

export async function getEventsInRange(start: Date, end: Date): Promise<CalendarEvent[]> {
	// Get events where startTime falls within range OR endTime falls within range
	// Also include recurring events that might expand into the range
	return await db.events
		.where('startTime')
		.between(start, end, true, true)
		.or('endTime')
		.between(start, end, true, true)
		.filter(e => !e.deleted)
		.toArray();
}

export async function getRecurringEvents(): Promise<CalendarEvent[]> {
	return await db.events
		.filter(event => !!event.rrule && !event.deleted)
		.toArray();
}

export async function bulkAddEvents(events: Omit<CalendarEvent, 'id' | 'created' | 'modified'>[]): Promise<string[]> {
	const now = new Date();
	const withTimestamps = events.map(e => ({
		...e,
		id: generateUUID(),
		created: now,
		modified: now
	})) as CalendarEvent[];
	await db.events.bulkAdd(withTimestamps);
	notifyDataChanged();
	return withTimestamps.map(e => e.id);
}

export async function getAllEvents(): Promise<CalendarEvent[]> {
	return await db.events
		.filter(e => !e.deleted)
		.toArray();
}

// ============================================================================
// Outlook Event Operations
// ============================================================================

export async function getEventsByOutlookIds(outlookIds: string[]): Promise<CalendarEvent[]> {
	return await db.events
		.where('outlookId')
		.anyOf(outlookIds)
		.toArray();
}

export async function upsertOutlookEvent(event: CalendarEvent): Promise<void> {
	const existing = await db.events.where('outlookId').equals(event.outlookId!).first();
	if (existing) {
		await db.events.update(existing.id, {
			...event,
			id: existing.id,
			modified: new Date()
		});
	} else {
		await db.events.add(event);
	}
}

export async function bulkUpsertOutlookEvents(events: CalendarEvent[]): Promise<{ added: number; updated: number }> {
	const outlookIds = events.map(e => e.outlookId!).filter(Boolean);
	const existing = await db.events.where('outlookId').anyOf(outlookIds).toArray();
	const existingMap = new Map(existing.map(e => [e.outlookId!, e]));

	let added = 0;
	let updated = 0;

	await db.transaction('rw', db.events, async () => {
		for (const event of events) {
			const match = existingMap.get(event.outlookId!);
			if (match) {
				if (match.outlookETag !== event.outlookETag) {
					await db.events.update(match.id, {
						...event,
						id: match.id,
						modified: new Date()
					});
					updated++;
				}
			} else {
				await db.events.add(event);
				added++;
			}
		}
	});

	return { added, updated };
}

export async function deleteOutlookEventsByIds(outlookIds: string[]): Promise<number> {
	const now = new Date();
	const existing = await db.events.where('outlookId').anyOf(outlookIds).toArray();
	await db.transaction('rw', db.events, async () => {
		for (const event of existing) {
			await db.events.update(event.id, {
				deleted: true,
				deletedAt: now,
				modified: now
			});
		}
	});
	return existing.length;
}

export async function clearOutlookEvents(): Promise<void> {
	const outlookEvents = await db.events
		.where('syncSource')
		.equals('outlook')
		.toArray();
	await db.events.bulkDelete(outlookEvents.map(e => e.id));
}

// ============================================================================
// SyncMeta Operations
// ============================================================================

export async function getSyncMeta(calendarId: string): Promise<SyncMeta | undefined> {
	return await db.syncMeta.where('calendarId').equals(calendarId).first();
}

export async function upsertSyncMeta(meta: SyncMeta): Promise<void> {
	const existing = await db.syncMeta.where('calendarId').equals(meta.calendarId).first();
	if (existing) {
		await db.syncMeta.update(existing.id, meta);
	} else {
		await db.syncMeta.add(meta);
	}
}

export async function getAllSyncMeta(): Promise<SyncMeta[]> {
	return await db.syncMeta.toArray();
}

export async function clearAllSyncMeta(): Promise<void> {
	await db.syncMeta.clear();
}

// ============================================================================
// Tombstone Compaction
// ============================================================================

export async function compactTombstones(maxAgeDays: number = 30): Promise<number> {
	const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
	let count = 0;

	// Clean up old deleted items
	const oldItems = await db.items
		.filter(item => !!item.deleted && !!item.deletedAt && item.deletedAt < cutoff)
		.toArray();
	if (oldItems.length > 0) {
		await db.items.bulkDelete(oldItems.map(i => i.id));
		count += oldItems.length;
	}

	// Clean up old deleted events
	const oldEvents = await db.events
		.filter(e => !!e.deleted && !!e.deletedAt && e.deletedAt < cutoff)
		.toArray();
	if (oldEvents.length > 0) {
		await db.events.bulkDelete(oldEvents.map(e => e.id));
		count += oldEvents.length;
	}

	// Clean up old deleted contexts
	const oldContexts = await db.contexts
		.filter(c => !!(c as any).deleted && !!(c as any).deletedAt && (c as any).deletedAt < cutoff)
		.toArray();
	if (oldContexts.length > 0) {
		await db.contexts.bulkDelete(oldContexts.map(c => c.id));
		count += oldContexts.length;
	}

	return count;
}
