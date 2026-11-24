import { test, expect } from '@playwright/test';
import path from 'node:path';
import { openApp, saved, moveList } from './helpers';

const settingsOf = async page => (await saved(page)).settings;
const isOpen = page => page.locator('#settings-modal').evaluate(el => el.classList.contains('visible'));

test.describe('settings', () => {
    test.beforeEach(async ({ page }) => {
        await openApp(page);
        page.on('dialog', d => d.accept());
        await page.click('#settingsBtn');
    });

    test('shows the current settings', async ({ page }) => {
        await expect(page.locator('#builtin-themes .theme-btn')).toHaveCount(7);
        await expect(page.locator('.theme-btn.active')).toHaveAttribute('data-theme', 'standard');
        await expect(page.locator('#user-presets-section')).toBeHidden();
        await expect(page.locator('#reset-to-theme-btn')).toBeHidden();
        await expect(page.locator('#scramble-amount-input')).toHaveValue('25');
        await expect(page.locator('#replay-speed-label')).toHaveText('1x');
    });

    test('themes, custom colours and presets', async ({ page }) => {
        await page.click('.theme-btn[data-theme="pastel"]');
        await expect(page.locator('.theme-btn.active')).toHaveAttribute('data-theme', 'pastel');
        await expect(page.locator('.face-color-hex[data-face="0"]')).toHaveValue('#FFB3B3');
        expect((await settingsOf(page)).theme).toBe('pastel');

        // Hex without '#' is accepted; invalid input reverts
        await page.fill('.face-color-hex[data-face="2"]', '123456');
        await page.press('.face-color-hex[data-face="2"]', 'Tab');
        await expect(page.locator('.face-color-picker[data-face="2"]')).toHaveValue('#123456');
        expect((await settingsOf(page)).customColors[2]).toBe('#123456');
        await expect(page.locator('.theme-btn.active')).toHaveCount(0);
        await expect(page.locator('#reset-to-theme-btn')).toHaveText('Reset to Pastel theme');
        await page.fill('.face-color-hex[data-face="1"]', 'zzz');
        await page.press('.face-color-hex[data-face="1"]', 'Tab');
        await expect(page.locator('.face-color-hex[data-face="1"]')).toHaveValue('#FFDAB3');

        // Save as preset (typing must not turn the cube)
        await page.fill('#preset-name-input', 'Mine');
        await page.press('#preset-name-input', 'r');
        await page.fill('#preset-name-input', 'Mine');
        await page.press('#preset-name-input', 'Enter');
        expect(await moveList(page)).toBe('');
        await expect(page.locator('#user-presets-section')).toBeVisible();
        await expect(page.locator('.theme-btn.active .theme-name')).toHaveText('Mine');

        // Deleting the active preset falls back to the standard theme
        await page.hover('.user-preset-wrapper');
        await page.click('.preset-delete-btn');
        await expect(page.locator('.theme-btn.active')).toHaveAttribute('data-theme', 'standard');
        expect((await settingsOf(page)).userPresets).toHaveLength(0);
    });

    test('scramble amount and replay speed', async ({ page }) => {
        await page.fill('#scramble-amount-input', '5000');
        await page.click('#scramble-amount-save');
        await expect(page.locator('#scramble-amount-input')).toHaveValue('1000');
        expect((await settingsOf(page)).scrambleAmount).toBe(1000);

        await page.locator('#replay-speed-slider').fill('2');
        await expect(page.locator('#replay-speed-label')).toHaveText('2x');
        expect((await settingsOf(page)).replaySpeed).toBe(2);
    });

    test('imported theme names are shown as text, never run', async ({ page }) => {
        const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('#import-btn')]);
        await chooser.setFiles(path.join(__dirname, 'fixtures/malicious-theme.json'));
        await expect(page.locator('.user-preset-wrapper')).toHaveCount(1);
        await page.hover('.user-preset-wrapper .theme-btn');
        await expect(page.locator('.user-preset-wrapper .theme-name')).toContainText('<img');
        await expect(page.locator('#settings-content img')).toHaveCount(0);
        expect(await page.evaluate(() => window.__injected)).toBeUndefined();
    });

    test('export downloads a JSON file', async ({ page }) => {
        const [download] = await Promise.all([page.waitForEvent('download'), page.click('#export-btn')]);
        expect(download.suggestedFilename()).toBe('rubiks-theme-standard.json');
    });

    test('closes with Escape or a backdrop click', async ({ page }) => {
        await page.keyboard.press('Escape');
        expect(await isOpen(page)).toBe(false);
        await page.click('#settingsBtn');
        await page.mouse.click(5, 5);
        expect(await isOpen(page)).toBe(false);
    });
});
