// Saving and loading the game in progress.
//
// A saved game stores where the current attempt started (the cube right
// after the scramble) and the moves made since. The current cube is always
// `start + moves`, so a resumed game can be replayed exactly.
//
// Version 1 saves (before the cube model existed) stored three.js cubie
// transforms instead; loadSavedGame() migrates those.

import {
    FACE_ORDER, FACE_NORMALS, findSlot, applyMoves, invertMoves, isSolved,
    isValidState, serializeState, deserializeState
} from './cubeModel';
import { formatMoveNotation, parseNotationToMove, isCubeRotation } from './notation';
import type { CubeState, CubeStatus, Move, MoveRecord, SavedGame } from './types';
import type { Vec3 } from './cubeModel';

/** A saved game, loaded and checked. */
export interface LoadedGame {
    start: CubeState;
    cube: CubeState;
    scramble: Move[];
    moveHistory: MoveRecord[];
    cubeState: CubeStatus;
    /** True if this came from an older save format (and should be re-saved). */
    migrated: boolean;
}

/** A version 1 cubie: where it was and how it was rotated (three.js units). */
interface Version1Cubie {
    position: { x: number; y: number; z: number };
    quaternion: { x: number; y: number; z: number; w: number };
}

export const SAVE_VERSION = 2;
const CUBE_STATES: readonly CubeStatus[] = ['solved', 'scrambled', 'solving'];

/** Plain-object form of the current game, ready to persist. */
export function createSavedGame({ start, scramble = [], moveHistory = [], cubeState }: {
    start: CubeState; scramble?: Move[]; moveHistory?: MoveRecord[]; cubeState: CubeStatus;
}): SavedGame {
    return {
        version: SAVE_VERSION,
        cubeState,
        start: serializeState(start),
        scramble: scramble.map(formatMoveNotation),
        moveHistory
    };
}

/**
 * Turn saved data back into a game. Returns null if there's nothing usable.
 */
export function loadSavedGame(saved: unknown): LoadedGame | null {
    if (!saved || typeof saved !== 'object') return null;
    const data = saved as Record<string, any>;
    if (data.version === SAVE_VERSION) return loadCurrent(data);
    if (data.cubies) return migrateVersion1(data);
    return null;
}

/** Number of moves that count toward the move total (whole-cube rotations don't). */
export function countMoves(moveHistory: readonly MoveRecord[]): number {
    return moveHistory.filter(entry => {
        const move = parseNotationToMove(entry.notation);
        return move && !isCubeRotation(move);
    }).length;
}

function parseHistory(moveHistory: unknown): Move[] | null {
    if (!Array.isArray(moveHistory)) return null;
    const moves = moveHistory.map(entry => (entry ? parseNotationToMove(entry.notation) : null));
    return moves.every(m => m !== null) ? (moves as Move[]) : null;
}

function resolveCubeState(cubeState: unknown, cube: CubeState, moveCount: number): CubeStatus {
    const known = CUBE_STATES.find(s => s === cubeState);
    if (isSolved(cube)) return known === undefined || moveCount === 0 ? 'solved' : known;
    if (known && known !== 'solved') return known;
    return moveCount > 0 ? 'solving' : 'scrambled';
}

function loadCurrent(saved: Record<string, any>): LoadedGame | null {
    const start = deserializeState(saved.start);
    const moves = parseHistory(saved.moveHistory);
    if (!start || !moves) return null;
    const scramble = (Array.isArray(saved.scramble) ? saved.scramble : [])
        .map(parseNotationToMove)
        .filter((m: Move | null): m is Move => m !== null);
    const cube = applyMoves(start, moves);
    return {
        start,
        cube,
        scramble,
        moveHistory: saved.moveHistory,
        cubeState: resolveCubeState(saved.cubeState, cube, moves.length),
        migrated: false
    };
}

// ---- Version 1 migration ------------------------------------------------

/**
 * Version 1 turned R, U and F the opposite way to standard notation (opposite
 * faces shared one turn direction). Its "R" was really R', so flip those.
 */
export function migrateVersion1Notation(notation: string): string {
    const move = parseNotationToMove(notation);
    if (!move) return notation;
    if (['R', 'U', 'F'].includes(move.face)) move.clockwise = !move.clockwise;
    return formatMoveNotation(move);
}

/** Rotate vector v by unit quaternion q ({x, y, z, w}). */
function rotateByQuaternion([vx, vy, vz]: Vec3, q: Version1Cubie['quaternion']): Vec3 {
    // t = 2 * (q.xyz × v);  v' = v + w * t + q.xyz × t
    const tx = 2 * (q.y * vz - q.z * vy);
    const ty = 2 * (q.z * vx - q.x * vz);
    const tz = 2 * (q.x * vy - q.y * vx);
    return [
        vx + q.w * tx + (q.y * tz - q.z * ty),
        vy + q.w * ty + (q.z * tx - q.x * tz),
        vz + q.w * tz + (q.x * ty - q.y * tx)
    ];
}

const V1_SPACING = 3; // version 1 placed cubies 3 units apart

/**
 * Rebuild sticker colours from version 1 cubie transforms. Every v1 cubie
 * carried all six colours, with colour i on its local face FACE_ORDER[i], so
 * only each cubie's position and rotation matter.
 */
export function stateFromVersion1Cubies(cubies: unknown): CubeState | null {
    if (!Array.isArray(cubies) || cubies.length !== 27) return null;
    const state: number[] = new Array(54).fill(-1);
    for (const cubie of cubies as Version1Cubie[]) {
        if (!cubie || !cubie.position || !cubie.quaternion) return null;
        const { x, y, z } = cubie.position;
        const pos = [x, y, z].map(c => Math.round(c / V1_SPACING)) as Vec3;
        if (pos.some(c => Math.abs(c) > 1)) return null;
        FACE_ORDER.forEach((face, colour) => {
            const facing = rotateByQuaternion(FACE_NORMALS[face], cubie.quaternion).map(Math.round) as Vec3;
            const slot = findSlot(pos, facing);
            if (slot >= 0) state[slot] = colour;
        });
    }
    return isValidState(state) ? state : null;
}

function migrateVersion1(saved: Record<string, any>): LoadedGame | null {
    const cube = stateFromVersion1Cubies(saved.cubies);
    if (!cube) return null;
    const moveHistory = (Array.isArray(saved.moveHistory) ? saved.moveHistory : [])
        .map((entry: MoveRecord) => ({ ...entry, notation: migrateVersion1Notation(entry.notation) }));
    const moves = parseHistory(moveHistory);
    if (!moves) return null;
    // Work back from the current cube to where the attempt started.
    // (v1 didn't record whole-cube rotations, so a history that included
    // them can't be undone exactly; the current cube is still correct.)
    const start = applyMoves(cube, invertMoves(moves));
    return {
        start,
        cube,
        scramble: [],
        moveHistory,
        cubeState: resolveCubeState(saved.cubeState, cube, moves.length),
        migrated: true
    };
}
