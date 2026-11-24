// Pure rules for user settings: which colours are active, valid ranges,
// and how user presets are shaped. No DOM, no storage.

import { DEFAULT_THEME, getThemeColors, isValidColorScheme } from './themes';
import {
    DEFAULT_SCRAMBLE_AMOUNT, MIN_SCRAMBLE_AMOUNT, MAX_SCRAMBLE_AMOUNT,
    DEFAULT_REPLAY_SPEED, MIN_REPLAY_SPEED, MAX_REPLAY_SPEED
} from './gameData';

export const USER_PRESET_PREFIX = 'user_';

export function isUserPresetId(themeId) {
    return typeof themeId === 'string' && themeId.startsWith(USER_PRESET_PREFIX);
}

/** Colours for a theme id, which may be built-in or a user preset. */
export function resolveThemeColors(themeId, userPresets = []) {
    if (isUserPresetId(themeId)) {
        const preset = userPresets.find(p => p.id === themeId);
        if (preset && isValidColorScheme(preset.colors)) return [...preset.colors];
        return getThemeColors(DEFAULT_THEME);
    }
    return getThemeColors(themeId);
}

/** Colours currently on the cube: custom overrides win over the theme. */
export function resolveActiveColors(settings = {}) {
    if (hasCustomColors(settings)) {
        return settings.customColors;
    }
    const themeId = settings.theme || DEFAULT_THEME;
    return resolveThemeColors(themeId, settings.userPresets || []);
}

export function hasCustomColors(settings = {}) {
    return !!(settings.customColors && Array.isArray(settings.customColors) && settings.customColors.length === 6);
}

/** Read the stored scramble amount, falling back to the default if invalid. */
export function normalizeScrambleAmount(value) {
    return (typeof value === 'number' && value >= MIN_SCRAMBLE_AMOUNT && value <= MAX_SCRAMBLE_AMOUNT)
        ? Math.floor(value)
        : DEFAULT_SCRAMBLE_AMOUNT;
}

/** Clamp user input for the scramble amount into the allowed range. */
export function clampScrambleAmountInput(value) {
    let val = parseInt(value);
    if (isNaN(val) || val < MIN_SCRAMBLE_AMOUNT) val = MIN_SCRAMBLE_AMOUNT;
    if (val > MAX_SCRAMBLE_AMOUNT) val = MAX_SCRAMBLE_AMOUNT;
    return val;
}

export function normalizeReplaySpeed(value) {
    return (typeof value === 'number' && value >= MIN_REPLAY_SPEED && value <= MAX_REPLAY_SPEED)
        ? value
        : DEFAULT_REPLAY_SPEED;
}

export function createUserPresetId(now = Date.now(), random = Math.random) {
    return USER_PRESET_PREFIX + now + '_' + random().toString(36).slice(2, 7);
}

export function createUserPreset({ id = createUserPresetId(), name, description, colors, createdAt = new Date() }) {
    return {
        id,
        name,
        description,
        colors: [...colors],
        createdAt: createdAt.toISOString()
    };
}
