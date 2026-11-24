// StorageAdapter backed by window.localStorage.
// Works in both the browser and the Electron renderer.

export const STORAGE_KEY = 'rubiksCubeGameData';

/** @returns {import('./storageAdapter').StorageAdapter} */
export function createLocalStorageAdapter(key = STORAGE_KEY, storage = window.localStorage) {
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
