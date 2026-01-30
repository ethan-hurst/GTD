export class StorageStatus {
	isPersistent = $state(false);
	quota = $state(0);
	usage = $state(0);
	lastSaveTime = $state<Date | null>(null);
	lastCheck = $state<Date | null>(null);

	async checkPersistence() {
		if (navigator.storage && navigator.storage.persisted) {
			this.isPersistent = await navigator.storage.persisted();
		}
	}

	async requestPersistence(): Promise<boolean> {
		if (navigator.storage && navigator.storage.persist) {
			const granted = await navigator.storage.persist();
			this.isPersistent = granted;
			return granted;
		}
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
