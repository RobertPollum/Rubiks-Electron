import { expect, type Page } from '@playwright/test';
import type { GameData, SavedGame } from '../../src/core/types';

export const STORAGE_KEY = 'rubiksCubeGameData';

/** Open the app with a clean slate, optionally seeding saved data. */
export async function openApp(page: Page, savedData: object = {}): Promise<void> {
    await page.goto('./');
    await page.evaluate(([key, data]) => {
        localStorage.clear();
        localStorage.setItem(key, JSON.stringify(data));
    }, [STORAGE_KEY, savedData] as const);
    await page.reload();
    await expect(page.locator('#main-content canvas')).toBeVisible();
}

/** What the app has saved (fields may be missing before the first save). */
export const saved = (page: Page) =>
    page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null'), STORAGE_KEY) as Promise<
        Partial<Omit<GameData, 'currentGame'>> & { currentGame?: SavedGame }
    >;

export const moveList = (page: Page) => page.locator('.move-notation').allTextContents().then(m => m.join(' '));

/** Picture of the cube canvas, for comparing positions. */
export const cubePicture = (page: Page) => page.locator('#main-content canvas').screenshot();

/** Wait until the status line shows `text`. */
export const waitForStatus = (page: Page, text: string, timeout = 30_000) =>
    expect(page.locator('#info')).toHaveText(text, { timeout });

export async function setScrambleAmount(page: Page, amount: number): Promise<void> {
    await page.click('#settingsBtn');
    await page.fill('#scramble-amount-input', String(amount));
    await page.click('#scramble-amount-save');
    await page.keyboard.press('Escape');
}

/** Scramble and wait until it has finished and been saved. Returns the scramble's notation. */
export async function scramble(page: Page, amount: number): Promise<string[]> {
    await page.click('#scrambleBtn');
    await expect.poll(async () => (await saved(page))?.currentGame?.scramble?.length, { timeout: 30_000 }).toBe(amount);
    return (await saved(page)).currentGame!.scramble;
}
