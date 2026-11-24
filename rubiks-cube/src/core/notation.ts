// Move notation helpers (standard Singmaster-style face letters).
// Pure functions: no DOM, no three.js.

import type { Axis, Face, Move } from './types';

/** Face letters that can be turned. */
export const FACES: readonly Face[] = ['R', 'L', 'U', 'D', 'F', 'B'];

/** Axes the whole cube can be rotated around. */
export const CUBE_AXES: readonly Axis[] = ['x', 'y', 'z'];

/** Human-readable names used in UI feedback. */
export const FACE_NAMES: Record<Face, string> = {
    R: 'Right',
    L: 'Left',
    U: 'Up',
    D: 'Down',
    F: 'Front',
    B: 'Back'
};

export function isAxis(value: string): value is Axis {
    return (CUBE_AXES as readonly string[]).includes(value);
}

export function isFace(value: string): value is Face {
    return (FACES as readonly string[]).includes(value);
}

/** True for whole-cube rotations (x, y, z), which reorient the cube but aren't counted as moves. */
export function isCubeRotation(move: Move): boolean {
    return isAxis(move.face);
}

/** Layer depth of a move (1 = outer face). */
export function moveLayer(move: Move): number {
    return move.layer ?? 1;
}

/** { face: 'R', clockwise: false } -> "R'";  { face: 'R', clockwise: true, layer: 2 } -> "2R" */
export function formatMoveNotation(move: Move): string {
    const layer = moveLayer(move);
    return `${layer > 1 ? layer : ''}${move.face}${move.clockwise ? '' : "'"}`;
}

const NOTATION = /^([1-9]?)([RLUDFBxyz])(')?$/;

/** "R'" -> { face: 'R', clockwise: false }; "2R" -> inner layer. Quarter turns only; null if not a known move. */
export function parseNotationToMove(notation: unknown): Move | null {
    if (typeof notation !== 'string') return null;
    const match = NOTATION.exec(notation);
    if (!match) return null;
    const [, layerText, face, prime] = match;
    if (!isFace(face) && !isAxis(face)) return null;
    const move: Move = { face, clockwise: !prime };
    if (layerText && layerText !== '1') {
        if (isAxis(face)) return null; // whole-cube rotations have no layers
        move.layer = Number(layerText);
    }
    return move;
}

/**
 * Parse a space-separated algorithm ("R U2 R' U'") into quarter-turn moves.
 * Double turns ("U2") expand into two quarter turns. Unknown moves are skipped.
 */
export function parseAlgorithmMoves(moveString: string): Move[] {
    if (!moveString || !moveString.trim()) return [];
    return moveString.trim().split(/\s+/).flatMap(token => {
        const double = /2'?$/.test(token); // "U2" or "U2'" (but not the layer prefix in "2R")
        const move = parseNotationToMove(double ? token.replace(/2('?)$/, '$1') : token);
        if (!move) return [];
        return double ? [move, { ...move }] : [move];
    });
}
