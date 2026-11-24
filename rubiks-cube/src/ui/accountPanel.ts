// "Account & Sync" section of the settings modal.

import type { SyncEngine, SyncStatus } from '../app/syncEngine';
import type { AuthProvider } from '../platform/auth';

export interface AccountPanelDeps {
    /** Null when this build has no sync API configured. */
    engine: SyncEngine | null;
    /** Null when no sign-in method is available yet. */
    auth: AuthProvider | null;
}

export type AccountPanel = ReturnType<typeof createAccountPanel>;

export function createAccountPanel({ engine, auth }: AccountPanelDeps, doc: Document = document) {
    const $ = <T extends HTMLElement = HTMLElement>(id: string) => doc.getElementById(id) as T;
    const accountStatus = $('account-status');
    const signInBtn = $<HTMLButtonElement>('sign-in-btn');
    const signOutBtn = $<HTMLButtonElement>('sign-out-btn');
    const syncNowBtn = $<HTMLButtonElement>('sync-now-btn');
    const toggleRow = $('sync-toggle-row');
    const toggle = $<HTMLInputElement>('sync-enabled');
    const syncStatus = $('sync-status');

    function render(status: SyncStatus | null = engine?.getStatus() ?? null): void {
        if (!engine) {
            accountStatus.textContent = 'Cloud sync is not set up in this version of the app.';
            for (const el of [signInBtn, signOutBtn, syncNowBtn, toggleRow, syncStatus]) el.hidden = true;
            return;
        }
        const account = engine.getAccount();
        accountStatus.textContent = account
            ? `Signed in as ${account.displayName}. Your progress and settings are backed up to your account.`
            : 'Sign in to back up your progress and settings, and use them on other devices.';
        signInBtn.hidden = !!account;
        signInBtn.disabled = !auth;
        signInBtn.textContent = auth ? auth.label : 'Sign-in is coming soon';
        signOutBtn.hidden = syncNowBtn.hidden = toggleRow.hidden = !account;
        toggle.checked = engine.isEnabled();
        syncStatus.hidden = !account;
        syncStatus.textContent = status?.message ?? '';
        syncNowBtn.disabled = status?.kind === 'syncing';
    }

    signInBtn.addEventListener('click', async () => {
        if (!engine || !auth) return;
        signInBtn.disabled = true;
        await engine.signIn(auth);
        render();
    });
    signOutBtn.addEventListener('click', async () => {
        await engine?.signOut(auth);
        render();
    });
    syncNowBtn.addEventListener('click', () => void engine?.syncNow());
    toggle.addEventListener('change', () => engine?.setEnabled(toggle.checked));

    render();
    return { render };
}
