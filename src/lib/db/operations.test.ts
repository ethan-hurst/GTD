import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './schema';
import { addItem, updateItem, deleteItem, getItem, getAllInbox } from './operations';

// Fresh database before each test
// The global setup.ts handles IndexedDB cleanup, but we need to re-open the database
beforeEach(async () => {
	// Close the database first to avoid transaction conflicts
	if (db.isOpen()) {
		db.close();
	}
	// Delete and re-open
	await db.delete();
	await db.open();
});

describe('addItem', () => {
	it('creates item with UUID id', async () => {
		const id = await addItem({
			title: 'Test item',
			type: 'inbox',
			notes: ''
		});

		expect(id).toBeDefined();
		expect(typeof id).toBe('string');
		expect(id.length).toBeGreaterThan(0);
	});

	it('sets dates automatically', async () => {
		const before = new Date();
		const id = await addItem({
			title: 'Test item',
			type: 'inbox',
			notes: ''
		});
		const after = new Date();

		const item = await getItem(id);
		expect(item).toBeDefined();
		expect(item!.created).toBeInstanceOf(Date);
		expect(item!.modified).toBeInstanceOf(Date);
		expect(item!.created.getTime()).toBeGreaterThanOrEqual(before.getTime());
		expect(item!.created.getTime()).toBeLessThanOrEqual(after.getTime());
	});

	it('item is retrievable after creation', async () => {
		const id = await addItem({
			title: 'Test item',
			type: 'inbox',
			notes: 'Test notes'
		});

		const item = await getItem(id);
		expect(item).toBeDefined();
		expect(item!.id).toBe(id);
		expect(item!.title).toBe('Test item');
		expect(item!.notes).toBe('Test notes');
	});

	it('preserves item type', async () => {
		const inboxId = await addItem({
			title: 'Inbox item',
			type: 'inbox',
			notes: ''
		});
		const actionId = await addItem({
			title: 'Action item',
			type: 'next-action',
			notes: ''
		});

		const inbox = await getItem(inboxId);
		const action = await getItem(actionId);

		expect(inbox!.type).toBe('inbox');
		expect(action!.type).toBe('next-action');
	});
});

describe('updateItem', () => {
	it('updates title', async () => {
		const id = await addItem({
			title: 'Original title',
			type: 'inbox',
			notes: ''
		});

		await updateItem(id, { title: 'Updated title' });

		const item = await getItem(id);
		expect(item!.title).toBe('Updated title');
	});

	it('partial updates preserve other fields', async () => {
		const id = await addItem({
			title: 'Test item',
			type: 'inbox',
			notes: 'Original notes'
		});

		await updateItem(id, { title: 'New title' });

		const item = await getItem(id);
		expect(item!.title).toBe('New title');
		expect(item!.notes).toBe('Original notes');
		expect(item!.type).toBe('inbox');
	});

	it('returns update count', async () => {
		const id = await addItem({
			title: 'Test item',
			type: 'inbox',
			notes: ''
		});

		const count = await updateItem(id, { title: 'Updated' });
		expect(count).toBe(1);

		const countNonExistent = await updateItem('non-existent-id', { title: 'Test' });
		expect(countNonExistent).toBe(0);
	});

	it('updates modified timestamp', async () => {
		const id = await addItem({
			title: 'Test item',
			type: 'inbox',
			notes: ''
		});

		const originalItem = await getItem(id);
		const originalModified = originalItem!.modified.getTime();

		// Small delay to ensure timestamp difference
		await new Promise(resolve => setTimeout(resolve, 10));

		await updateItem(id, { title: 'Updated' });

		const updatedItem = await getItem(id);
		expect(updatedItem!.modified.getTime()).toBeGreaterThan(originalModified);
	});
});

describe('deleteItem (soft-delete)', () => {
	it('sets deleted flag to true', async () => {
		const id = await addItem({
			title: 'Test item',
			type: 'inbox',
			notes: ''
		});

		await deleteItem(id);

		const item = await getItem(id);
		expect(item!.deleted).toBe(true);
	});

	it('sets deletedAt timestamp', async () => {
		const id = await addItem({
			title: 'Test item',
			type: 'inbox',
			notes: ''
		});

		const before = new Date();
		await deleteItem(id);
		const after = new Date();

		const item = await getItem(id);
		expect(item!.deletedAt).toBeInstanceOf(Date);
		expect(item!.deletedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
		expect(item!.deletedAt!.getTime()).toBeLessThanOrEqual(after.getTime());
	});

	it('updates modified timestamp', async () => {
		const id = await addItem({
			title: 'Test item',
			type: 'inbox',
			notes: ''
		});

		const originalItem = await getItem(id);
		const originalModified = originalItem!.modified.getTime();

		await new Promise(resolve => setTimeout(resolve, 10));

		await deleteItem(id);

		const deletedItem = await getItem(id);
		expect(deletedItem!.modified.getTime()).toBeGreaterThan(originalModified);
	});

	it('item still exists in database', async () => {
		const id = await addItem({
			title: 'Test item',
			type: 'inbox',
			notes: ''
		});

		await deleteItem(id);

		const item = await getItem(id);
		expect(item).toBeDefined();
		expect(item!.id).toBe(id);
		expect(item!.title).toBe('Test item');
	});
});

describe('getItem', () => {
	it('returns item by ID', async () => {
		const id = await addItem({
			title: 'Test item',
			type: 'inbox',
			notes: 'Test notes'
		});

		const item = await getItem(id);
		expect(item).toBeDefined();
		expect(item!.id).toBe(id);
		expect(item!.title).toBe('Test item');
	});

	it('returns undefined for non-existent ID', async () => {
		const item = await getItem('non-existent-id');
		expect(item).toBeUndefined();
	});
});

describe('getAllInbox', () => {
	it('returns only inbox type items', async () => {
		await addItem({ title: 'Inbox 1', type: 'inbox', notes: '' });
		await addItem({ title: 'Action 1', type: 'next-action', notes: '' });
		await addItem({ title: 'Inbox 2', type: 'inbox', notes: '' });

		const inbox = await getAllInbox();

		expect(inbox.length).toBe(2);
		expect(inbox.every(item => item.type === 'inbox')).toBe(true);
	});

	it('excludes deleted items', async () => {
		const id1 = await addItem({ title: 'Inbox 1', type: 'inbox', notes: '' });
		await addItem({ title: 'Inbox 2', type: 'inbox', notes: '' });

		await deleteItem(id1);

		const inbox = await getAllInbox();

		expect(inbox.length).toBe(1);
		expect(inbox[0].title).toBe('Inbox 2');
	});

	it('returns empty array when no inbox items', async () => {
		await addItem({ title: 'Action 1', type: 'next-action', notes: '' });
		await addItem({ title: 'Project 1', type: 'project', notes: '' });

		const inbox = await getAllInbox();

		expect(inbox).toEqual([]);
	});

	it('returns items sorted by created date', async () => {
		const id1 = await addItem({ title: 'Inbox 1', type: 'inbox', notes: '' });
		await new Promise(resolve => setTimeout(resolve, 10));
		const id2 = await addItem({ title: 'Inbox 2', type: 'inbox', notes: '' });
		await new Promise(resolve => setTimeout(resolve, 10));
		const id3 = await addItem({ title: 'Inbox 3', type: 'inbox', notes: '' });

		const inbox = await getAllInbox();

		expect(inbox.length).toBe(3);
		expect(inbox[0].id).toBe(id1);
		expect(inbox[1].id).toBe(id2);
		expect(inbox[2].id).toBe(id3);
	});
});
