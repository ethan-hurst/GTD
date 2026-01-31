export class StorageStatus {
	persistenceState = $state<'UNKNOWN' | 'GRANTED' | 'DENIED'>('UNKNOWN');
	quota = $state(0);
	usage = $state(0);
	lastSaveTime = $state<Date | null>(null);
	lastCheck = $state<Date | null>(null);

	async checkPersistence() {
		if (navigator.storage && navigator.storage.persisted) {
			const isPersisted = await navigator.storage.persisted();
			if (isPersisted) {
				this.persistenceState = 'GRANTED';
				console.log('[Storage] Persistence check: GRANTED (storage is already persistent)');
			} else {
				// Storage is not persistent, but we don't know if a request would be denied
				// Keep as UNKNOWN unless explicitly denied via requestPersistence
				console.log('[Storage] Persistence check: not persistent (state remains UNKNOWN)');
			}
		} else {
			console.log('[Storage] Persistence check: Storage API not available');
		}
	}

	async requestPersistence(): Promise<boolean> {
		if (navigator.storage && navigator.storage.persist) {
			const granted = await navigator.storage.persist();
			if (granted) {
				this.persistenceState = 'GRANTED';
				console.log('[Storage] Persistence request: GRANTED');
			} else {
				this.persistenceState = 'DENIED';
				console.log('[Storage] Persistence request: DENIED');
			}
			return granted;
		}
		console.log('[Storage] Persistence request: Storage API not available');
		return false;
	}

	async updateQuota() {
		if (navigator.storage && navigator.storage.estimate) {
			const estimate = await navigator.storage.estimate();
			this.quota = estimate.quota || 0;
			this.usage = estimate.usage || 0;
			this.lastCheck = new Date();
		}
	}

	recordSave() {
		this.lastSaveTime = new Date();
	}
}

export const storageStatus = new StorageStatus();
