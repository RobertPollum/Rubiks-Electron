// This device's sync state: who is signed in, whether automatic sync is on,
// and the last server revision seen. Kept apart from the game data, which is
// what gets synced.
//
// NOTE: the access token is kept in localStorage. That's normal for a
// website but the desktop app should move it to Electron's safeStorage;
// see docs/sign-in-checklist.md.

import type { Session } from './auth';

export interface SyncState {
    /** Sync automatically on this device. */
    enabled: boolean;
    session: Session | null;
    /** Account whose data is on this device, so signing in as someone else doesn't mix data. */
    lastAccountId: string | null;
    /** Server revision this device last synced with. */
    revision: number;
    lastSyncedAt: string | null;
}

export interface SyncStateStore {
    get(): SyncState;
    update(changes: Partial<SyncState>): SyncState;
}

export const SYNC_STATE_KEY = 'rubiksCubeSync';

const DEFAULT_STATE: SyncState = { enabled: true, session: null, lastAccountId: null, revision: 0, lastSyncedAt: null };

export function createSyncStateStore(storage: Storage = window.localStorage, key: string = SYNC_STATE_KEY): SyncStateStore {
    let state: SyncState = { ...DEFAULT_STATE };
    try {
        const raw = storage.getItem(key);
        if (raw) state = { ...DEFAULT_STATE, ...JSON.parse(raw) };
    } catch {
        // Unreadable: start signed out
    }
    return {
        get: () => state,
        update(changes) {
            state = { ...state, ...changes };
            try {
                storage.setItem(key, JSON.stringify(state));
            } catch (err) {
                console.error('Failed to save sync state:', err);
            }
            return state;
        }
    };
}

/** In-memory store, for tests. */
export function createMemorySyncStateStore(initial: Partial<SyncState> = {}): SyncStateStore {
    let state: SyncState = { ...DEFAULT_STATE, ...initial };
    return { get: () => state, update: changes => (state = { ...state, ...changes }) };
}
