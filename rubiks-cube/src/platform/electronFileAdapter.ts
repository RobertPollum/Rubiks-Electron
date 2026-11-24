// StorageAdapter that saves to a file through the Electron preload API
// (see src/electron/fileStore.ts).
//
// Earlier versions of the desktop app kept data in localStorage. If the
// file doesn't exist yet, that data is loaded instead, and the next save
// writes it to the file.

import type { ElectronStorage, StorageAdapter } from './types';
import { createLocalStorageAdapter } from './localStorageAdapter';

export function createElectronFileAdapter(
    bridge: ElectronStorage,
    legacy: StorageAdapter = createLocalStorageAdapter()
): StorageAdapter {
    return {
        name: 'electronFile',

        async load() {
            try {
                const data = await bridge.load();
                if (data !== null && data !== undefined) return data;
            } catch (err) {
                console.error('Failed to load game data file:', err);
            }
            return legacy.load();
        },

        async save(data) {
            try {
                await bridge.save(data);
            } catch (err) {
                console.error('Failed to save game data file:', err);
            }
        }
    };
}
