import { db, type GTDItem } from './schema';

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
	await db.items.delete(id);
}

export async function getItem(id: number): Promise<GTDItem | undefined> {
	return await db.items.get(id);
}

export async function getAllInbox(): Promise<GTDItem[]> {
	return await db.items
		.where('type')
		.equals('inbox')
		.sortBy('created');
}

export async function getItemsByType(type: GTDItem['type']): Promise<GTDItem[]> {
	return await db.items
		.where('type')
		.equals(type)
		.toArray();
}

export async function bulkDeleteItems(ids: number[]): Promise<void> {
	await db.items.bulkDelete(ids);
}
