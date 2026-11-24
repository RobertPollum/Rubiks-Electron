import { describe, it, expect } from 'vitest';
import {
    getSlots, FACE_ORDER, maxLayer, createSolvedState, applyMove, applyMoves, invertMoves,
    isSolved, statesEqual, serializeState, deserializeState
} from './cubeModel';
import { parseAlgorithmMoves, parseNotationToMove } from './notation';
import type { Vec3 } from './cubeModel';
import type { CubeState, Face, Move } from './types';

const COLOR = Object.fromEntries(FACE_ORDER.map((f, i) => [f, i])) as Record<Face, number>;
const SLOTS = getSlots(3);
const solved = createSolvedState();
const run = (notation: string) => applyMoves(solved, parseAlgorithmMoves(notation));
const move = (n: string) => parseNotationToMove(n) as Move;

/** Colours of the stickers on `face` whose position matches `where`. */
function stickers(state: CubeState, face: Face, where: (pos: Vec3) => boolean): number[] {
    return SLOTS.flatMap((s, i) => (s.face === face && where(s.pos) ? [state[i]] : []));
}
const all = (colours: number[], c: number) => colours.length > 0 && colours.every(x => x === c);

describe('cube model', () => {
    it('has 54 stickers, 9 per face (3x3x3)', () => {
        expect(SLOTS).toHaveLength(54);
        for (const face of FACE_ORDER) expect(SLOTS.filter(s => s.face === face)).toHaveLength(9);
        expect(isSolved(solved)).toBe(true);
    });

    describe('face turns follow standard notation', () => {
        it('R moves the front right column up', () => {
            const s = run('R');
            expect(all(stickers(s, 'U', (p: Vec3) => p[0] > 0), COLOR.F)).toBe(true);
            expect(all(stickers(s, 'F', (p: Vec3) => p[0] > 0), COLOR.D)).toBe(true);
        });
        it('L moves the front left column down', () => {
            expect(all(stickers(run('L'), 'D', (p: Vec3) => p[0] < 0), COLOR.F)).toBe(true);
        });
        it('U brings the right face to the front', () => {
            expect(all(stickers(run('U'), 'F', (p: Vec3) => p[1] > 0), COLOR.R)).toBe(true);
        });
        it('D brings the left face to the front', () => {
            expect(all(stickers(run('D'), 'F', (p: Vec3) => p[1] < 0), COLOR.L)).toBe(true);
        });
        it('F moves the top row onto the right face', () => {
            expect(all(stickers(run('F'), 'R', (p: Vec3) => p[2] > 0), COLOR.U)).toBe(true);
        });
        it('B moves the top row onto the left face', () => {
            expect(all(stickers(run('B'), 'L', (p: Vec3) => p[2] < 0), COLOR.U)).toBe(true);
        });
        it("R' undoes R", () => {
            expect(statesEqual(applyMove(run('R'), move("R'")), solved)).toBe(true);
        });
    });

    describe('whole-cube rotations', () => {
        it('x follows R (front goes up), y follows U, z follows F', () => {
            expect(all(stickers(run('x'), 'U', () => true), COLOR.F)).toBe(true);
            expect(all(stickers(run('y'), 'F', () => true), COLOR.R)).toBe(true);
            expect(all(stickers(run('z'), 'R', () => true), COLOR.U)).toBe(true);
        });
        it('do not unsolve the cube', () => {
            for (const n of ['x', "x'", 'y', "y'", 'z', "z'"]) expect(isSolved(run(n))).toBe(true);
        });
        it('change which physical face a turn acts on', () => {
            // After x the old front face is on top, so U turns it: x U x' == F
            expect(statesEqual(run("x U x'"), run('F'))).toBe(true);
        });
    });

    describe('known sequences', () => {
        it.each(['R', 'U', 'F', 'L', 'D', 'B'])('%s four times is identity, twice is not', m => {
            expect(isSolved(run(`${m} ${m} ${m} ${m}`))).toBe(true);
            expect(isSolved(run(`${m} ${m}`))).toBe(false);
        });
        it('the sexy move has order 6', () => {
            const sexy = "R U R' U' ";
            expect(isSolved(run(sexy.repeat(6)))).toBe(true);
            for (let k = 1; k < 6; k++) expect(isSolved(run(sexy.repeat(k)))).toBe(false);
        });
        it('superflip flips every edge and has order 2', () => {
            const superflip = "U R2 F B R B2 R U2 L B2 R U' D' R2 F R' L B2 U2 F2";
            const s = run(superflip);
            expect(isSolved(s)).toBe(false);
            // centres and corners untouched: every sticker not on an edge is home
            SLOTS.forEach((slot, i) => {
                const zeros = slot.pos.filter(c => c === 0).length;
                if (zeros !== 1) expect(s[i]).toBe(solved[i]);
                else expect(s[i]).not.toBe(solved[i]);
            });
            expect(isSolved(applyMoves(s, parseAlgorithmMoves(superflip)))).toBe(true);
        });
        it('a scramble followed by its inverse is solved', () => {
            const moves = parseAlgorithmMoves("R U' F2 L D B' x R' y' U2 z F");
            expect(isSolved(applyMoves(applyMoves(solved, moves), invertMoves(moves)))).toBe(true);
        });
    });

    describe('serialisation', () => {
        it('round-trips', () => {
            const s = run("R U F' L2 D B'");
            expect(deserializeState(serializeState(s))).toEqual(s);
        });
        it('rejects invalid data', () => {
            expect(deserializeState('0'.repeat(54))).toBeNull();
            expect(deserializeState('012')).toBeNull();
            expect(deserializeState(null)).toBeNull();
        });
    });

    describe('other sizes', () => {
        const runOn = (size: number, notation: string) => applyMoves(createSolvedState(size), parseAlgorithmMoves(notation));

        it.each([2, 3, 4, 5, 6, 7])('a %i-cube has 6 x n x n stickers and starts solved', size => {
            const state = createSolvedState(size);
            expect(state).toHaveLength(6 * size * size);
            expect(isSolved(state)).toBe(true);
            expect(deserializeState(serializeState(state))).toEqual(state);
        });

        it('R on a 2x2 moves the front right column up', () => {
            const s = runOn(2, 'R');
            const slots = getSlots(2);
            const u = slots.flatMap((sl, i) => (sl.face === 'U' && sl.pos[0] > 0 ? [s[i]] : []));
            expect(u).toEqual([COLOR.F, COLOR.F]);
        });

        it('inner layers turn independently of the face (4x4)', () => {
            const outer = runOn(4, 'R');
            const inner = runOn(4, '2R');
            expect(statesEqual(outer, inner)).toBe(false);
            // 2R leaves the R face itself untouched
            const slots = getSlots(4);
            slots.forEach((sl, i) => { if (sl.face === 'R') expect(inner[i]).toBe(COLOR.R); });
            expect(isSolved(runOn(4, '2R 2R 2R 2R'))).toBe(true);
            expect(isSolved(runOn(4, "2R U 2F' 2U2 2U2 2F U' 2R'"))).toBe(true);
        });

        it("on a 3x3 the middle layer 2R is the slice between R and L (R 2R L' == x)", () => {
            expect(statesEqual(run("R 2R L'"), run('x'))).toBe(true);
        });

        it('a full scramble and its inverse return to solved on big cubes', () => {
            for (const size of [4, 5, 7]) {
                const moves = parseAlgorithmMoves("R 2U' 3F B2 x 2L D' 2B y' 3R");
                const valid = moves.filter(m => (m.layer ?? 1) <= maxLayer(size));
                const scrambled = applyMoves(createSolvedState(size), valid);
                expect(isSolved(scrambled)).toBe(false);
                expect(isSolved(applyMoves(scrambled, invertMoves(valid)))).toBe(true);
            }
        });

        it('rejects saved states of unsupported sizes', () => {
            expect(deserializeState('0'.repeat(6))).toBeNull(); // 1x1
            expect(deserializeState('012345'.repeat(64 / 6 * 6))).toBeNull();
        });
    });
});
