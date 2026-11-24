// User settings held in the shared game data object, with save-on-change.
// Methods that change the cube's colours return the new colours so the
// caller can repaint the view.

import { DEFAULT_THEME, getThemeColors } from '../core/themes';
import {
    resolveActiveColors, resolveThemeColors, hasCustomColors, isUserPresetId,
    normalizeScrambleAmount, normalizeReplaySpeed, createUserPreset
} from '../core/settings';

/**
 * @param {Object} gameData  The persisted data object (settings live at gameData.settings).
 * @param {() => void} save   Persist gameData.
 */
export function createSettingsStore(gameData, save) {
    const settings = () => {
        gameData.settings = gameData.settings || {};
        return gameData.settings;
    };
    const presetList = () => {
        const s = settings();
        if (!Array.isArray(s.userPresets)) s.userPresets = [];
        return s.userPresets;
    };

    return {
        getThemeId: () => (gameData.settings && gameData.settings.theme) || DEFAULT_THEME,
        getUserPresets: () => (gameData.settings && gameData.settings.userPresets) || [],
        getActiveColors: () => resolveActiveColors(gameData.settings || {}),
        isCustom: () => hasCustomColors(gameData.settings || {}),
        getScrambleAmount: () => normalizeScrambleAmount(gameData.settings && gameData.settings.scrambleAmount),
        getReplaySpeed: () => normalizeReplaySpeed(gameData.settings && gameData.settings.replaySpeed),

        /** Switch to a built-in theme or user preset. Returns the new colours. */
        selectTheme(themeId) {
            const s = settings();
            s.theme = themeId;
            s.customColors = null;
            const colors = resolveThemeColors(themeId, this.getUserPresets());
            save();
            return colors;
        },

        /** Override one face's colour (switches to custom mode). Returns the new colours. */
        setFaceColor(faceIndex, hexColor) {
            const s = settings();
            if (!s.customColors || !Array.isArray(s.customColors)) {
                s.customColors = this.getActiveColors();
            }
            s.customColors[faceIndex] = hexColor;
            save();
            return s.customColors;
        },

        /** Save the current colours as a named preset and select it. */
        savePreset(name) {
            if (!name || !name.trim()) return false;
            const preset = createUserPreset({
                name: name.trim().slice(0, 50),
                description: 'User preset: ' + name.trim(),
                colors: this.getActiveColors()
            });
            presetList().push(preset);
            const s = settings();
            s.theme = preset.id;
            s.customColors = null;
            save();
            return true;
        },

        /** Add an imported preset ({name, description, colors}) and select it. Returns its colours. */
        addImportedPreset(parsed) {
            const preset = createUserPreset(parsed);
            presetList().push(preset);
            const s = settings();
            s.theme = preset.id;
            s.customColors = null;
            save();
            return preset.colors;
        },

        /**
         * Delete a user preset. If it was active, falls back to the default
         * theme and returns those colours; otherwise returns null.
         */
        deletePreset(presetId) {
            if (!isUserPresetId(presetId)) return null;
            const s = settings();
            if (!Array.isArray(s.userPresets)) return null;
            s.userPresets = s.userPresets.filter(p => p.id !== presetId);
            let newColors = null;
            if (s.theme === presetId) {
                s.theme = DEFAULT_THEME;
                newColors = getThemeColors(DEFAULT_THEME);
            }
            save();
            return newColors;
        },

        setScrambleAmount(value) {
            settings().scrambleAmount = value;
            save();
        },

        setReplaySpeed(value) {
            settings().replaySpeed = value;
            save();
        }
    };
}
