import { describe, it, expect, vi } from 'vitest';
import { createSyncEngine } from './syncEngine';
import { createMemorySyncStateStore } from '../platform/syncState';
import { SyncError, type SyncClient, type RemoteData } from '../platform/syncClient';
import type { AuthProvider } from '../platform/auth';
import { createDefaultData } from '../core/gameData';
import type { GameData, SolveRecord } from '../core/types';

/** In-memory server following docs/sync-api.md, plus switches to simulate trouble. */
function fakeServer() {
    const store = new Map<string, { revision: number; data: GameData }>();
    const server = {
        store,
        offline: false,
        /** Run before the next PUT is applied (simulates another device saving first). */
        beforeNextPut: null as null | (() => void),
        client: {
            async me(token) {
                if (!token.startsWith('dev:')) throw new SyncError('unauthorized', 'bad token');
                return { id: token.slice(4), displayName: token.slice(4) };
            },
            async getData(token): Promise<RemoteData> {
                if (server.offline) throw new SyncError('offline', 'offline');
                const id = (await server.client.me(token)).id;
                const entry = store.get(id);
                return entry ? { revision: entry.revision, updatedAt: 'x', data: structuredClone(entry.data) } : { revision: 0, updatedAt: null, data: null };
            },
            async putData(token, baseRevision, data) {
                if (server.offline) throw new SyncError('offline', 'offline');
                const id = (await server.client.me(token)).id;
                const hook = server.beforeNextPut;
                server.beforeNextPut = null;
                hook?.();
                const current = store.get(id);
                if ((current?.revision ?? 0) !== baseRevision) {
                    throw new SyncError('conflict', 'conflict', { revision: current!.revision, updatedAt: 'x', data: structuredClone(current!.data) });
                }
                const revision = baseRevision + 1;
                store.set(id, { revision, data: structuredClone(data) });
                return { revision, updatedAt: 'x' };
            }
        } as SyncClient
    };
    return server;
}

const solve = (id: string, at: string): SolveRecord => ({ id, solvedAt: at, moves: 10, timestamp: 't', date: 'd' });

/** A device: local data plus a sync engine. */
function device(server: ReturnType<typeof fakeServer>, local: GameData = createDefaultData(), opts: { busy?: () => boolean } = {}) {
    const d = {
        data: local,
        state: createMemorySyncStateStore(),
        engine: null as unknown as ReturnType<typeof createSyncEngine>,
        signInAs(name: string) {
            const provider: AuthProvider = { id: 'dev', label: 'dev', signIn: async () => ({ token: `dev:${name}`, account: await server.client.me(`dev:${name}`), provider: 'dev' }) };
            return d.engine.signIn(provider);
        }
    };
    d.engine = createSyncEngine({
        client: server.client,
        state: d.state,
        getLocal: () => d.data,
        applyRemote: data => {
            if (opts.busy?.()) return false;
            d.data = structuredClone(data);
            return true;
        },
        events: null,
        interval: 0
    });
    return d;
}

