// Contracts for platform services. Each target (web, Electron, later a
// web API) provides its own implementations; the rest of the app only
// sees these interfaces.

import type { GameData } from '../core/types';
import type { SyncClient } from './syncClient';
import type { AuthProvider } from './auth';
import type { SyncStateStore } from './syncState';

/**
 * Somewhere the app can keep its data (browser localStorage, a file on disk
 * via Electron IPC, a remote API, ...). Async so network/IPC-backed
 * adapters fit without changing callers.
 */
export interface StorageAdapter {
    /** Short id, e.g. 'localStorage'. */
    readonly name: string;
    /** Saved data, or null if there is none or it can't be read. */
    load(): Promise<unknown>;
    /** Persist the full data object. */
    save(data: GameData): Promise<void>;
}

/** Moving files in and out of the app (theme import/export). */
export interface FileTransfer {
    downloadJson(filename: string, data: unknown): void;
    /** Resolves with the chosen file's text (never resolves if cancelled). */
    pickTextFile(accept?: string): Promise<string>;
}

export interface Platform {
    kind: 'electron' | 'web';
    storage: StorageAdapter;
    files: FileTransfer;
    /** One-line description shown at startup (e.g. Electron versions); may be empty. */
    describe(): string;
    /** Account sync, when this build has a sync API configured (VITE_SYNC_API_URL). */
    sync: SyncServices | null;
}

export interface SyncServices {
    client: SyncClient;
    /** How to sign in, or null if no sign-in method is available yet. */
    auth: AuthProvider | null;
    state: SyncStateStore;
}

/** What the Electron preload script exposes on `window`. */
export interface ElectronVersions {
    node(): string;
    chrome(): string;
    electron(): string;
}

/** File-backed storage the Electron preload exposes (see src/electron/fileStore.ts). */
export interface ElectronStorage {
    load(): Promise<unknown>;
    save(data: GameData): Promise<void>;
}

declare global {
    interface Window {
        /** Only present in Electron (see src/electron/preload.ts). */
        versions?: ElectronVersions;
        /** Only present in Electron (see src/electron/preload.ts). */
        rubiksStorage?: ElectronStorage;
    }
}
