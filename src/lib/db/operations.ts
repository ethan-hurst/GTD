import { db, type GTDItem, type Context } from './schema';

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

// ============================================================================
// Context Operations
// ============================================================================

export async function getAllContexts(): Promise<Context[]> {
	return await db.contexts.orderBy('sortOrder').toArray();
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

	// Delete the context
	await db.contexts.delete(id);
}

// ============================================================================
// Action Operations
// ============================================================================

export async function getAllNextActions(): Promise<GTDItem[]> {
	const actions = await db.items
		.where('type')
		.equals('next-action')
		.filter(item => !item.completedAt)
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
			return !item.completedAt && !!item.context && contexts.includes(item.context);
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
		.filter(item => !item.completedAt)
		.sortBy('created');
}

export async function getActionsByProject(projectId: number): Promise<GTDItem[]> {
	return await db.items
		.where('type')
		.equals('next-action')
		.filter(item => !item.completedAt && item.projectId === projectId)
		.toArray();
}

export async function getStalledProjects(): Promise<GTDItem[]> {
	// Use 2-query pattern to avoid N+1
	const projects = await db.items
		.where('type')
		.equals('project')
		.filter(item => !item.completedAt)
		.toArray();

	const actionsWithProject = await db.items
		.where('type')
		.equals('next-action')
		.filter(item => !item.completedAt && item.projectId !== undefined)
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
