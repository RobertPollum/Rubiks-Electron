import { test, expect, type Page } from '@playwright/test';
import { openApp, saved, moveList, cubePicture, waitForStatus, scramble } from './helpers';

async function chooseSize(page: Page, size: number) {
    await page.click('#settingsBtn');
    await page.selectOption('#cube-size-select', String(size));
    await page.keyboard.press('Escape');
    await waitForStatus(page, `Now playing a ${size}x${size}x${size} cube`);
}

test.describe('cube sizes', () => {
    test.beforeEach(async ({ page }) => {
        await openApp(page, { settings: { scrambleAmount: 1, replaySpeed: 3 } });
        page.on('dialog', d => d.accept());
    });

    test('a 2x2 can be scrambled and solved', async ({ page }) => {
        await chooseSize(page, 2);
        expect((await saved(page)).settings?.cubeSize).toBe(2);
        const [move] = await scramble(page, 1);
        expect((await saved(page)).currentGame?.start).toHaveLength(24);
        const inverse = move.endsWith("'") ? move[0].toLowerCase() : `Shift+${move}`;
        await page.keyboard.press(inverse);
        await waitForStatus(page, 'Cube solved in 1 moves!');
    });

    test('inner layers on a 4x4: number key then face key', async ({ page }) => {
        await chooseSize(page, 4);
        await page.keyboard.press('2');
        await waitForStatus(page, 'Layer 2: now press a face key (R, L, U, D, F, B)');
        await page.keyboard.press('r');
        await page.keyboard.press('2');
        await page.keyboard.press('Shift+U');
        await expect.poll(() => moveList(page)).toBe("2R 2U'");

        // Layer 3 is the opposite face's layer 2 on a 4x4, so it isn't offered
        await page.keyboard.press('3');
        await page.keyboard.press('f');
        await waitForStatus(page, 'A 4x4x4 cube has no layer 3 to turn');
        expect(await moveList(page)).toBe("2R 2U'");
        expect((await saved(page)).currentGame?.start).toHaveLength(96);
    });

    test('a 5x5 game resumes after reload and replays exactly', async ({ page }) => {
        await chooseSize(page, 5);
        await page.click('#settingsBtn');
        await page.fill('#scramble-amount-input', '10');
        await page.click('#scramble-amount-save');
        await page.keyboard.press('Escape');
        const moves = await scramble(page, 10);
        expect(moves.every(m => /^[1-3]?[RLUDFB]'?$/.test(m))).toBe(true);

        for (const key of ['3', 'r', 'u', '2', 'Shift+F']) await page.keyboard.press(key);
        await expect.poll(() => moveList(page)).toBe("3R U 2F'");
        const before = await cubePicture(page);

        await page.reload();
        await waitForStatus(page, 'Resumed previous game');
        expect((await saved(page)).settings?.cubeSize).toBe(5);
        expect((await cubePicture(page)).equals(before)).toBe(true);

        await page.click('#replayBtn');
        await waitForStatus(page, 'Replay complete!');
        expect((await cubePicture(page)).equals(before)).toBe(true);
    });

    test('changing size asks before discarding a game, and starts solved', async ({ page }) => {
        await page.keyboard.press('r');
        await expect.poll(() => moveList(page)).toBe('R');
        let asked = '';
        page.removeAllListeners('dialog');
        page.on('dialog', d => { asked = d.message(); d.accept(); });
        await chooseSize(page, 7);
        expect(asked).toContain('Changing the cube size');
        await expect(page.locator('#cube-state')).toHaveText('Solved');
        expect(await moveList(page)).toBe('');
    });
});
