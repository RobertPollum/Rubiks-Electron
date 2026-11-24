// Picks the platform services for wherever the app is running.
//
// Electron saves game data to a file (through the preload bridge); the web
// build uses localStorage. This is the single place to branch for future
// targets, e.g. an account-backed API adapter for the website.

import { createLocalStorageAdapter } from './localStorageAdapter';
import { createElectronFileAdapter } from './electronFileAdapter';
import { downloadJson, pickTextFile } from './fileTransfer';
import type { Platform, SyncServices } from './types';
import { createHttpSyncClient } from './syncClient';
import { createDevAuthProvider } from './auth';
import { createSyncStateStore } from './syncState';

export type { Platform, StorageAdapter, FileTransfer, SyncServices } from './types';

/** True when running inside Electron (the preload script exposes `versions`). */
export function isElectron(): boolean {
    return typeof window !== 'undefined' && typeof window.versions === 'object' && window.versions !== null;
}

export function describePlatform(): string {
    const v = window.versions;
    if (v) {
        return `This app is using Chrome (v${v.chrome()}), Node.js (v${v.node()}), and Electron (v${v.electron()})`;
    }
    return '';
}

/** Sync services, if this build was given a sync API URL. */
function createSyncServices(): SyncServices | null {
    const apiUrl = import.meta.env.VITE_SYNC_API_URL;
    if (!apiUrl) return null;
    const client = createHttpSyncClient(apiUrl);
    // Real OAuth providers go here (docs/sign-in-checklist.md).
    const auth = import.meta.env.VITE_SYNC_DEV_AUTH === 'true' ? createDevAuthProvider(client) : null;
    return { client, auth, state: createSyncStateStore() };
}

export function createPlatform(): Platform {
    return {
        kind: isElectron() ? 'electron' : 'web',
        storage: window.rubiksStorage ? createElectronFileAdapter(window.rubiksStorage) : createLocalStorageAdapter(),
        files: { downloadJson, pickTextFile },
        describe: describePlatform,
        sync: createSyncServices()
    };
}
