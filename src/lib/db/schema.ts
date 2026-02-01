import { Dexie, type EntityTable } from "dexie";
import { tokenize } from "./search";

export interface GTDItem {
	id: string;  // Changed from number to string (UUID) for sync compatibility
	title: string;
	type: 'inbox' | 'next-action' | 'project' | 'waiting' | 'someday';
	notes: string;
	created: Date;
	modified: Date;
	searchWords?: string[];
	context?: string;
	delegatedTo?: string;
	projectId?: string;  // Changed from number to string to reference UUID
	completedAt?: Date;
	sortOrder?: number;
	followUpDate?: Date;
	category?: string;
	deleted?: boolean;
	deletedAt?: Date;
}

export interface Context {
	id: string;  // Changed from number to string (UUID) for sync compatibility
	name: string;       // e.g., "@computer", "@office"
	color?: string;     // Optional hex color for badge
	icon?: string;      // Optional icon identifier
	sortOrder: number;  // For sidebar ordering
	isDefault: boolean; // GTD defaults can't be deleted
	created: Date;
	deleted?: boolean;
	deletedAt?: Date;
}

export interface GTDList {
	id: string;  // Changed from number to string (UUID) for sync compatibility
	name: string;
	type: string;
}

export interface AppSettings {
	id: number;  // Keep as number - settings use 'key' field for uniqueness, not 'id'
	key: string;
	value: any;
	updatedAt: Date;
}

export interface CalendarEvent {
	id: string;  // Changed from number to string (UUID) for sync compatibility
	title: string;
	startTime: Date;
	endTime: Date;
	allDay?: boolean;
	location?: string;
	notes?: string;
	color?: string;
	projectId?: string;  // Changed from number to string to reference UUID
	source?: string;           // 'manual' | 'ics-import' | filename
	rrule?: string;            // RFC 5545 RRULE string
	recurrenceId?: string;     // Changed from number to string to reference UUID
	exceptionDates?: string[]; // ISO date strings for excluded occurrences
	created: Date;
	modified: Date;
	deleted?: boolean;
	deletedAt?: Date;
}

export const db = new Dexie("GTDDatabase") as Dexie & {
	items: EntityTable<GTDItem, "id">;
	lists: EntityTable<GTDList, "id">;
	contexts: EntityTable<Context, "id">;
	settings: EntityTable<AppSettings, "id">;
	events: EntityTable<CalendarEvent, "id">;
};

db.version(1).stores({
	items: "++id, type, created, modified",
	lists: "++id, name, type"
});

db.version(2).stores({
	items: "++id, type, created, modified, *searchWords, context, projectId",
	lists: "++id, name, type"
});

db.version(3).stores({
	items: "++id, type, created, modified, *searchWords, context, projectId, sortOrder, completedAt",
	lists: "++id, name, type",
	contexts: "++id, name, sortOrder"
});

db.version(4).stores({
	items: "++id, type, created, modified, *searchWords, context, projectId, sortOrder, completedAt, followUpDate, category",
	lists: "++id, name, type",
	contexts: "++id, name, sortOrder"
});

db.version(5).stores({
	items: "++id, type, created, modified, *searchWords, context, projectId, sortOrder, completedAt, followUpDate, category",
	lists: "++id, name, type",
	contexts: "++id, name, sortOrder",
	settings: "++id, &key, updatedAt"
});

db.version(6).stores({
	items: "++id, type, created, modified, *searchWords, context, projectId, sortOrder, completedAt, followUpDate, category",
	lists: "++id, name, type",
	contexts: "++id, name, sortOrder",
	settings: "++id, &key, updatedAt",
	events: "++id, startTime, endTime, projectId, source, recurrenceId"
});

db.version(7).stores({
	items: "++id, type, created, modified, *searchWords, context, projectId, sortOrder, completedAt, followUpDate, category, deleted",
	lists: "++id, name, type",
	contexts: "++id, name, sortOrder",
	settings: "++id, &key, updatedAt",
	events: "++id, startTime, endTime, projectId, source, recurrenceId, deleted"
});

// Versions 8-11: Multi-step migration to UUID-based IDs for sync compatibility.
// IndexedDB does not support changing primary keys in-place, so we use a
// temp-table strategy: copy → delete → recreate → cleanup.

