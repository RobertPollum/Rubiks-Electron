// The cube as data: sticker colours, and moves as pure functions.
//
// A cube state is an array of 6 x N x N colour indices (0-5) for an N x N x N
// cube (54 for the standard 3 x 3 x 3). Each index refers to a sticker
// "slot": a cubie position plus the direction the sticker faces. Colour
// index i is the colour that starts on face FACE_ORDER[i], which is also the
// order of theme colours and of three.js box material groups.
//
// Coordinates: x = right, y = up, z = front. Positions are "doubled" so they
// stay whole numbers for every size: an N-cube's cubies sit at
// -(N-1), -(N-1)+2, ..., N-1 on each axis (for 3 x 3 x 3: -2, 0, 2).
// Every move is derived from geometry (rotate positions and facing
// directions a quarter turn), so face turns, inner-layer turns, whole-cube
// rotations and the 3D view all share one definition.

import { isAxis, moveLayer } from './notation';
import { MIN_CUBE_SIZE, MAX_CUBE_SIZE } from './types';
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

export const DEFAULT_CUBE_SIZE = 3;

const AXIS_NAMES: readonly Axis[] = ['x', 'y', 'z'];

const vecKey = (v: Vec3) => v.map(c => (c === 0 ? 0 : c)).join(','); // normalise -0
const slotKey = (pos: Vec3, normal: Vec3) => `${vecKey(pos)}|${vecKey(normal)}`;
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export function isValidCubeSize(size: unknown): size is number {
    return Number.isInteger(size) && (size as number) >= MIN_CUBE_SIZE && (size as number) <= MAX_CUBE_SIZE;
}

/** Cubie coordinates along one axis for a cube of `size`: -(size-1) .. size-1 in steps of 2. */
export function gridCoords(size: number): number[] {
    return Array.from({ length: size }, (_, i) => 2 * i - (size - 1));
}

/** Deepest layer worth turning from one face: deeper ones are the opposite face's layers. */
export function maxLayer(size: number): number {
    return Math.ceil(size / 2);
}

// ---- Per-size geometry (built once per size) --------------------------------

interface Geometry {
    size: number;
    slots: Slot[];
    slotIndex: Map<string, number>;
    faceSlots: number[][];
    permutations: Map<string, number[]>;
}

const geometries = new Map<number, Geometry>();

function geometry(size: number): Geometry {
    let geo = geometries.get(size);
    if (geo) return geo;
    if (!isValidCubeSize(size)) throw new Error(`Unsupported cube size: ${size}`);

    const outer = size - 1;
    const coords = gridCoords(size);
    const slots: Slot[] = [];
    for (const face of FACE_ORDER) {
        const normal = FACE_NORMALS[face];
        for (const x of coords) {
            for (const y of coords) {
                for (const z of coords) {
                    const pos: Vec3 = [x, y, z];
                    if (dot(pos, normal) === outer) slots.push({ face, pos, normal });
                }
            }
        }
    }
    geo = {
        size,
        slots,
        slotIndex: new Map(slots.map((s, i) => [slotKey(s.pos, s.normal), i])),
        faceSlots: FACE_ORDER.map(face => slots.flatMap((s, i) => (s.face === face ? [i] : []))),
        permutations: new Map()
    };
    geometries.set(size, geo);
    return geo;
}

/** All sticker slots for a cube of `size`, grouped by face in FACE_ORDER. */
export function getSlots(size: number = DEFAULT_CUBE_SIZE): readonly Slot[] {
    return geometry(size).slots;
}

/** Size of the cube a state describes (6 x size x size stickers). */
export function cubeSizeOf(state: CubeState): number {
    return Math.round(Math.sqrt(state.length / 6));
}

/** Slot index of the sticker at `pos` facing `normal`, or -1 if there is none (an inner face). */
export function findSlot(pos: Vec3, normal: Vec3, size: number = DEFAULT_CUBE_SIZE): number {
    return geometry(size).slotIndex.get(slotKey(pos, normal)) ?? -1;
}

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
 * R face; "2R" turns the layer behind it the same way. Whole-cube rotations
 * follow R (x), U (y) and F (z).
 */
