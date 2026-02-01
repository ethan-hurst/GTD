// Polyfill global indexedDB with fake-indexeddb for test isolation
import 'fake-indexeddb/auto';
import { beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';

// Reset IndexedDB between all tests to ensure test isolation
// Without this reset, data from one test can leak into another
beforeEach(() => {
	indexedDB = new IDBFactory();
});
