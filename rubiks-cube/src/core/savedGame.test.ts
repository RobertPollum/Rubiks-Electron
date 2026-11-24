import { describe, it, expect } from 'vitest';
import v1 from './__fixtures__/v1-saves.json';
import {
    createSavedGame, loadSavedGame, countMoves,
    stateFromVersion1Cubies, migrateVersion1Notation
} from './savedGame';
import { createSolvedState, applyMove, applyMoves, isSolved, statesEqual, isValidState } from './cubeModel';
import { parseAlgorithmMoves, parseNotationToMove } from './notation';
import type { CubeState, Move } from './types';
import type { LoadedGame } from './savedGame';

/** loadSavedGame, failing the test if it returns null. */
function load(saved: unknown): LoadedGame {
    const loaded = loadSavedGame(saved);
    if (!loaded) throw new Error('expected a saved game to load');
    return loaded;
}

/** stateFromVersion1Cubies, failing the test if it returns null. */
function v1State(cubies: unknown): CubeState {
    const state = stateFromVersion1Cubies(cubies);
    if (!state) throw new Error('expected valid version 1 cubies');
    return state;
}

type Fixture = { cubies: unknown; moveHistory: { notation: string }[] };
const fixture = v1 as unknown as Record<string, Fixture>;

const history = (notation: string) => notation.split(' ').map(n => ({ notation: n, timestamp: 1 }));

describe('saved game (current format)', () => {
    it('round-trips through JSON and rebuilds the cube from start + moves', () => {
        const start = applyMoves(createSolvedState(), parseAlgorithmMoves("R U F' D"));
        const moveHistory = history("D' x F U'");
        const saved = JSON.parse(JSON.stringify(createSavedGame({
            start, scramble: parseAlgorithmMoves("R U F' D"), moveHistory, cubeState: 'solving'
        })));
        const loaded = load(saved);
        expect(loaded.start).toEqual(start);
        expect(loaded.scramble.map(m => m.face)).toEqual(['R', 'U', 'F', 'D']);
        expect(loaded.cube).toEqual(applyMoves(start, moveHistory.map(m => parseNotationToMove(m.notation) as Move)));
        expect(loaded.cubeState).toBe('solving');
        expect(loaded.migrated).toBe(false);
    });

    it('rejects missing or corrupt data', () => {
        expect(loadSavedGame(null)).toBeNull();
        expect(loadSavedGame({ version: 2, start: null, moveHistory: [] })).toBeNull();
        expect(loadSavedGame({ version: 2, start: '0'.repeat(54), moveHistory: [] })).toBeNull();
        const start = createSavedGame({ start: createSolvedState(), cubeState: 'solved' }).start;
        expect(loadSavedGame({ version: 2, start, moveHistory: [{ notation: 'Q' }] })).toBeNull();
    });

    it('counts face turns but not whole-cube rotations', () => {
        expect(countMoves(history("R x U' y' F z"))).toBe(3);
    });
});

describe('version 1 saves', () => {
    it('reads cubie transforms into a valid cube', () => {
        for (const key of ['afterScramble', 'afterMoves', 'oneStart', 'oneR', 'withRotation']) {
            expect(isValidState(stateFromVersion1Cubies(fixture[key].cubies)), key).toBe(true);
        }
    });

    it("v1's R key turned the cube like a standard R'", () => {
        const before = v1State(fixture.oneStart.cubies);
        const after = v1State(fixture.oneR.cubies);
        expect(fixture.oneR.moveHistory.map(m => m.notation)).toEqual(['R']);
        expect(statesEqual(after, applyMove(before, parseNotationToMove("R'") as Move))).toBe(true);
        expect(statesEqual(after, applyMove(before, parseNotationToMove('R') as Move))).toBe(false);
    });

    it('flips R, U and F (only) when migrating notation', () => {
        expect(['R', "R'", 'U', "U'", 'F', "F'", 'L', "D'", 'B'].map(migrateVersion1Notation))
            .toEqual(["R'", 'R', "U'", 'U', "F'", 'F', 'L', "D'", 'B']);
    });

    it('migrates a game in progress: current cube, corrected history, and where it started', () => {
        const loaded = load(fixture.afterMoves);
        expect(loaded.migrated).toBe(true);
        expect(statesEqual(loaded.cube, v1State(fixture.afterMoves.cubies))).toBe(true);
        // The recorded start must equal the cube right after the scramble.
        expect(statesEqual(loaded.start, v1State(fixture.afterScramble.cubies))).toBe(true);
        expect(loaded.moveHistory.map(m => m.notation)).toEqual(["R'", "U'", 'F', 'L', "D'", 'B']);
        expect(loaded.cubeState).toBe('solving');
        expect(isSolved(loaded.cube)).toBe(false);
    });

    it('still loads the current cube when the history had unrecorded rotations', () => {
        const loaded = load(fixture.withRotation);
        expect(statesEqual(loaded.cube, v1State(fixture.withRotation.cubies))).toBe(true);
    });
});
