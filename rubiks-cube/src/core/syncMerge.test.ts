import { describe, it, expect } from 'vitest';
import { mergeGameData, solveKey } from './syncMerge';
import { createDefaultData } from './gameData';
import type { GameData, SolveRecord } from './types';

const T1 = '2026-01-01T10:00:00.000Z';
const T2 = '2026-01-02T10:00:00.000Z';

function data(changes: Partial<GameData> = {}): GameData {
    return { ...createDefaultData(), ...changes };
}
const solve = (id: string, solvedAt: string, moves = 20): SolveRecord => ({ id, solvedAt, moves, timestamp: 't', date: 'd' });
const game = (updatedAt: string, moves: string[]) => ({
    version: 2 as const, cubeState: 'solving' as const, start: null, scramble: [],
    moveHistory: moves.map(notation => ({ notation, timestamp: 1 })), updatedAt
});

describe('mergeGameData', () => {
    it('keeps the more recently changed settings', () => {
        const local = data({ settingsUpdatedAt: T1, settings: { ...createDefaultData().settings, theme: 'pastel' } });
        const remote = data({ settingsUpdatedAt: T2, settings: { ...createDefaultData().settings, theme: 'grayscale' } });
        expect(mergeGameData(local, remote).settings.theme).toBe('grayscale');
        expect(mergeGameData(remote, local).settings.theme).toBe('grayscale');
        expect(mergeGameData(local, remote).settingsUpdatedAt).toBe(T2);
    });

    it('prefers this device when neither side has a settings time', () => {
        const local = data({ settings: { ...createDefaultData().settings, theme: 'pastel' } });
        expect(mergeGameData(local, data()).settings.theme).toBe('pastel');
    });

    it('combines solve histories without duplicates and recomputes stats', () => {
        const shared = solve('a', T1, 30);
        const local = data({ solves: [shared, solve('b', T2, 10)] });
        const remote = data({ solves: [shared, solve('c', '2026-01-01T12:00:00.000Z', 20)] });
        const merged = mergeGameData(local, remote);
        expect(merged.solves.map(s => s.id)).toEqual(['a', 'c', 'b']);
        expect(merged.stats).toEqual({ totalSolves: 3, bestSolve: 10, averageMoves: 20 });
    });

    it('matches older solves without ids by their contents', () => {
        const old: SolveRecord = { moves: 12, timestamp: '9:00:00 AM', date: '1/1/2026' };
        expect(solveKey(old)).toBe(solveKey({ ...old }));
        expect(mergeGameData(data({ solves: [old] }), data({ solves: [{ ...old }] })).solves).toHaveLength(1);
    });

    it('keeps the more recently saved game', () => {
        const local = data({ currentGame: game(T1, ['R']) });
        const remote = data({ currentGame: game(T2, ['U', 'F']) });
        expect((mergeGameData(local, remote).currentGame as ReturnType<typeof game>).moveHistory).toHaveLength(2);
        expect((mergeGameData(remote, local).currentGame as ReturnType<typeof game>).moveHistory).toHaveLength(2);
    });

    it('is idempotent', () => {
        const local = data({ solves: [solve('a', T1)], currentGame: game(T1, ['R']), settingsUpdatedAt: T1 });
        const remote = data({ solves: [solve('b', T2)], currentGame: game(T2, ['U']), settingsUpdatedAt: T2 });
        const once = mergeGameData(local, remote);
        expect(mergeGameData(once, remote)).toEqual(once);
        expect(mergeGameData(once, once)).toEqual(once);
    });
});
