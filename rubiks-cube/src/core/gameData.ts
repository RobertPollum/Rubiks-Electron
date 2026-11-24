import type { GameData } from './types';

// Shape of everything the app persists, plus helpers for working with it.
// This is the contract every storage adapter (localStorage, file, web API)
// reads and writes.

export const DEFAULT_SCRAMBLE_AMOUNT = 25;
export const MIN_SCRAMBLE_AMOUNT = 1;
export const MAX_SCRAMBLE_AMOUNT = 1000;
export const DEFAULT_REPLAY_SPEED = 1;
export const MIN_REPLAY_SPEED = 0.25;
export const MAX_REPLAY_SPEED = 3;

export function createDefaultData(): GameData {
    return {
        solves: [],
        // See core/savedGame.js for this format.
        currentGame: {
            version: 2,
            cubeState: 'solved',
            start: null,
            scramble: [],
            moveHistory: []
        },
        stats: {
            totalSolves: 0,
            bestSolve: null,
            averageMoves: 0
        },
        settings: {
            theme: 'standard',
            customColors: null,
            userPresets: [],
            scrambleAmount: DEFAULT_SCRAMBLE_AMOUNT,
            replaySpeed: DEFAULT_REPLAY_SPEED
        }
    };
}

/** Fill in any top-level sections missing from previously saved data. */
export function mergeWithDefaults(data: unknown): GameData {
    const defaults = createDefaultData();
    if (!data || typeof data !== 'object') return defaults;
    return { ...defaults, ...(data as Partial<GameData>) };
}
