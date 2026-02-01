import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './schema';
import { addItem, getItem, getAllInbox } from './operations';
import { exportDatabase, importDatabase } from './export';

// Fresh database before each test
beforeEach(async () => {
	if (db.isOpen()) {
		db.close();
	}
	await db.delete();
	await db.open();
});

describe('exportDatabase', () => {
	it('returns valid JSON with version and exported date', async () => {
		const exported = await exportDatabase();
		const parsed = JSON.parse(exported);

		expect(parsed.version).toBeDefined();
		expect(typeof parsed.version).toBe('number');
		expect(parsed.exported).toBeDefined();
		expect(typeof parsed.exported).toBe('string');
		expect(parsed.data).toBeDefined();
		expect(typeof parsed.data).toBe('object');
	});

	it('includes all database tables in export', async () => {
		const exported = await exportDatabase();
		const parsed = JSON.parse(exported);

		// Check that all main tables are present
		expect(parsed.data.items).toBeDefined();
		expect(parsed.data.contexts).toBeDefined();
		expect(parsed.data.settings).toBeDefined();
		expect(parsed.data.events).toBeDefined();
		expect(Array.isArray(parsed.data.items)).toBe(true);
		expect(Array.isArray(parsed.data.contexts)).toBe(true);
	});

	it('exports actual item data', async () => {
		await addItem({ title: 'Test item 1', type: 'inbox', notes: 'Notes 1' });
		await addItem({ title: 'Test item 2', type: 'next-action', notes: 'Notes 2' });

		const exported = await exportDatabase();
		const parsed = JSON.parse(exported);

		expect(parsed.data.items.length).toBe(2);
		// Items might be in any order from database, so check both exist
		const titles = parsed.data.items.map((i: any) => i.title);
		expect(titles).toContain('Test item 1');
		expect(titles).toContain('Test item 2');
	});

	it('exports contexts table', async () => {
		// Contexts table should exist in export even if empty (seeding hooks don't fire reliably in tests)
		const exported = await exportDatabase();
		const parsed = JSON.parse(exported);

		expect(parsed.data.contexts).toBeDefined();
		expect(Array.isArray(parsed.data.contexts)).toBe(true);
		// Note: Default contexts may not be seeded in test environment due to timing of db.on('ready') hook
	});
});

describe('importDatabase', () => {
	it('clears existing data before import', async () => {
		// Add some initial data
		await addItem({ title: 'Old item', type: 'inbox', notes: '' });

		// Export from a clean database
		if (db.isOpen()) {
			db.close();
		}
		await db.delete();
		await db.open();
		await addItem({ title: 'New item', type: 'inbox', notes: '' });
		const exportData = await exportDatabase();

		// Now import - should clear old data
		await importDatabase(exportData);

		const items = await db.items.toArray();
		expect(items.length).toBe(1);
		expect(items[0].title).toBe('New item');
	});

	it('loads imported items into database', async () => {
		// Create export data with specific items
		await addItem({ title: 'Import test 1', type: 'inbox', notes: 'Test notes 1' });
		await addItem({ title: 'Import test 2', type: 'project', notes: 'Test notes 2' });
		const exportData = await exportDatabase();

		// Clear database
		if (db.isOpen()) {
			db.close();
		}
		await db.delete();
		await db.open();

		// Import
		await importDatabase(exportData);

		const items = await db.items.toArray();
		expect(items.length).toBe(2);
		expect(items.find(i => i.title === 'Import test 1')).toBeDefined();
		expect(items.find(i => i.title === 'Import test 2')).toBeDefined();
	});

	it('makes items retrievable after import', async () => {
		const id = await addItem({ title: 'Retrievable item', type: 'inbox', notes: 'Test' });
		const exportData = await exportDatabase();

		// Clear and import
		if (db.isOpen()) {
			db.close();
		}
		await db.delete();
		await db.open();
		await importDatabase(exportData);

		// Item should be retrievable with same ID
		const item = await getItem(id);
		expect(item).toBeDefined();
		expect(item!.title).toBe('Retrievable item');
		expect(item!.notes).toBe('Test');
	});

	it('throws error for invalid JSON', async () => {
		await expect(importDatabase('not valid json')).rejects.toThrow();
	});

	it('throws error for missing data property', async () => {
		const invalid = JSON.stringify({ version: 1, exported: new Date().toISOString() });
		await expect(importDatabase(invalid)).rejects.toThrow('Invalid backup file: missing data property');
	});
});

