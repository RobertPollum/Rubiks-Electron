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

/** { face: 'R', clockwise: false } -> "R'" */
export function formatMoveNotation({ face, clockwise }: Move): string {
    return clockwise ? face : face + "'";
}

/** "R'" -> { face: 'R', clockwise: false }. Single quarter turns only; null if not a known move. */
export function parseNotationToMove(notation: unknown): Move | null {
    if (typeof notation !== 'string') return null;
    const isPrime = notation.endsWith("'");
    const face = isPrime ? notation.slice(0, -1) : notation;
    if (!isFace(face) && !isAxis(face)) return null;
    return { face, clockwise: !isPrime };
}

/**
 * Parse a space-separated algorithm ("R U2 R' U'") into quarter-turn moves.
 * Double turns ("U2") expand into two quarter turns. Unknown moves are skipped.
 */
export function parseAlgorithmMoves(moveString: string): Move[] {
    if (!moveString || !moveString.trim()) return [];
    return moveString.trim().split(/\s+/).flatMap(token => {
        const move = parseNotationToMove(token.replace('2', ''));
        if (!move) return [];
        return token.includes('2') ? [move, { ...move }] : [move];
    });
}
