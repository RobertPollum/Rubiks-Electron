// Keeps this device's data in step with the signed-in account.
//
// This device's storage stays the main copy, so the app works offline;
// syncing merges it with the account's copy on the server (see
// docs/sync-api.md for the protocol and core/syncMerge.ts for the rules).
//
// Syncs automatically (on start, focus, coming back online, every few
// minutes, and shortly after local changes) unless turned off on this
// device. "Sync now" always works while signed in.

import { mergeGameData, sameData } from '../core/syncMerge';
import { createDefaultData } from '../core/gameData';
import type { GameData } from '../core/types';
import type { Session, AuthProvider } from '../platform/auth';
import { SyncError, type SyncClient, type Account } from '../platform/syncClient';
import type { SyncStateStore } from '../platform/syncState';

export type SyncStatusKind = 'signed-out' | 'off' | 'syncing' | 'synced' | 'waiting' | 'offline' | 'error';

export interface SyncStatus {
    kind: SyncStatusKind;
    /** Short human-readable description. */
    message: string;
}

export interface SyncEngineDeps {
    client: SyncClient;
    state: SyncStateStore;
    /** This device's current data. */
    getLocal(): GameData;
    /**
     * Replace this device's data with `data` (save it and refresh the app).
     * Return false if the app is busy (e.g. mid-replay); the sync is retried shortly.
     */
    applyRemote(data: GameData): boolean;
    onStatusChange?(status: SyncStatus): void;
    /** Delay before syncing local changes (ms). */
    pushDelay?: number;
    /** How often to sync while the app is open (ms). */
    interval?: number;
    /** Where to listen for focus/online events; null to skip (tests). */
    events?: Pick<Window, 'addEventListener'> | null;
}

const MAX_ATTEMPTS = 3;
const RETRY_WHEN_BUSY_MS = 3000;

export type SyncEngine = ReturnType<typeof createSyncEngine>;

export function createSyncEngine({
    client, state, getLocal, applyRemote, onStatusChange,
    pushDelay = 1000, interval = 5 * 60 * 1000, events = typeof window !== 'undefined' ? window : null
}: SyncEngineDeps) {
    let status: SyncStatus = initialStatus();
    let running: Promise<void> | null = null;
    let rerun = false;
    let pushTimer: ReturnType<typeof setTimeout> | undefined;
    /** Set when signing in as a different account than the data on this device. */
    let replaceLocal = false;

    function initialStatus(): SyncStatus {
        const { session, enabled, lastSyncedAt } = state.get();
        if (!session) return { kind: 'signed-out', message: 'Not signed in' };
        if (!enabled) return { kind: 'off', message: 'Automatic sync is off on this device' };
        return { kind: 'synced', message: lastSyncedAt ? `Last synced ${formatTime(lastSyncedAt)}` : 'Not synced yet' };
    }

    function setStatus(kind: SyncStatusKind, message: string) {
        status = { kind, message };
        onStatusChange?.(status);
    }

    const autoSyncOn = () => !!state.get().session && state.get().enabled;

    /** One full sync: read the server copy, merge, apply locally, upload if needed. */
    async function syncOnce(session: Session): Promise<void> {
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            const remote = await client.getData(session.token);
            const local = getLocal();
            const target = replaceLocal
                ? (remote.data ?? createDefaultData())
                : remote.data ? mergeGameData(local, remote.data) : local;

            if (!sameData(target, local) && !applyRemote(target)) {
                setStatus('waiting', 'Waiting to sync until the cube is idle');
                setTimeout(() => void sync(), RETRY_WHEN_BUSY_MS);
                return;
            }
            replaceLocal = false;

            let revision = remote.revision;
            if (!remote.data || !sameData(target, remote.data)) {
                try {
                    revision = (await client.putData(session.token, remote.revision, target)).revision;
                } catch (err) {
                    if (err instanceof SyncError && err.kind === 'conflict' && attempt < MAX_ATTEMPTS) continue;
                    throw err;
                }
            }
            const now = new Date().toISOString();
            state.update({ revision, lastSyncedAt: now, lastAccountId: session.account.id });
            setStatus('synced', `Synced ${formatTime(now)}`);
            return;
        }
    }

    /** Sync now (if signed in). Concurrent calls are coalesced. */
    function sync(): Promise<void> {
        const session = state.get().session;
        if (!session) return Promise.resolve();
        if (running) {
            rerun = true;
            return running;
        }
        setStatus('syncing', 'Syncing…');
        running = syncOnce(session)
            .catch(err => handleError(err))
            .finally(() => {
                running = null;
                if (rerun) {
                    rerun = false;
                    void sync();
                }
            });
        return running;
    }

    function handleError(err: unknown) {
        if (err instanceof SyncError) {
            if (err.kind === 'unauthorized') {
                state.update({ session: null });
                setStatus('signed-out', 'Signed out: please sign in again');
                return;
            }
            if (err.kind === 'offline') {
                setStatus('offline', 'Offline: will sync when the connection is back');
                return;
            }
        }
        console.error('Sync failed:', err);
        setStatus('error', `Sync failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    return {
        /** Begin automatic syncing (call once at startup). */
        start(): void {
            events?.addEventListener('focus', () => { if (autoSyncOn()) void sync(); });
            events?.addEventListener('online', () => { if (autoSyncOn()) void sync(); });
            if (interval > 0) setInterval(() => { if (autoSyncOn()) void sync(); }, interval);
            if (autoSyncOn()) void sync();
            else onStatusChange?.(status);
        },

        /** Call after every local save; syncs shortly afterwards if automatic sync is on. */
        notifyLocalChange(): void {
            if (!autoSyncOn()) return;
            clearTimeout(pushTimer);
            pushTimer = setTimeout(() => void sync(), pushDelay);
        },

        syncNow: (): Promise<void> => sync(),

        async signIn(provider: AuthProvider): Promise<boolean> {
            let session: Session | null;
            try {
                session = await provider.signIn();
            } catch (err) {
                handleError(err);
                return false;
            }
            if (!session) return false;
            const { lastAccountId } = state.get();
            replaceLocal = lastAccountId !== null && lastAccountId !== session.account.id;
            state.update({ session, revision: 0 });
            await sync();
            return true;
        },

        async signOut(provider?: AuthProvider | null): Promise<void> {
            const session = state.get().session;
            state.update({ session: null });
            if (session && provider?.signOut) await provider.signOut(session).catch(err => console.error(err));
            setStatus('signed-out', 'Not signed in');
        },

        setEnabled(enabled: boolean): void {
            state.update({ enabled });
            if (enabled) void sync();
            else setStatus('off', 'Automatic sync is off on this device');
        },

        getStatus: (): SyncStatus => status,
        getAccount: (): Account | null => state.get().session?.account ?? null,
        isEnabled: (): boolean => state.get().enabled
    };
}

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
