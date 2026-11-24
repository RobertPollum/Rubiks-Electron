// Settings modal: colour themes, user presets, per-face colours,
// scramble amount, replay speed, and theme import/export.
//
// The fixed layout lives in index.html. This file wires its controls once
// and fills in the parts that change (theme buttons, presets, colour values)
// on each render. Text is always set with textContent, so names from
// imported files can never become markup.

import { THEMES, FACE_LABELS, isValidHexColor, createPresetExport, parsePresetImport } from '../core/themes';
import { clampScrambleAmountInput, isUserPresetId } from '../core/settings';
import type { ColorTheme, Palette, UserPreset } from '../core/types';
import type { FileTransfer } from '../platform/types';
import type { SettingsStore } from '../app/settingsStore';

export interface SettingsModalDeps {
    settings: SettingsStore;
    /** Repaint the cube with new colours. */
    onColorsChanged: (colors: Palette) => void;
    files: FileTransfer;
}

export type SettingsModal = ReturnType<typeof createSettingsModal>;

export function createSettingsModal({ settings, onColorsChanged, files }: SettingsModalDeps, doc: Document = document) {
    // Every element used here is in index.html.
    const $ = <T extends HTMLElement = HTMLElement>(id: string) => doc.getElementById(id) as T;
    const modal = $('settings-modal');
    const builtinThemes = $('builtin-themes');
    const userPresetsSection = $('user-presets-section');
    const userPresets = $('user-presets');
    const resetToThemeBtn = $<HTMLButtonElement>('reset-to-theme-btn');
    const presetNameInput = $<HTMLInputElement>('preset-name-input');
    const scrambleInput = $<HTMLInputElement>('scramble-amount-input');
    const replaySlider = $<HTMLInputElement>('replay-speed-slider');
    const replayLabel = $('replay-speed-label');
    const fromTemplate = (id: string) => $<HTMLTemplateElement>(id).content.firstElementChild!.cloneNode(true) as HTMLElement;
    let open = false;

    // ---- Building blocks ---------------------------------------------------

    function themeButton(id: string, theme: ColorTheme): HTMLElement {
        const btn = fromTemplate('theme-button-template');
        btn.dataset.theme = id;
        btn.title = theme.description || '';
        const preview = btn.querySelector('.theme-preview')!;
        for (const color of theme.colors) {
            const swatch = doc.createElement('span');
            swatch.className = 'theme-swatch';
            swatch.style.background = color;
            preview.appendChild(swatch);
        }
        btn.querySelector('.theme-name')!.textContent = theme.name;
        return btn;
    }

    function presetEntry(preset: UserPreset): HTMLElement {
        const wrapper = doc.createElement('div');
        wrapper.className = 'user-preset-wrapper';
        wrapper.appendChild(themeButton(preset.id, preset));
        const del = doc.createElement('button');
        del.className = 'preset-delete-btn';
        del.dataset.presetId = preset.id;
        del.title = 'Delete preset';
        del.textContent = '×';
        wrapper.appendChild(del);
        return wrapper;
    }

    // One row per face, built once; render() only updates the values.
    const faceRows = FACE_LABELS.map((label, i) => {
        const row = fromTemplate('face-color-row-template');
        row.querySelector('label')!.textContent = label;
        const picker = row.querySelector<HTMLInputElement>('.face-color-picker')!;
        const hex = row.querySelector<HTMLInputElement>('.face-color-hex')!;
        picker.dataset.face = hex.dataset.face = String(i);
        $('face-colors').appendChild(row);
        return { picker, hex };
    });

    // ---- Render ------------------------------------------------------------

    function render(): void {
        const currentTheme = settings.getThemeId();
        const isCustom = settings.isCustom();
        const presets = settings.getUserPresets();
        const colors = settings.getActiveColors();

        builtinThemes.replaceChildren(...Object.entries(THEMES).map(([id, theme]) => themeButton(id, theme)));
        userPresets.replaceChildren(...presets.map(presetEntry));
        userPresetsSection.hidden = presets.length === 0;

        for (const btn of modal.querySelectorAll<HTMLElement>('.theme-btn')) {
            btn.classList.toggle('active', !isCustom && btn.dataset.theme === currentTheme);
        }

        faceRows.forEach(({ picker, hex }, i) => {
            picker.value = hex.value = colors[i];
        });

        resetToThemeBtn.hidden = !isCustom;
        resetToThemeBtn.textContent = `Reset to ${THEMES[currentTheme]?.name || 'Standard'} theme`;

        scrambleInput.value = String(settings.getScrambleAmount());
        replaySlider.value = String(settings.getReplaySpeed());
        replayLabel.textContent = `${settings.getReplaySpeed()}x`;
    }

    // ---- Actions -------------------------------------------------------------

    function selectTheme(themeId: string): void {
        onColorsChanged(settings.selectTheme(themeId));
        render();
    }

    function setFaceColor(faceIndex: number, hex: string): void {
        onColorsChanged(settings.setFaceColor(faceIndex, hex));
        faceRows[faceIndex].picker.value = faceRows[faceIndex].hex.value = hex;
        resetToThemeBtn.hidden = false;
        for (const btn of modal.querySelectorAll('.theme-btn.active')) btn.classList.remove('active');
    }

    function deletePreset(presetId: string): void {
        const preset = settings.getUserPresets().find(p => p.id === presetId);
        if (!preset || !confirm(`Delete preset "${preset.name}"?`)) return;
        const fallbackColors = settings.deletePreset(presetId);
        if (fallbackColors) onColorsChanged(fallbackColors);
        render();
    }

    function savePreset() {
        if (settings.savePreset(presetNameInput.value)) render();
    }

    function saveScrambleAmount() {
        const val = clampScrambleAmountInput(scrambleInput.value);
        scrambleInput.value = String(val);
        settings.setScrambleAmount(val);
    }

    function exportColorScheme() {
        const themeId = settings.getThemeId();
        let name = 'Custom';
        if (isUserPresetId(themeId)) {
            const preset = settings.getUserPresets().find(p => p.id === themeId);
            if (preset) name = preset.name;
        } else if (THEMES[themeId]) {
            name = THEMES[themeId].name;
        }
        const filename = `rubiks-theme-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
        files.downloadJson(filename, createPresetExport(name, settings.getActiveColors()));
    }

    async function importColorScheme() {
        const parsed = parsePresetImport(await files.pickTextFile('.json'));
        if (!parsed) {
            alert('Invalid color scheme file. Expected a JSON file with a name and 6 hex colors.');
            return;
        }
        onColorsChanged(settings.addImportedPreset(parsed));
        render();
    }

    // ---- Wiring (once) -------------------------------------------------------

    // Typing in text fields must not trigger cube shortcuts.
    function isolateKeys(input: HTMLInputElement, onEnter: () => void): void {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') onEnter();
            e.stopPropagation();
        });
        input.addEventListener('keyup', (e) => e.stopPropagation());
        input.addEventListener('keypress', (e) => e.stopPropagation());
    }

    // Theme and preset buttons are re-created on render, so listen on the modal.
    modal.addEventListener('click', (e) => {
        if (e.target === modal) return hide(); // click on the backdrop
        const target = e.target as HTMLElement;
        const del = target.closest<HTMLElement>('.preset-delete-btn');
        if (del) return deletePreset(del.dataset.presetId!);
        const themeBtn = target.closest<HTMLElement>('.theme-btn');
        if (themeBtn) return selectTheme(themeBtn.dataset.theme!);
    });

    faceRows.forEach(({ picker, hex }, i) => {
        picker.addEventListener('input', () => setFaceColor(i, picker.value));
        hex.addEventListener('change', () => {
            let value = hex.value.trim();
            if (!value.startsWith('#')) value = '#' + value;
            if (isValidHexColor(value)) setFaceColor(i, value);
            else hex.value = settings.getActiveColors()[i];
        });
    });

    resetToThemeBtn.addEventListener('click', () => selectTheme(settings.getThemeId()));
    $('save-preset-btn').addEventListener('click', savePreset);
    isolateKeys(presetNameInput, savePreset);
    $('scramble-amount-save').addEventListener('click', saveScrambleAmount);
    isolateKeys(scrambleInput, saveScrambleAmount);
    replaySlider.addEventListener('input', () => {
        const val = parseFloat(replaySlider.value);
        replayLabel.textContent = `${val}x`;
        settings.setReplaySpeed(val);
    });
    $('export-btn').addEventListener('click', exportColorScheme);
    $('import-btn').addEventListener('click', importColorScheme);
    $('settings-close').addEventListener('click', hide);

    function show(): void {
        open = true;
        modal.classList.add('visible');
        render();
    }

    function hide(): void {
        open = false;
        modal.classList.remove('visible');
    }

    return {
        open: show,
        close: hide,
        isOpen: () => open,
        render
    };
}
