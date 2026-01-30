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
}

export interface GTDList {
	id: number;
	name: string;
	type: string;
}

export const db = new Dexie("GTDDatabase") as Dexie & {
	items: EntityTable<GTDItem, "id">;
	lists: EntityTable<GTDList, "id">;
};

db.version(1).stores({
	items: "++id, type, created, modified",
	lists: "++id, name, type"
});

db.version(2).stores({
	items: "++id, type, created, modified, *searchWords, context, projectId",
	lists: "++id, name, type"
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
