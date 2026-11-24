// Picks the platform services for wherever the app is running.
//
// Today both targets share the browser implementations. This is the single
// place to branch when Electron gets file-based storage or native dialogs,
// or the web build gets an account-backed API adapter.

import { createLocalStorageAdapter } from './localStorageAdapter';
import { downloadJson, pickTextFile } from './fileTransfer';

/** True when running inside Electron (the preload script exposes `versions`). */
export function isElectron() {
    return typeof window !== 'undefined' && typeof window.versions === 'object' && window.versions !== null;
}

export function describePlatform() {
    if (isElectron()) {
        const v = window.versions;
        return `This app is using Chrome (v${v.chrome()}), Node.js (v${v.node()}), and Electron (v${v.electron()})`;
    }
    return '';
}

export function createPlatform() {
    return {
        kind: isElectron() ? 'electron' : 'web',
        storage: createLocalStorageAdapter(),
        files: { downloadJson, pickTextFile },
        describe: describePlatform
    };
}
