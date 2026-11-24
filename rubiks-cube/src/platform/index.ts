// Picks the platform services for wherever the app is running.
//
// Electron saves game data to a file (through the preload bridge); the web
// build uses localStorage. This is the single place to branch for future
// targets, e.g. an account-backed API adapter for the website.

import { createLocalStorageAdapter } from './localStorageAdapter';
import { createElectronFileAdapter } from './electronFileAdapter';
import { downloadJson, pickTextFile } from './fileTransfer';
import type { Platform } from './types';

export type { Platform, StorageAdapter, FileTransfer } from './types';

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

export function createPlatform(): Platform {
    return {
        kind: isElectron() ? 'electron' : 'web',
        storage: window.rubiksStorage ? createElectronFileAdapter(window.rubiksStorage) : createLocalStorageAdapter(),
        files: { downloadJson, pickTextFile },
        describe: describePlatform
    };
}