// Version 8: Copy data from original tables into temporary tables
db.version(8).stores({
	items: "++id, type, created, modified, *searchWords, context, projectId, sortOrder, completedAt, followUpDate, category, deleted",
	lists: "++id, name, type",
	contexts: "++id, name, sortOrder",
	settings: "++id, &key, updatedAt",
	events: "++id, startTime, endTime, projectId, source, recurrenceId, deleted",
	// Temp tables with UUID primary keys
	_tmp_items: "id, type",
	_tmp_lists: "id, name",
	_tmp_contexts: "id, name",
	_tmp_events: "id, startTime"
}).upgrade(async (trans) => {
	const { generateUUID } = await import('../utils/uuid');

	// Build ID maps for foreign key remapping
	const itemIdMap = new Map<number, string>();
	const eventIdMap = new Map<number, string>();

	// Copy items → _tmp_items
	const items = await trans.table('items').toArray();
	for (const item of items) {
		const newId = generateUUID();
		itemIdMap.set(item.id as number, newId);
		await trans.table('_tmp_items').add({ ...item, id: newId, projectId: item.projectId });
	}

	// Copy contexts → _tmp_contexts
	const contexts = await trans.table('contexts').toArray();
	for (const ctx of contexts) {
		await trans.table('_tmp_contexts').add({ ...ctx, id: generateUUID() });
	}

	// Copy lists → _tmp_lists
	const lists = await trans.table('lists').toArray();
	for (const list of lists) {
		await trans.table('_tmp_lists').add({ ...list, id: generateUUID() });
	}

	// Copy events → _tmp_events
	const events = await trans.table('events').toArray();
	for (const event of events) {
		const newId = generateUUID();
		eventIdMap.set(event.id as number, newId);
		await trans.table('_tmp_events').add({ ...event, id: newId });
	}

	// Fix foreign key references in temp tables
	const tmpItems = await trans.table('_tmp_items').toArray();
	for (const item of tmpItems) {
		if (item.projectId && typeof item.projectId === 'number') {
			const newProjectId = itemIdMap.get(item.projectId as number);
			if (newProjectId) {
				await trans.table('_tmp_items').update(item.id, { projectId: newProjectId });
			}
		}
	}

	const tmpEvents = await trans.table('_tmp_events').toArray();
	for (const event of tmpEvents) {
		const updates: any = {};
		if (event.projectId && typeof event.projectId === 'number') {
			const newProjId = itemIdMap.get(event.projectId as number);
			if (newProjId) updates.projectId = newProjId;
		}
		if (event.recurrenceId && typeof event.recurrenceId === 'number') {
			const newRecId = eventIdMap.get(event.recurrenceId as number);
			if (newRecId) updates.recurrenceId = newRecId;
		}
		if (Object.keys(updates).length > 0) {
			await trans.table('_tmp_events').update(event.id, updates);
		}
	}
});

// Version 9: Delete original tables (set to null)
db.version(9).stores({
	items: null as any,
	lists: null as any,
	contexts: null as any,
	events: null as any,
	settings: "++id, &key, updatedAt",
	_tmp_items: "id, type",
	_tmp_lists: "id, name",
	_tmp_contexts: "id, name",
	_tmp_events: "id, startTime"
});

// Version 10: Recreate original tables with UUID primary keys (no ++), copy data back
db.version(10).stores({
	items: "id, type, created, modified, *searchWords, context, projectId, sortOrder, completedAt, followUpDate, category, deleted",
	lists: "id, name, type",
	contexts: "id, name, sortOrder",
	settings: "++id, &key, updatedAt",
	events: "id, startTime, endTime, projectId, source, recurrenceId, deleted",
	_tmp_items: "id, type",
	_tmp_lists: "id, name",
	_tmp_contexts: "id, name",
	_tmp_events: "id, startTime"
}).upgrade(async (trans) => {
	// Copy data back from temp tables to recreated tables
	const items = await trans.table('_tmp_items').toArray();
	for (const item of items) {
		await trans.table('items').add(item);
	}

	const lists = await trans.table('_tmp_lists').toArray();
	for (const list of lists) {
		await trans.table('lists').add(list);
	}

	const contexts = await trans.table('_tmp_contexts').toArray();
	for (const ctx of contexts) {
		await trans.table('contexts').add(ctx);
	}

	const events = await trans.table('_tmp_events').toArray();
	for (const event of events) {
		await trans.table('events').add(event);
	}
});

// Version 11: Clean up temp tables
db.version(11).stores({
	items: "id, type, created, modified, *searchWords, context, projectId, sortOrder, completedAt, followUpDate, category, deleted",
	lists: "id, name, type",
	contexts: "id, name, sortOrder",
	settings: "++id, &key, updatedAt",
	events: "id, startTime, endTime, projectId, source, recurrenceId, deleted",
	_tmp_items: null as any,
	_tmp_lists: null as any,
	_tmp_contexts: null as any,
	_tmp_events: null as any
});

// Hooks for automatic searchWords population
db.items.hook("creating", (primKey, obj: GTDItem) => {
	const text = `${obj.title || ''} ${obj.notes || ''}`;
	obj.searchWords = tokenize(text);
});

db.items.hook("updating", (modifications: Partial<GTDItem>, primKey, obj: GTDItem) => {
	// Only re-tokenize if title or notes changed
	if (modifications.title !== undefined || modifications.notes !== undefined) {
		const title = modifications.title !== undefined ? modifications.title : obj.title;
		const notes = modifications.notes !== undefined ? modifications.notes : obj.notes;
		const text = `${title || ''} ${notes || ''}`;
		modifications.searchWords = tokenize(text);
	}
	return modifications;
});

// Seed default GTD contexts
async function seedDefaultContexts() {
	const { generateUUID } = await import('../utils/uuid');
	const defaults: Context[] = [
		{ id: generateUUID(), name: '@computer', sortOrder: 0, isDefault: true, created: new Date() },
		{ id: generateUUID(), name: '@office', sortOrder: 1, isDefault: true, created: new Date() },
		{ id: generateUUID(), name: '@phone', sortOrder: 2, isDefault: true, created: new Date() },
		{ id: generateUUID(), name: '@home', sortOrder: 3, isDefault: true, created: new Date() },
		{ id: generateUUID(), name: '@errands', sortOrder: 4, isDefault: true, created: new Date() }
	];
	await db.contexts.bulkAdd(defaults);
}

// Seed contexts on fresh database creation
db.on('populate', async () => {
	await seedDefaultContexts();
});

// Seed contexts on existing databases upgrading from v2 to v3
db.on('ready', async () => {
	const count = await db.contexts.count();
	if (count === 0) {
		await seedDefaultContexts();
	}
});
