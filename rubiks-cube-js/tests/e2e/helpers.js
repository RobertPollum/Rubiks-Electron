import { expect } from '@playwright/test';

export const STORAGE_KEY = 'rubiksCubeGameData';

/** Open the app with a clean slate, optionally seeding saved data. */
export async function openApp(page, savedData = {}) {
    await page.goto('./');
    await page.evaluate(([key, data]) => {
        localStorage.clear();
        localStorage.setItem(key, JSON.stringify(data));
    }, [STORAGE_KEY, savedData]);
    await page.reload();
    await expect(page.locator('#main-content canvas')).toBeVisible();
}

export const saved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), STORAGE_KEY);

export const moveList = page => page.locator('.move-notation').allTextContents().then(m => m.join(' '));

/** Picture of the cube canvas, for comparing positions. */
export const cubePicture = page => page.locator('#main-content canvas').screenshot();

/** Wait until the status line shows `text`. */
export const waitForStatus = (page, text, timeout = 30_000) =>
    expect(page.locator('#info')).toHaveText(text, { timeout });

export async function setScrambleAmount(page, amount) {
    await page.click('#settingsBtn');
    await page.fill('#scramble-amount-input', String(amount));
    await page.click('#scramble-amount-save');
    await page.keyboard.press('Escape');
}

/** Scramble and wait until it has finished and been saved. */
export async function scramble(page, amount) {
    await page.click('#scrambleBtn');
    await expect.poll(async () => (await saved(page))?.currentGame?.scramble?.length, { timeout: 30_000 }).toBe(amount);
    return (await saved(page)).currentGame.scramble;
}