export function getMoveSpec(move: Move, size: number = DEFAULT_CUBE_SIZE): MoveSpec {
    const { face, clockwise } = move;
    const turn = clockwise ? -1 : 1;
    if (isAxis(face)) {
        return { axis: face, direction: turn, inLayer: () => true };
    }
    const normal = FACE_NORMALS[face];
    if (!normal) throw new Error(`Unknown move: ${face}`);
    const axisIndex = normal.findIndex(c => c !== 0);
    const side = normal[axisIndex] as 1 | -1;
    const layer = moveLayer(move);
    if (!Number.isInteger(layer) || layer < 1 || layer > size) throw new Error(`No layer ${layer} on a ${size}-cube`);
    const depth = size - 1 - 2 * (layer - 1); // coordinate of that layer, measured from the centre
    return {
        axis: AXIS_NAMES[axisIndex],
        direction: (turn * side) as 1 | -1,
        inLayer: pos => pos[axisIndex] * side === depth
    };
}

/** Whether `move` can be made on a cube of `size`. */
export function isMoveValidForSize(move: Move, size: number): boolean {
    const layer = moveLayer(move);
    return isAxis(move.face) ? layer === 1 : Number.isInteger(layer) && layer >= 1 && layer <= maxLayer(size);
}

/** perm[target] = source slot, for one move on one cube size. */
function getPermutation(move: Move, size: number): number[] {
    const geo = geometry(size);
    const key = `${moveLayer(move)}${move.face}${move.clockwise ? '' : "'"}`;
    let perm = geo.permutations.get(key);
    if (perm) return perm;

    const { axis, direction, inLayer } = getMoveSpec(move, size);
    const permutation = geo.slots.map((_, i) => i);
    geo.slots.forEach((slot, source) => {
        if (!inLayer(slot.pos)) return;
        const target = findSlot(rotateVector(slot.pos, axis, direction), rotateVector(slot.normal, axis, direction), size);
        permutation[target] = source;
    });
    geo.permutations.set(key, permutation);
    return permutation;
}

/** A solved cube. */
export function createSolvedState(size: number = DEFAULT_CUBE_SIZE): CubeState {
    return geometry(size).slots.map(slot => FACE_ORDER.indexOf(slot.face));
}

/** Apply one move, returning a new state. */
export function applyMove(state: CubeState, move: Move): CubeState {
    return getPermutation(move, cubeSizeOf(state)).map(source => state[source]);
}

export function applyMoves(state: CubeState, moves: readonly Move[]): CubeState {
    return moves.reduce(applyMove, state);
}

export function invertMove(move: Move): Move {
    return { ...move, clockwise: !move.clockwise };
}

/** The sequence that undoes `moves`. */
export function invertMoves(moves: readonly Move[]): Move[] {
    return moves.slice().reverse().map(invertMove);
}

/** Every face shows a single colour (whatever the cube's orientation). */
export function isSolved(state: CubeState): boolean {
    return geometry(cubeSizeOf(state)).faceSlots.every(slots => slots.every(i => state[i] === state[slots[0]]));
}

export function statesEqual(a: CubeState, b: CubeState): boolean {
    return a.length === b.length && a.every((c, i) => c === b[i]);
}

/** Compact string form for saving, e.g. "000000000111111111..." (length 6 x size x size). */
export function serializeState(state: CubeState): string {
    return state.join('');
}

/** Parse serializeState output. Returns null if it isn't a valid cube. */
export function deserializeState(text: unknown): CubeState | null {
    if (typeof text !== 'string' || !/^[0-5]+$/.test(text)) return null;
    const state = Array.from(text, Number);
    return isValidState(state) ? state : null;
}

/** 6 x size x size stickers, for a supported size, with size x size of each colour. */
export function isValidState(state: unknown): state is CubeState {
    if (!Array.isArray(state)) return false;
    const size = Math.round(Math.sqrt(state.length / 6));
    if (!isValidCubeSize(size) || state.length !== 6 * size * size) return false;
    const counts = [0, 0, 0, 0, 0, 0];
    for (const c of state) {
        if (!Number.isInteger(c) || c < 0 || c > 5) return false;
        counts[c]++;
    }
    return counts.every(n => n === size * size);
}
