import { getSetting, setSetting } from '../db/operations';
import { db } from '../db/schema';

export type Feature =
	| 'inbox'
	| 'next-actions'
	| 'projects'
	| 'waiting'
	| 'someday'
	| 'review'
	| 'calendar'
	| 'search'
	| 'keyboard-shortcuts'
	| 'settings';

const routeToFeature: Record<string, Feature> = {
	'/': 'inbox',
	'/actions': 'next-actions',
	'/projects': 'projects',
	'/waiting': 'waiting',
	'/someday': 'someday',
	'/review': 'review',
	'/calendar': 'calendar',
	'/settings': 'settings'
};

export async function markFeatureVisited(feature: Feature): Promise<void> {
	await setSetting(`feature_visited_${feature}`, true);
}

export async function hasVisitedFeature(feature: Feature): Promise<boolean> {
	const visited = await getSetting(`feature_visited_${feature}`);
	return !!visited;
}

export function getFeatureFromRoute(path: string): Feature | null {
	return routeToFeature[path] ?? null;
}

export async function getAllVisitedFeatures(): Promise<Set<Feature>> {
	const allSettings = await db.settings.toArray();
	const visitedFeatures = allSettings
		.filter(s => s.key.startsWith('feature_visited_') && s.value === true)
		.map(s => s.key.replace('feature_visited_', '') as Feature);

	return new Set(visitedFeatures);
}

export async function clearAllFeatureVisits(): Promise<void> {
	const allSettings = await db.settings.toArray();
	const featureKeys = allSettings.filter(s => s.key.startsWith('feature_visited_'));

	await Promise.all(
		featureKeys.map(setting => db.settings.delete(setting.id))
	);
}