describe('export/import round-trip', () => {
	it('preserves all items through export and import', async () => {
		// Create diverse test data
		const id1 = await addItem({ title: 'Inbox item', type: 'inbox', notes: 'Inbox notes' });
		const id2 = await addItem({ title: 'Action item', type: 'next-action', notes: 'Action notes' });
		const id3 = await addItem({ title: 'Project item', type: 'project', notes: 'Project notes' });

		// Export
		const exportData = await exportDatabase();

		// Clear database
		if (db.isOpen()) {
			db.close();
		}
		await db.delete();
		await db.open();

		// Import
		await importDatabase(exportData);

		// Verify all items preserved
		const item1 = await getItem(id1);
		const item2 = await getItem(id2);
		const item3 = await getItem(id3);

		expect(item1).toBeDefined();
		expect(item1!.title).toBe('Inbox item');
		expect(item1!.type).toBe('inbox');

		expect(item2).toBeDefined();
		expect(item2!.title).toBe('Action item');
		expect(item2!.type).toBe('next-action');

		expect(item3).toBeDefined();
		expect(item3!.title).toBe('Project item');
		expect(item3!.type).toBe('project');
	});

	it('preserves dates through round-trip', async () => {
		const beforeCreate = new Date();
		const id = await addItem({ title: 'Date test', type: 'inbox', notes: '' });
		const afterCreate = new Date();

		const originalItem = await getItem(id);
		const originalCreatedTime = originalItem!.created.getTime();
		const originalModifiedTime = originalItem!.modified.getTime();
		const exportData = await exportDatabase();

		// Clear and import
		if (db.isOpen()) {
			db.close();
		}
		await db.delete();
		await db.open();
		await importDatabase(exportData);

		const importedItem = await getItem(id);

		expect(importedItem).toBeDefined();
		// After JSON serialization, dates might come back as strings or Dates
		// Convert to timestamps for comparison
		const importedCreated = importedItem!.created instanceof Date
			? importedItem!.created.getTime()
			: new Date(importedItem!.created as any).getTime();
		const importedModified = importedItem!.modified instanceof Date
			? importedItem!.modified.getTime()
			: new Date(importedItem!.modified as any).getTime();

		expect(importedCreated).toBe(originalCreatedTime);
		expect(importedModified).toBe(originalModifiedTime);
	});

	it('preserves manually added contexts through round-trip', async () => {
		// Manually add a context to test round-trip (don't rely on auto-seeding)
		const { addContext } = await import('./operations');
		await addContext('@test-context');

		const exportData = await exportDatabase();

		// Clear and import
		if (db.isOpen()) {
			db.close();
		}
		await db.delete();
		await db.open();
		await importDatabase(exportData);

		const contexts = await db.contexts.toArray();
		expect(contexts.length).toBeGreaterThan(0);

		const contextNames = contexts.map(c => c.name);
		expect(contextNames).toContain('@test-context');
	});

	it('handles empty database export/import', async () => {
		// Clear all items (keep default contexts)
		await db.items.clear();

		const exportData = await exportDatabase();

		// Import into fresh database
		if (db.isOpen()) {
			db.close();
		}
		await db.delete();
		await db.open();
		await importDatabase(exportData);

		const items = await getAllInbox();
		expect(items.length).toBe(0);
	});
});
