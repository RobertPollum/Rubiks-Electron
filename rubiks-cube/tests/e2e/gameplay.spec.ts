import { test, expect } from '@playwright/test';
import { openApp, saved, moveList, cubePicture, waitForStatus, scramble, setScrambleAmount } from './helpers';

test.describe('playing', () => {
    test.beforeEach(async ({ page }) => {
        await openApp(page, { settings: { scrambleAmount: 4, replaySpeed: 3 } });
    });

    test('scramble, turn faces and rotate the cube', async ({ page }) => {
        await page.click('#scrambleBtn');
        await expect(page.locator('#replayBtn')).toBeDisabled();
        await scramble(page, 4);
        await expect(page.locator('#cube-state')).toHaveText('Scrambled');

        for (const key of ['r', 'u', 'Shift+F', 'x', 'l', 'Shift+D']) await page.keyboard.press(key);
        await expect.poll(() => moveList(page), { timeout: 15_000 }).toBe("R U F' x L D'");
        // Whole-cube rotations are recorded but not counted
        await expect(page.locator('#move-count')).toHaveText('Moves: 5');
        await expect(page.locator('#cube-state')).toHaveText('Solving');

        const game = (await saved(page)).currentGame!;
        expect(game.version).toBe(2);
        expect(game.start).toMatch(/^[0-5]{54}$/);
    });

    test('playing the inverse of the scramble solves the cube', async ({ page }) => {
        await setScrambleAmount(page, 1);
        const [move] = await scramble(page, 1);
        const inverse = move.endsWith("'") ? move[0].toLowerCase() : `Shift+${move}`;
        await page.keyboard.press(inverse);
        await waitForStatus(page, 'Cube solved in 1 moves!');
        await expect(page.locator('#cube-state')).toHaveText('Solved');
        expect((await saved(page)).stats?.totalSolves).toBe(1);
        await expect(page.locator('.solve-entry')).toHaveCount(1);
    });

    test('replay ends on the same cube and keeps the state', async ({ page }) => {
        await scramble(page, 4);
        for (const key of ['r', 'u', 'x', 'Shift+L']) await page.keyboard.press(key);
        await expect.poll(() => moveList(page), { timeout: 15_000 }).toBe("R U x L'");
        const before = await cubePicture(page);
        const saveBefore = JSON.stringify((await saved(page)).currentGame);

        await page.click('#replayBtn');
        await expect(page.locator('#scrambleBtn')).toBeDisabled();
        await page.keyboard.press('b'); // ignored during replay
        await waitForStatus(page, 'Replay complete!');

        await expect(page.locator('#cube-state')).toHaveText('Solving');
        await expect(page.locator('#scrambleBtn')).toBeEnabled();
        expect(await moveList(page)).toBe("R U x L'");
        expect((await cubePicture(page)).equals(before)).toBe(true);
        expect(JSON.stringify((await saved(page)).currentGame)).toBe(saveBefore);
    });

    test('a game resumes after reload and replays from the right position', async ({ page }) => {
        await scramble(page, 4);
        for (const key of ['f', 'Shift+U', 'y', 'r']) await page.keyboard.press(key);
        await expect.poll(() => moveList(page), { timeout: 15_000 }).toBe("F U' y R");
        const before = await cubePicture(page);

        await page.reload();
        await waitForStatus(page, 'Resumed previous game');
        expect(await moveList(page)).toBe("F U' y R");
        await expect(page.locator('#cube-state')).toHaveText('Solving');
        expect((await cubePicture(page)).equals(before)).toBe(true);

        await page.click('#replayBtn');
        await waitForStatus(page, 'Replay complete!');
        expect((await cubePicture(page)).equals(before)).toBe(true);
    });

    test('reset during a scramble leaves a solved cube that still responds', async ({ page }) => {
        await setScrambleAmount(page, 30);
        await page.click('#scrambleBtn');
        await page.waitForTimeout(500);
        await page.click('#resetBtn');
        await expect(page.locator('#cube-state')).toHaveText('Solved');
        await expect(page.locator('#move-count')).toHaveText('Moves: 0');
        await page.waitForTimeout(800);
        await expect(page.locator('#move-count')).toHaveText('Moves: 0');
        await page.keyboard.press('u');
        await expect.poll(() => moveList(page)).toBe('U');
    });

    test('watching an algorithm leaves its result as a new attempt', async ({ page }) => {
        await page.selectOption('#algorithm-select', 'sune'); // setup is its inverse: ends solved
        await page.click('#watchAlgorithmBtn');
        await expect(page.locator('#settingsBtn')).toBeDisabled();
        await waitForStatus(page, 'Sune complete!');
        await expect(page.locator('#cube-state')).toHaveText('Solved');

        await page.selectOption('#algorithm-select', 'sledgehammer');
        await page.click('#watchAlgorithmBtn');
        await waitForStatus(page, 'Sledgehammer complete!');
        await expect(page.locator('#cube-state')).toHaveText('Scrambled');
        await expect(page.locator('#move-count')).toHaveText('Moves: 0');
        await expect(page.locator('#settingsBtn')).toBeEnabled();
    });
});
