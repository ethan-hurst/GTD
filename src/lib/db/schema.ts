import { Dexie, type EntityTable } from "dexie";

export interface GTDItem {
	id: number;
	title: string;
	type: 'inbox' | 'next-action' | 'project' | 'waiting' | 'someday';
	notes: string;
	created: Date;
	modified: Date;
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
