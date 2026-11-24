// Account sync against the mock sync server (tools/mock-sync-server.mjs).
// Each test signs in as its own user, and uses separate browser contexts as
// separate devices.
import { test, expect, type Browser, type Page } from '@playwright/test';
import { openApp, saved, moveList, waitForStatus, scramble } from './helpers';

const API = 'http://127.0.0.1:4180';

async function newDevice(browser: Browser, settings: object = { scrambleAmount: 3 }): Promise<Page> {
    const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
    await openApp(page, { settings });
    return page;
}

async function signIn(page: Page, name: string) {
    page.once('dialog', d => d.accept(name));
    await page.click('#settingsBtn');
    await page.click('#sign-in-btn');
    await expect(page.locator('#account-status')).toContainText(`Signed in as ${name}`);
    await expect(page.locator('#sync-status')).toContainText('Synced');
    await page.keyboard.press('Escape');
}

/** What the server holds for a user. */
async function serverData(name: string) {
    const res = await fetch(`${API}/v1/data`, { headers: { Authorization: `Bearer dev:${name}` } });
    return res.json();
}

const uniqueName = (label: string) => `${label}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

test.describe('account sync', () => {
    test('signed-out players see the sign-in option', async ({ page }) => {
        await openApp(page);
        await page.click('#settingsBtn');
        await expect(page.locator('#account-status')).toContainText('Sign in to back up');
        await expect(page.locator('#sign-in-btn')).toHaveText('Sign in (development)');
        await expect(page.locator('#sync-now-btn')).toBeHidden();
    });

    test('a game started on one device continues on another', async ({ browser }) => {
        const name = uniqueName('robert');
        const laptop = await newDevice(browser);
        await signIn(laptop, name);
        await scramble(laptop, 3);
        await laptop.keyboard.press('r');
        await laptop.keyboard.press('Shift+U');
        await expect.poll(() => moveList(laptop)).toBe("R U'");
        // Automatic sync shortly after the change
        await expect.poll(async () => (await serverData(name)).data?.currentGame?.moveHistory?.length, { timeout: 10_000 }).toBe(2);

        const phone = await newDevice(browser);
        await signIn(phone, name);
        await expect.poll(() => moveList(phone)).toBe("R U'");
        await expect(phone.locator('#cube-state')).toHaveText('Solving');
        expect((await saved(phone)).currentGame?.start).toBe((await saved(laptop)).currentGame?.start);
    });

    test('settings follow the account, and Sync now pulls changes', async ({ browser }) => {
        const name = uniqueName('settings');
        const a = await newDevice(browser);
        const b = await newDevice(browser);
        await signIn(a, name);
        await signIn(b, name);

        await a.click('#settingsBtn');
        await a.click('.theme-btn[data-theme="grayscale"]');
        await a.keyboard.press('Escape');
        await expect.poll(async () => (await serverData(name)).data?.settings?.theme, { timeout: 10_000 }).toBe('grayscale');

        await b.click('#settingsBtn');
        await b.click('#sync-now-btn');
        await expect(b.locator('.theme-btn.active')).toHaveAttribute('data-theme', 'grayscale');
        expect((await saved(b)).settings?.theme).toBe('grayscale');
    });

    test('solves from two devices are combined', async ({ browser }) => {
        const name = uniqueName('solver');
        const solveOnce = async (page: Page) => {
            const [move] = await scramble(page, 1);
            await page.keyboard.press(move.endsWith("'") ? move[0].toLowerCase() : `Shift+${move}`);
            await waitForStatus(page, 'Cube solved in 1 moves!');
        };
        const a = await newDevice(browser, { scrambleAmount: 1 });
        const b = await newDevice(browser, { scrambleAmount: 1 });
        await solveOnce(a);
        await solveOnce(b);
        await signIn(a, name);
        await signIn(b, name);
        await a.click('#settingsBtn');
        await a.click('#sync-now-btn');
        await expect(a.locator('#sync-status')).toContainText('Synced');
        await a.keyboard.press('Escape');
        await expect(a.locator('.solve-entry')).toHaveCount(2);
        await expect(b.locator('.solve-entry')).toHaveCount(2);
        expect((await serverData(name)).data.stats.totalSolves).toBe(2);
    });

    test('turning sync off stops automatic uploads; signing out keeps local data', async ({ browser }) => {
        const name = uniqueName('private');
        const page = await newDevice(browser);
        await signIn(page, name);
        const before = (await serverData(name)).revision;

        await page.click('#settingsBtn');
        await page.uncheck('#sync-enabled');
        await expect(page.locator('#sync-status')).toHaveText('Automatic sync is off on this device');
        await page.keyboard.press('Escape');
        await page.keyboard.press('f');
        await expect.poll(() => moveList(page)).toBe('F');
        await page.waitForTimeout(2500);
        expect((await serverData(name)).revision).toBe(before);

        // Still off after a reload
        await page.reload();
        await page.click('#settingsBtn');
        await expect(page.locator('#sync-enabled')).not.toBeChecked();

        await page.click('#sign-out-btn');
        await expect(page.locator('#account-status')).toContainText('Sign in to back up');
        await page.keyboard.press('Escape');
        expect(await moveList(page)).toBe('F');
    });
});
