import { db, type GTDItem, type Context, type AppSettings, type CalendarEvent } from './schema';

export async function addItem(item: Omit<GTDItem, 'id' | 'created' | 'modified'>): Promise<number> {
	return await db.items.add({
		...item,
		created: new Date(),
		modified: new Date()
	} as GTDItem);
}

export async function updateItem(id: number, changes: Partial<GTDItem>): Promise<number> {
	return await db.items.update(id, {
		...changes,
		modified: new Date()
	});
}

export async function deleteItem(id: number): Promise<void> {
	await db.items.update(id, {
		deleted: true,
		deletedAt: new Date(),
		modified: new Date()
	});
}

export async function getItem(id: number): Promise<GTDItem | undefined> {
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

export async function bulkDeleteItems(ids: number[]): Promise<void> {
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

export async function addContext(name: string): Promise<number> {
	// Ensure name starts with @
	if (!name.startsWith('@')) {
		throw new Error('Context name must start with @');
	}

	// Get the max sortOrder and add 1
	const contexts = await db.contexts.toArray();
	const maxSortOrder = contexts.reduce((max, ctx) => Math.max(max, ctx.sortOrder), -1);

	return await db.contexts.add({
		name,
		sortOrder: maxSortOrder + 1,
		isDefault: false,
		created: new Date()
	} as Context);
}

export async function updateContext(id: number, changes: Partial<Context>): Promise<number> {
	return await db.contexts.update(id, changes);
}

export async function deleteContext(id: number): Promise<void> {
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

export async function completeAction(id: number): Promise<() => Promise<void>> {
	await db.items.update(id, {
		completedAt: new Date(),
		modified: new Date()
	});

	// Return undo function
	return async () => {
		await db.items.update(id, {
			completedAt: undefined,
			modified: new Date()
		});
	};
}

export async function undoCompleteAction(id: number): Promise<void> {
	await db.items.update(id, {
		completedAt: undefined,
		modified: new Date()
	});
}

export async function reorderActions(orderedIds: number[]): Promise<void> {
	await Promise.all(
		orderedIds.map((id, index) =>
			db.items.update(id, {
				sortOrder: index,
				modified: new Date()
			})
		)
	);
}

export async function bulkCompleteActions(ids: number[]): Promise<() => Promise<void>> {
	const now = new Date();

	await Promise.all(
		ids.map(id =>
			db.items.update(id, {
				completedAt: now,
				modified: now
			})
		)
	);

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

export async function getActionsByProject(projectId: number): Promise<GTDItem[]> {
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

export async function completeProject(id: number): Promise<() => Promise<void>> {
	await db.items.update(id, {
		completedAt: new Date(),
		modified: new Date()
	});

	// Return undo function
	return async () => {
		await db.items.update(id, {
			completedAt: undefined,
			modified: new Date()
		});
	};
}

export async function moveProjectToSomeday(id: number): Promise<void> {
	await db.items.update(id, {
		type: 'someday',
		modified: new Date()
	});
}

export async function addProject(title: string, notes?: string): Promise<number> {
	return await db.items.add({
		title,
		type: 'project',
		notes: notes || '',
		created: new Date(),
		modified: new Date()
	} as GTDItem);
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

export async function resolveWaitingFor(id: number): Promise<() => Promise<void>> {
	await db.items.update(id, {
		completedAt: new Date(),
		modified: new Date()
	});

	// Return undo function
	return async () => {
		await db.items.update(id, {
			completedAt: undefined,
			modified: new Date()
		});
	};
}

export async function addWaitingFor(
	title: string,
	delegatedTo: string,
	followUpDate?: Date,
	projectId?: number,
	notes?: string
): Promise<number> {
	return await db.items.add({
		title,
		type: 'waiting',
		delegatedTo,
		followUpDate,
		projectId,
		notes: notes || '',
		created: new Date(),
		modified: new Date()
	} as GTDItem);
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

export async function promoteSomedayToActive(id: number, newType: 'project' | 'next-action'): Promise<void> {
	await db.items.update(id, {
		type: newType,
		category: undefined,
		modified: new Date()
	});
}

export async function addSomedayItem(title: string, notes?: string, category?: string): Promise<number> {
	return await db.items.add({
		title,
		type: 'someday',
		notes: notes || '',
		category,
		created: new Date(),
		modified: new Date()
	} as GTDItem);
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
}

// ============================================================================
// Calendar Event Operations
// ============================================================================

export async function addEvent(event: Omit<CalendarEvent, 'id' | 'created' | 'modified'>): Promise<number> {
	return await db.events.add({
		...event,
		created: new Date(),
		modified: new Date()
	} as CalendarEvent);
}

export async function updateEvent(id: number, changes: Partial<CalendarEvent>): Promise<number> {
	return await db.events.update(id, {
		...changes,
		modified: new Date()
	});
}

export async function deleteEvent(id: number): Promise<void> {
	await db.events.update(id, {
		deleted: true,
		deletedAt: new Date(),
		modified: new Date()
	});
}

export async function getEvent(id: number): Promise<CalendarEvent | undefined> {
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

export async function bulkAddEvents(events: Omit<CalendarEvent, 'id' | 'created' | 'modified'>[]): Promise<number[]> {
	const now = new Date();
	const withTimestamps = events.map(e => ({
		...e,
		created: now,
		modified: now
	})) as CalendarEvent[];
	return await db.events.bulkAdd(withTimestamps, { allKeys: true }) as number[];
}

export async function getAllEvents(): Promise<CalendarEvent[]> {
	return await db.events
		.filter(e => !e.deleted)
		.toArray();
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
		await db.items.bulkDelete(oldItems.map(i => i.id!));
		count += oldItems.length;
	}

	// Clean up old deleted events
	const oldEvents = await db.events
		.filter(e => !!e.deleted && !!e.deletedAt && e.deletedAt < cutoff)
		.toArray();
	if (oldEvents.length > 0) {
		await db.events.bulkDelete(oldEvents.map(e => e.id!));
		count += oldEvents.length;
	}

	// Clean up old deleted contexts
	const oldContexts = await db.contexts
		.filter(c => !!(c as any).deleted && !!(c as any).deletedAt && (c as any).deletedAt < cutoff)
		.toArray();
	if (oldContexts.length > 0) {
		await db.contexts.bulkDelete(oldContexts.map(c => c.id!));
		count += oldContexts.length;
	}

	return count;
}
