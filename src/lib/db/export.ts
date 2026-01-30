import { db } from './schema';

export async function exportDatabase(): Promise<string> {
	const exportData: Record<string, any[]> = {};
	for (const table of db.tables) {
		exportData[table.name] = await table.toArray();
	}
	return JSON.stringify({
		version: db.verno,
		exported: new Date().toISOString(),
		data: exportData
	}, null, 2);
}

export async function importDatabase(jsonData: string): Promise<void> {
	const imported = JSON.parse(jsonData);
	if (!imported.data) {
		throw new Error('Invalid backup file: missing data property');
	}

	await db.transaction('rw', db.tables, async () => {
		for (const table of db.tables) {
			await table.clear();
		}
		for (const tableName in imported.data) {
			const table = db.table(tableName);
			if (table) {
				await table.bulkPut(imported.data[tableName]);
			}
		}
	});
}

export function downloadJSON(data: string, filename: string): void {
	const blob = new Blob([data], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}
