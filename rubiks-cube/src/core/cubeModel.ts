// The cube as data: 54 sticker colours, and moves as pure functions.
//
// A cube state is an array of 54 colour indices (0-5). Each index refers to
// a sticker "slot": a cubie position plus the direction the sticker faces.
// Colour index i is the colour that starts on face FACE_ORDER[i], which is
// also the order of theme colours and of three.js box material groups.
//
// Coordinates: x = right, y = up, z = front; cubie positions are -1, 0 or 1.
// Every move is derived from geometry (rotate positions and facing
// directions a quarter turn), so face turns, whole-cube rotations and the
// 3D view all share one definition.

import { isAxis } from './notation';
import type { Axis, CubeState, Face, Move } from './types';

/** Integer 3D vector: [x, y, z]. */
export type Vec3 = [number, number, number];

/** One sticker position: which face it belongs to, the cubie it sits on, and the way it faces. */
export interface Slot {
    face: Face;
    pos: Vec3;
    normal: Vec3;
}

/** How a move turns the cube; shared by the model and the 3D view. */
export interface MoveSpec {
    axis: Axis;
    /** +1 = counter-clockwise looking from the positive end of the axis; -1 = clockwise. */
    direction: 1 | -1;
    /** Whether the cubie at `pos` moves. */
    inLayer: (pos: Vec3) => boolean;
}

/** Face order used for colour indices: +X, -X, +Y, -Y, +Z, -Z. */
export const FACE_ORDER: readonly Face[] = ['R', 'L', 'U', 'D', 'F', 'B'];

/** Outward direction of each face. */
export const FACE_NORMALS: Record<Face, Vec3> = {
    R: [1, 0, 0],
    L: [-1, 0, 0],
    U: [0, 1, 0],
    D: [0, -1, 0],
    F: [0, 0, 1],
    B: [0, 0, -1]
};

const AXIS_NAMES: readonly Axis[] = ['x', 'y', 'z'];
const STICKER_COUNT = 54;

const vecKey = (v: Vec3) => v.map(c => (c === 0 ? 0 : c)).join(','); // normalise -0
const slotKey = (pos: Vec3, normal: Vec3) => `${vecKey(pos)}|${vecKey(normal)}`;
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** All 54 sticker slots, grouped by face in FACE_ORDER (9 per face). */
export const SLOTS: readonly Slot[] = (() => {
    const slots: Slot[] = [];
    for (const face of FACE_ORDER) {
        const normal = FACE_NORMALS[face];
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                for (let z = -1; z <= 1; z++) {
                    const pos: Vec3 = [x, y, z];
                    if (dot(pos, normal) === 1) slots.push({ face, pos, normal });
                }
            }
        }
    }
    return slots;
})();

const SLOT_INDEX = new Map(SLOTS.map((s, i) => [slotKey(s.pos, s.normal), i]));

/** Slot index of the sticker at `pos` facing `normal`, or -1 if there is none (an inner face). */
export function findSlot(pos: Vec3, normal: Vec3): number {
    const index = SLOT_INDEX.get(slotKey(pos, normal));
    return index === undefined ? -1 : index;
}

const FACE_SLOTS = FACE_ORDER.map(face =>
    SLOTS.map((s, i) => (s.face === face ? i : -1)).filter(i => i >= 0)
);

/**
 * Rotate an integer vector a quarter turn about a coordinate axis.
 * direction +1 = counter-clockwise looking from the positive end of the axis
 * (right-hand rule, same as three.js); -1 = clockwise.
 */
export function rotateVector([x, y, z]: Vec3, axis: Axis, direction: number): Vec3 {
    const d = direction;
    switch (axis) {
        case 'x': return [x, -d * z, d * y];
        case 'y': return [d * z, y, -d * x];
        case 'z': return [-d * y, d * x, z];
        default: throw new Error(`Unknown axis: ${axis}`);
    }
}

/**
 * Geometry of a move: which axis it turns about, which way, and which
 * cubies it moves.
 *
 * Face turns follow standard notation: "R" is clockwise when looking at the
 * R face. Whole-cube rotations follow R (x), U (y) and F (z).
 */
export function getMoveSpec({ face, clockwise }: Move): MoveSpec {
    const turn = clockwise ? -1 : 1;
    if (isAxis(face)) {
        return { axis: face, direction: turn, inLayer: () => true };
    }
    const normal = FACE_NORMALS[face];
    if (!normal) throw new Error(`Unknown move: ${face}`);
    const axisIndex = normal.findIndex(c => c !== 0);
    const side = normal[axisIndex] as 1 | -1;
    return {
        axis: AXIS_NAMES[axisIndex],
        direction: turn * side as 1 | -1,
        inLayer: pos => pos[axisIndex] === side
    };
}

const permutationCache = new Map<string, number[]>();

/** perm[target] = source slot, for one move. */
function getPermutation(move: Move): number[] {
    const key = `${move.face}${move.clockwise ? '' : "'"}`;
    let perm = permutationCache.get(key);
    if (perm) return perm;

    const { axis, direction, inLayer } = getMoveSpec(move);
    perm = SLOTS.map((_, i) => i);
    SLOTS.forEach((slot, source) => {
        if (!inLayer(slot.pos)) return;
        const target = findSlot(rotateVector(slot.pos, axis, direction), rotateVector(slot.normal, axis, direction));
        perm[target] = source;
    });
    permutationCache.set(key, perm);
    return perm;
}

/** A solved cube. */
export function createSolvedState(): CubeState {
    return SLOTS.map(slot => FACE_ORDER.indexOf(slot.face));
}

/** Apply one move, returning a new state. */
export function applyMove(state: CubeState, move: Move): CubeState {
    return getPermutation(move).map(source => state[source]);
}

export function applyMoves(state: CubeState, moves: readonly Move[]): CubeState {
    return moves.reduce(applyMove, state);
}

export function invertMove(move: Move): Move {
    return { face: move.face, clockwise: !move.clockwise };
}

/** The sequence that undoes `moves`. */
export function invertMoves(moves: readonly Move[]): Move[] {
    return moves.slice().reverse().map(invertMove);
}

/** Every face shows a single colour (whatever the cube's orientation). */
export function isSolved(state: CubeState): boolean {
    return FACE_SLOTS.every(slots => slots.every(i => state[i] === state[slots[0]]));
}

export function statesEqual(a: CubeState, b: CubeState): boolean {
    return a.length === b.length && a.every((c, i) => c === b[i]);
}

/** Compact string form for saving, e.g. "000000000111111111...". */
export function serializeState(state: CubeState): string {
    return state.join('');
}

/** Parse serializeState output. Returns null if it isn't a valid cube. */
export function deserializeState(text: unknown): CubeState | null {
    if (typeof text !== 'string' || !/^[0-5]{54}$/.test(text)) return null;
    const state = Array.from(text, Number);
    return isValidState(state) ? state : null;
}

/** 54 stickers with exactly nine of each colour. */
export function isValidState(state: unknown): state is CubeState {
    if (!Array.isArray(state) || state.length !== STICKER_COUNT) return false;
    const counts = [0, 0, 0, 0, 0, 0];
    for (const c of state) {
        if (!Number.isInteger(c) || c < 0 || c > 5) return false;
        counts[c]++;
    }
    return counts.every(n => n === 9);
}
