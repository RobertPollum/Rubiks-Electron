// Settings modal: colour themes, user presets, per-face colours,
// scramble amount, replay speed, and theme import/export.

import { THEMES, FACE_LABELS, isValidHexColor, createPresetExport, parsePresetImport } from '../core/themes';
import { clampScrambleAmountInput } from '../core/settings';

/**
 * @param {Object} deps
 * @param {ReturnType<import('../app/settingsStore').createSettingsStore>} deps.settings
 * @param {(colors: string[]) => void} deps.onColorsChanged  Repaint the cube.
 * @param {{ downloadJson: Function, pickTextFile: Function }} deps.files
 */
export function createSettingsModal({ settings, onColorsChanged, files }, doc = document) {
    const modal = doc.getElementById('settings-modal');
    const container = doc.getElementById('settings-content');
    let open = false;

    // Keep typing in text fields from triggering cube shortcuts.
    function isolateKeys(input, onEnter) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') onEnter();
            e.stopPropagation();
        });
        input.addEventListener('keyup', (e) => e.stopPropagation());
        input.addEventListener('keypress', (e) => e.stopPropagation());
    }

    function selectTheme(themeId) {
        onColorsChanged(settings.selectTheme(themeId));
        render();
    }

    function exportColorScheme() {
        const themeId = settings.getThemeId();
        let name = 'Custom';
        if (themeId.startsWith('user_')) {
            const preset = settings.getUserPresets().find(p => p.id === themeId);
            if (preset) name = preset.name;
        } else if (THEMES[themeId]) {
            name = THEMES[themeId].name;
        }
        const filename = `rubiks-theme-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
        files.downloadJson(filename, createPresetExport(name, settings.getActiveColors()));
    }

    async function importColorScheme() {
        const text = await files.pickTextFile('.json');
        const parsed = parsePresetImport(text);
        if (!parsed) {
            alert('Invalid color scheme file. Expected a JSON file with a name and 6 hex colors.');
            return;
        }
        onColorsChanged(settings.addImportedPreset(parsed));
        render();
    }

    function themeButton(id, theme, isActive) {
        let html = `<button class="theme-btn ${isActive ? 'active' : ''}" data-theme="${id}" title="${theme.description}">`;
        html += `<div class="theme-preview">`;
        theme.colors.forEach(c => {
            html += `<span class="theme-swatch" style="background:${c}"></span>`;
        });
        html += `</div>`;
        html += `<span class="theme-name">${theme.name}</span>`;
        html += `</button>`;
        return html;
    }

    function buildHtml() {
        const currentTheme = settings.getThemeId();
        const currentColors = settings.getActiveColors();
        const isCustom = settings.isCustom();
        const userPresets = settings.getUserPresets();

        let html = '<div class="settings-section">';
        html += '<h4>Color Theme</h4>';
        html += '<div class="theme-grid">';
        for (const [id, theme] of Object.entries(THEMES)) {
            html += themeButton(id, theme, !isCustom && currentTheme === id);
        }
        html += '</div></div>';

        if (userPresets.length > 0) {
            html += '<div class="settings-section">';
            html += '<h4>Your Presets</h4>';
            html += '<div class="theme-grid">';
            for (const preset of userPresets) {
                html += `<div class="user-preset-wrapper">`;
                html += themeButton(preset.id, preset, !isCustom && currentTheme === preset.id);
                html += `<button class="preset-delete-btn" data-preset-id="${preset.id}" title="Delete preset">&times;</button>`;
                html += `</div>`;
            }
            html += '</div></div>';
        }

        html += '<div class="settings-section">';
        html += '<h4>Custom Face Colors</h4>';
        html += '<p class="settings-hint">Click a color to customize individual faces. Editing any color switches to custom mode.</p>';
        html += '<div class="face-colors">';
        FACE_LABELS.forEach((label, i) => {
            const color = currentColors[i];
            html += `<div class="face-color-row">`;
            html += `<label>${label}</label>`;
            html += `<div class="color-input-group">`;
            html += `<input type="color" class="face-color-picker" data-face="${i}" value="${color}">`;
            html += `<input type="text" class="face-color-hex" data-face="${i}" value="${color}" maxlength="7" spellcheck="false">`;
            html += `</div>`;
            html += `</div>`;
        });
        html += '</div>';
        if (isCustom) {
            html += `<button id="reset-to-theme-btn" class="settings-action-btn">Reset to ${THEMES[currentTheme]?.name || 'Standard'} theme</button>`;
        }
        html += '</div>';

        html += '<div class="settings-section">';
        html += '<h4>Save as Preset</h4>';
        html += '<div class="save-preset-row">';
        html += '<input type="text" id="preset-name-input" placeholder="Preset name..." maxlength="50" spellcheck="false">';
        html += '<button id="save-preset-btn" class="settings-action-btn">Save</button>';
        html += '</div></div>';

        html += '<div class="settings-section">';
        html += '<h4>Scramble Amount</h4>';
        html += '<p class="settings-hint">Number of random moves when scrambling the cube (1–1000).</p>';
        html += '<div class="scramble-amount-row">';
        html += `<input type="number" id="scramble-amount-input" min="1" max="1000" value="${settings.getScrambleAmount()}">`;
        html += '<button id="scramble-amount-save" class="settings-action-btn">Save</button>';
        html += '</div></div>';

        html += '<div class="settings-section">';
        html += '<h4>Replay Speed</h4>';
        html += '<p class="settings-hint">Controls how fast moves animate during replay.</p>';
        html += '<div class="replay-speed-row">';
        html += `<input type="range" id="replay-speed-slider" min="0.25" max="3" step="0.25" value="${settings.getReplaySpeed()}">`;
        html += `<span id="replay-speed-label">${settings.getReplaySpeed()}x</span>`;
        html += '</div></div>';

        html += '<div class="settings-section">';
        html += '<h4>Import / Export</h4>';
        html += '<p class="settings-hint">Share color schemes as JSON files.</p>';
        html += '<div class="import-export-row">';
        html += '<button id="export-btn" class="settings-action-btn">Export Current</button>';
        html += '<button id="import-btn" class="settings-action-btn">Import from File</button>';
        html += '</div></div>';

        return html;
    }

    function bindControls() {
        const currentTheme = settings.getThemeId();
        const userPresets = settings.getUserPresets();

        // Theme buttons (built-in + user)
        container.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => selectTheme(btn.dataset.theme));
        });

        // Delete user preset
        container.querySelectorAll('.preset-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const presetId = btn.dataset.presetId;
                const preset = userPresets.find(p => p.id === presetId);
                if (preset && confirm(`Delete preset "${preset.name}"?`)) {
                    const fallbackColors = settings.deletePreset(presetId);
                    if (fallbackColors) onColorsChanged(fallbackColors);
                    render();
                }
            });
        });

        // Face colour pickers
        container.querySelectorAll('.face-color-picker').forEach(picker => {
            picker.addEventListener('input', (e) => {
                const faceIdx = parseInt(e.target.dataset.face);
                const hex = e.target.value;
                onColorsChanged(settings.setFaceColor(faceIdx, hex));
                const hexInput = container.querySelector(`.face-color-hex[data-face="${faceIdx}"]`);
                if (hexInput) hexInput.value = hex;
            });
        });

        // Face colour hex inputs
        container.querySelectorAll('.face-color-hex').forEach(hexInput => {
            hexInput.addEventListener('change', (e) => {
                const faceIdx = parseInt(e.target.dataset.face);
                let hex = e.target.value.trim();
                if (!hex.startsWith('#')) hex = '#' + hex;
                if (isValidHexColor(hex)) {
                    onColorsChanged(settings.setFaceColor(faceIdx, hex));
                    const picker = container.querySelector(`.face-color-picker[data-face="${faceIdx}"]`);
                    if (picker) picker.value = hex;
                } else {
                    e.target.value = settings.getActiveColors()[faceIdx];
                }
            });
        });

        // Reset to theme
        const resetBtn = container.querySelector('#reset-to-theme-btn');
        if (resetBtn) resetBtn.addEventListener('click', () => selectTheme(currentTheme));

        // Save preset
        const saveBtn = container.querySelector('#save-preset-btn');
        const nameInput = container.querySelector('#preset-name-input');
        if (saveBtn && nameInput) {
            const savePreset = () => {
                if (settings.savePreset(nameInput.value)) render();
            };
            saveBtn.addEventListener('click', savePreset);
            isolateKeys(nameInput, savePreset);
        }

        // Scramble amount
        const scrambleInput = container.querySelector('#scramble-amount-input');
        const scrambleSave = container.querySelector('#scramble-amount-save');
        if (scrambleInput && scrambleSave) {
            const applyScrambleAmount = () => {
                const val = clampScrambleAmountInput(scrambleInput.value);
                scrambleInput.value = val;
                settings.setScrambleAmount(val);
            };
            scrambleSave.addEventListener('click', applyScrambleAmount);
            isolateKeys(scrambleInput, applyScrambleAmount);
        }

        // Replay speed
        const replaySlider = container.querySelector('#replay-speed-slider');
        const replayLabel = container.querySelector('#replay-speed-label');
        if (replaySlider && replayLabel) {
            replaySlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                replayLabel.textContent = val + 'x';
                settings.setReplaySpeed(val);
            });
        }

        // Export / Import
        const exportBtn = container.querySelector('#export-btn');
        if (exportBtn) exportBtn.addEventListener('click', exportColorScheme);
        const importBtn = container.querySelector('#import-btn');
        if (importBtn) importBtn.addEventListener('click', importColorScheme);
    }

    function render() {
        if (!container) return;
        container.innerHTML = buildHtml();
        bindControls();
    }

    function show() {
        open = true;
        if (modal) {
            modal.classList.add('visible');
            render();
        }
    }

    function hide() {
        open = false;
        if (modal) modal.classList.remove('visible');
    }

    doc.getElementById('settings-close').addEventListener('click', hide);
    modal.addEventListener('click', (e) => {
        if (e.target.id === 'settings-modal') hide();
    });

    return {
        open: show,
        close: hide,
        isOpen: () => open,
        render
    };
}
