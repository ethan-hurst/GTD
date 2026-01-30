import { Dexie, type EntityTable } from "dexie";
import { tokenize } from "./search";

export interface GTDItem {
	id: number;
	title: string;
	type: 'inbox' | 'next-action' | 'project' | 'waiting' | 'someday';
	notes: string;
	created: Date;
	modified: Date;
	searchWords?: string[];
	context?: string;
	delegatedTo?: string;
	projectId?: number;
	completedAt?: Date;
	sortOrder?: number;
	followUpDate?: Date;
	category?: string;
}

export interface Context {
	id: number;
	name: string;       // e.g., "@computer", "@office"
	color?: string;     // Optional hex color for badge
	icon?: string;      // Optional icon identifier
	sortOrder: number;  // For sidebar ordering
	isDefault: boolean; // GTD defaults can't be deleted
	created: Date;
}

export interface GTDList {
	id: number;
	name: string;
	type: string;
}

export interface AppSettings {
	id: number;
	key: string;
	value: any;
	updatedAt: Date;
}

export interface CalendarEvent {
	id: number;
	title: string;
	startTime: Date;
	endTime: Date;
	allDay?: boolean;
	location?: string;
	notes?: string;
	color?: string;
	projectId?: number;
	source?: string;           // 'manual' | 'ics-import' | filename
	rrule?: string;            // RFC 5545 RRULE string
	recurrenceId?: number;     // Links to parent event for exceptions
	exceptionDates?: string[]; // ISO date strings for excluded occurrences
	created: Date;
	modified: Date;
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
	const defaults: Omit<Context, 'id'>[] = [
		{ name: '@computer', sortOrder: 0, isDefault: true, created: new Date() },
		{ name: '@office', sortOrder: 1, isDefault: true, created: new Date() },
		{ name: '@phone', sortOrder: 2, isDefault: true, created: new Date() },
		{ name: '@home', sortOrder: 3, isDefault: true, created: new Date() },
		{ name: '@errands', sortOrder: 4, isDefault: true, created: new Date() }
	];
	await db.contexts.bulkAdd(defaults as Context[]);
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
