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

export const SAVE_VERSION = 2;
const CUBE_STATES = ['solved', 'scrambled', 'solving'];

/** Plain-object form of the current game, ready to persist. */
export function createSavedGame({ start, scramble = [], moveHistory = [], cubeState }) {
    return {
        version: SAVE_VERSION,
        cubeState,
        start: serializeState(start),
        scramble: scramble.map(formatMoveNotation),
        moveHistory
    };
}

/**
 * Turn saved data back into a game.
 * @returns {{ start: number[], cube: number[], scramble: object[], moveHistory: object[], cubeState: string, migrated: boolean } | null}
 */
export function loadSavedGame(saved) {
    if (!saved || typeof saved !== 'object') return null;
    if (saved.version === SAVE_VERSION) return loadCurrent(saved);
    if (saved.cubies) return migrateVersion1(saved);
    return null;
}

/** Number of moves that count toward the move total (whole-cube rotations don't). */
export function countMoves(moveHistory) {
    return moveHistory.filter(entry => {
        const move = parseNotationToMove(entry.notation);
        return move && !isCubeRotation(move);
    }).length;
}

function parseHistory(moveHistory) {
    if (!Array.isArray(moveHistory)) return null;
    const moves = moveHistory.map(entry => entry && parseNotationToMove(entry.notation));
    return moves.every(Boolean) ? moves : null;
}

function resolveCubeState(cubeState, cube, moveCount) {
    if (isSolved(cube)) return cubeState === 'solved' || moveCount === 0 ? 'solved' : cubeState;
    if (CUBE_STATES.includes(cubeState) && cubeState !== 'solved') return cubeState;
    return moveCount > 0 ? 'solving' : 'scrambled';
}

function loadCurrent(saved) {
    const start = deserializeState(saved.start);
    const moves = parseHistory(saved.moveHistory);
    if (!start || !moves) return null;
    const scramble = (Array.isArray(saved.scramble) ? saved.scramble : [])
        .map(parseNotationToMove)
        .filter(Boolean);
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
export function migrateVersion1Notation(notation) {
    const move = parseNotationToMove(notation);
    if (!move) return notation;
    if (['R', 'U', 'F'].includes(move.face)) move.clockwise = !move.clockwise;
    return formatMoveNotation(move);
}

/** Rotate vector v by unit quaternion q ({x, y, z, w}). */
function rotateByQuaternion([vx, vy, vz], q) {
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
export function stateFromVersion1Cubies(cubies) {
    if (!Array.isArray(cubies) || cubies.length !== 27) return null;
    const state = new Array(54).fill(-1);
    for (const cubie of cubies) {
        if (!cubie || !cubie.position || !cubie.quaternion) return null;
        const pos = ['x', 'y', 'z'].map(k => Math.round(cubie.position[k] / V1_SPACING));
        if (pos.some(c => Math.abs(c) > 1)) return null;
        FACE_ORDER.forEach((face, colour) => {
            const facing = rotateByQuaternion(FACE_NORMALS[face], cubie.quaternion).map(Math.round);
            const slot = findSlot(pos, facing);
            if (slot >= 0) state[slot] = colour;
        });
    }
    return isValidState(state) ? state : null;
}

function migrateVersion1(saved) {
    const cube = stateFromVersion1Cubies(saved.cubies);
    if (!cube) return null;
    const moveHistory = (Array.isArray(saved.moveHistory) ? saved.moveHistory : [])
        .map(entry => ({ ...entry, notation: migrateVersion1Notation(entry.notation) }));
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
