// StorageAdapter backed by window.localStorage.
// Works in both the browser and the Electron renderer.

import type { StorageAdapter } from './types';

export const STORAGE_KEY = 'rubiksCubeGameData';

export function createLocalStorageAdapter(key: string = STORAGE_KEY, storage: Storage = window.localStorage): StorageAdapter {
    return {
        name: 'localStorage',

        async load() {
            try {
                const raw = storage.getItem(key);
                return raw ? JSON.parse(raw) : null;
            } catch (err) {
                console.error('Failed to load game data:', err);
                return null;
            }
        },

        async save(data) {
            try {
                storage.setItem(key, JSON.stringify(data));
            } catch (err) {
                console.error('Failed to save game data:', err);
            }
        }
    };
}
