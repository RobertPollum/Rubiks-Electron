// Signing in. A sign-in provider turns a user action into a Session
// (an access token for the sync API plus who it belongs to).
//
// Real OAuth providers (Google, GitHub, Apple, Microsoft...) are not built
// yet: see docs/sign-in-checklist.md. Until then, development builds can use
// the dev provider below with the mock sync server.

import type { Account, SyncClient } from './syncClient';

export interface Session {
    /** Bearer token for the sync API. */
    token: string;
    account: Account;
    /** Which provider created it, e.g. "dev" or "google". */
    provider: string;
}

export interface AuthProvider {
    id: string;
    /** Button text, e.g. "Sign in with Google". */
    label: string;
    /** Run the sign-in flow. Resolves null if the user cancels. */
    signIn(): Promise<Session | null>;
    /** Revoke the session with the provider, if it supports that. */
    signOut?(session: Session): Promise<void>;
}

/**
 * DEVELOPMENT ONLY. Asks for a name and signs in as that user on the mock
 * sync server (which accepts tokens of the form "dev:<name>"). A real API
 * must reject these tokens.
 */
export function createDevAuthProvider(client: SyncClient, ask: (question: string) => string | null = q => window.prompt(q)): AuthProvider {
    return {
        id: 'dev',
        label: 'Sign in (development)',
        async signIn() {
            const name = ask('Development sign-in. Name to sign in as:')?.trim();
            if (!name) return null;
            const token = `dev:${name}`;
            const account = await client.me(token);
            return { token, account, provider: 'dev' };
        }
    };
}
