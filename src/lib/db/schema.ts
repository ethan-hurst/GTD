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

// Version 8: Change to UUID-based IDs for multi-device sync compatibility
// Auto-increment IDs cause conflicts when multiple devices create records independently
db.version(8).stores({
	items: "id, type, created, modified, *searchWords, context, projectId, sortOrder, completedAt, followUpDate, category, deleted",
	lists: "id, name, type",
	contexts: "id, name, sortOrder",
	settings: "++id, &key, updatedAt",  // Settings unchanged - uses 'key' for uniqueness
	events: "id, startTime, endTime, projectId, source, recurrenceId, deleted"
}).upgrade(async (trans) => {
	// Migrate existing records from auto-increment IDs to UUIDs
	// This is a one-way migration - cannot be undone
	const { generateUUID } = await import('../utils/uuid');

	// Map old numeric IDs to new UUID IDs for foreign key updates
	const itemIdMap = new Map<number, string>();
	const contextIdMap = new Map<number, string>();
	const eventIdMap = new Map<number, string>();
	const listIdMap = new Map<number, string>();

	// Migrate items table
	const items = await trans.table('items').toArray();
	await trans.table('items').clear();
	for (const item of items) {
		const oldId = item.id;
		const newId = generateUUID();
		itemIdMap.set(oldId as number, newId);
		await trans.table('items').add({
			...item,
			id: newId,
			projectId: item.projectId ? undefined : undefined  // Will be updated in second pass
		});
	}

	// Migrate contexts table
	const contexts = await trans.table('contexts').toArray();
	await trans.table('contexts').clear();
	for (const context of contexts) {
		const oldId = context.id;
		const newId = generateUUID();
		contextIdMap.set(oldId as number, newId);
		await trans.table('contexts').add({
			...context,
			id: newId
		});
	}

	// Migrate lists table
	const lists = await trans.table('lists').toArray();
	await trans.table('lists').clear();
	for (const list of lists) {
		const oldId = list.id;
		const newId = generateUUID();
		listIdMap.set(oldId as number, newId);
		await trans.table('lists').add({
			...list,
			id: newId
		});
	}

	// Migrate events table
	const events = await trans.table('events').toArray();
	await trans.table('events').clear();
	for (const event of events) {
		const oldId = event.id;
		const newId = generateUUID();
		eventIdMap.set(oldId as number, newId);
		await trans.table('events').add({
			...event,
			id: newId,
			projectId: event.projectId ? undefined : undefined,  // Will be updated below
			recurrenceId: event.recurrenceId ? undefined : undefined  // Will be updated below
		});
	}

	// Second pass: Update foreign key references
	const updatedItems = await trans.table('items').toArray();
	for (const item of updatedItems) {
		const updates: any = {};
		if (item.projectId && typeof item.projectId === 'number') {
			updates.projectId = itemIdMap.get(item.projectId as number) || null;
		}
		if (Object.keys(updates).length > 0) {
			await trans.table('items').update(item.id, updates);
		}
	}

	const updatedEvents = await trans.table('events').toArray();
	for (const event of updatedEvents) {
		const updates: any = {};
		if (event.projectId && typeof event.projectId === 'number') {
			updates.projectId = itemIdMap.get(event.projectId as number) || null;
		}
		if (event.recurrenceId && typeof event.recurrenceId === 'number') {
			updates.recurrenceId = eventIdMap.get(event.recurrenceId as number) || null;
		}
		if (Object.keys(updates).length > 0) {
			await trans.table('events').update(event.id, updates);
		}
	}
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
