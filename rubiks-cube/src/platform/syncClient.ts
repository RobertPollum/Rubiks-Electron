// HTTP client for the sync API (contract: docs/sync-api.md).
// Stateless: the caller passes the access token on every call.

import type { GameData } from '../core/types';

export interface Account {
    id: string;
    displayName: string;
    email?: string;
}

/** What the server has stored for an account. `data` is null until the first upload. */
export interface RemoteData {
    revision: number;
    updatedAt: string | null;
    data: GameData | null;
}

export type SyncErrorKind = 'unauthorized' | 'conflict' | 'offline' | 'server';

export class SyncError extends Error {
    constructor(
        readonly kind: SyncErrorKind,
        message: string,
        /** For conflicts: the server's current copy. */
        readonly remote?: RemoteData
    ) {
        super(message);
        this.name = 'SyncError';
    }
}

export interface SyncClient {
    me(token: string): Promise<Account>;
    getData(token: string): Promise<RemoteData>;
    /** Store `data` if the server is still at `baseRevision`. Throws SyncError('conflict') with the server's copy otherwise. */
    putData(token: string, baseRevision: number, data: GameData): Promise<{ revision: number; updatedAt: string }>;
}

export function createHttpSyncClient(baseUrl: string, fetchImpl: typeof fetch = (...args) => fetch(...args)): SyncClient {
    const root = baseUrl.replace(/\/+$/, '');

    async function request<T>(method: string, path: string, token: string, body?: unknown): Promise<T> {
        let response: Response;
        try {
            response = await fetchImpl(`${root}${path}`, {
                method,
                headers: {
                    Authorization: `Bearer ${token}`,
                    ...(body !== undefined ? { 'Content-Type': 'application/json' } : {})
                },
                body: body !== undefined ? JSON.stringify(body) : undefined
            });
        } catch {
            throw new SyncError('offline', 'Could not reach the sync server');
        }
        const payload = await response.json().catch(() => null);
        if (response.ok) return payload as T;
        if (response.status === 401) throw new SyncError('unauthorized', 'Signed out: please sign in again');
        if (response.status === 409) throw new SyncError('conflict', 'Another device saved first', payload as RemoteData);
        throw new SyncError('server', `Sync server error (${response.status})${payload?.error ? `: ${payload.error}` : ''}`);
    }

    return {
        me: token => request<Account>('GET', '/v1/me', token),
        getData: token => request<RemoteData>('GET', '/v1/data', token),
        putData: (token, baseRevision, data) =>
            request<{ revision: number; updatedAt: string }>('PUT', '/v1/data', token, { baseRevision, data })
    };
}