describe('sync engine', () => {
    it('first sign-in uploads this device\'s progress', async () => {
        const server = fakeServer();
        const a = device(server, { ...createDefaultData(), solves: [solve('s1', '2026-01-01')] });
        expect(await a.signInAs('robert')).toBe(true);
        expect(server.store.get('robert')?.data.solves.map(s => s.id)).toEqual(['s1']);
        expect(a.engine.getStatus().kind).toBe('synced');
        expect(a.state.get().revision).toBe(1);
    });

    it('a second device gets the account data, and both stay merged', async () => {
        const server = fakeServer();
        const a = device(server, { ...createDefaultData(), solves: [solve('a1', '2026-01-01')] });
        await a.signInAs('robert');
        const b = device(server, { ...createDefaultData(), solves: [solve('b1', '2026-01-02')] });
        await b.signInAs('robert');
        expect(b.data.solves.map(s => s.id)).toEqual(['a1', 'b1']);

        await a.engine.syncNow();
        expect(a.data.solves.map(s => s.id)).toEqual(['a1', 'b1']);
        expect(a.data.stats.totalSolves).toBe(2);
    });

    it('settings follow the most recent change across devices', async () => {
        const server = fakeServer();
        const a = device(server);
        const b = device(server);
        await a.signInAs('robert');
        await b.signInAs('robert');
        a.data = { ...a.data, settingsUpdatedAt: '2026-02-01T00:00:00Z', settings: { ...a.data.settings, theme: 'pastel' } };
        await a.engine.syncNow();
        await b.engine.syncNow();
        expect(b.data.settings.theme).toBe('pastel');
    });

    it('retries after a conflict and keeps both devices\' changes', async () => {
        const server = fakeServer();
        const a = device(server);
        await a.signInAs('robert');
        a.data = { ...a.data, solves: [solve('a', '2026-01-01')] };
        // Another device saves between A reading and A writing
        server.beforeNextPut = () => {
            const current = server.store.get('robert')!;
            server.store.set('robert', { revision: current.revision + 1, data: { ...current.data, solves: [solve('b', '2026-01-02')] } });
        };
        const put = vi.spyOn(server.client, 'putData');
        await a.engine.syncNow();
        expect(put).toHaveBeenCalledTimes(2); // first attempt got 409
        expect(server.store.get('robert')?.data.solves.map(s => s.id)).toEqual(['a', 'b']);
        expect(a.data.solves.map(s => s.id)).toEqual(['a', 'b']);
        expect(a.state.get().revision).toBe(3);
        expect(a.engine.getStatus().kind).toBe('synced');
    });

    it('signing in as a different account replaces, not merges, local data', async () => {
        const server = fakeServer();
        const d = device(server, { ...createDefaultData(), solves: [solve('mine', '2026-01-01')] });
        await d.signInAs('alice');
        await d.engine.signOut();
        await d.signInAs('bob');
        expect(d.data.solves).toEqual([]);
        expect(server.store.get('bob')?.data.solves).toEqual([]);
        expect(server.store.get('alice')?.data.solves.map(s => s.id)).toEqual(['mine']);
    });

    it('reports offline and recovers', async () => {
        const server = fakeServer();
        const d = device(server);
        await d.signInAs('robert');
        server.offline = true;
        await d.engine.syncNow();
        expect(d.engine.getStatus().kind).toBe('offline');
        server.offline = false;
        await d.engine.syncNow();
        expect(d.engine.getStatus().kind).toBe('synced');
    });

    it('treats a rejected token as signed out and keeps local data', async () => {
        const server = fakeServer();
        const d = device(server, { ...createDefaultData(), solves: [solve('keep', '2026-01-01')] });
        d.state.update({ session: { token: 'expired', account: { id: 'x', displayName: 'x' }, provider: 'dev' } });
        await d.engine.syncNow();
        expect(d.engine.getStatus().kind).toBe('signed-out');
        expect(d.state.get().session).toBeNull();
        expect(d.data.solves).toHaveLength(1);
    });

    it('waits while the app is busy instead of changing the cube mid-move', async () => {
        vi.useFakeTimers();
        try {
            const server = fakeServer();
            const a = device(server, { ...createDefaultData(), solves: [solve('a', '2026-01-01')] });
            await a.signInAs('robert');
            let busy = true;
            const b = device(server, createDefaultData(), { busy: () => busy });
            await b.signInAs('robert');
            expect(b.engine.getStatus().kind).toBe('waiting');
            expect(b.data.solves).toHaveLength(0);
            busy = false;
            await vi.advanceTimersByTimeAsync(3500);
            expect(b.data.solves).toHaveLength(1);
        } finally {
            vi.useRealTimers();
        }
    });

    it('does nothing automatically when turned off, but Sync now still works', async () => {
        vi.useFakeTimers();
        try {
            const server = fakeServer();
            const d = device(server);
            await d.signInAs('robert');
            d.engine.setEnabled(false);
            d.data = { ...d.data, solves: [solve('x', '2026-01-01')] };
            d.engine.notifyLocalChange();
            await vi.advanceTimersByTimeAsync(5000);
            expect(server.store.get('robert')?.data.solves).toEqual([]);
            await d.engine.syncNow();
            expect(server.store.get('robert')?.data.solves).toHaveLength(1);
        } finally {
            vi.useRealTimers();
        }
    });
});
