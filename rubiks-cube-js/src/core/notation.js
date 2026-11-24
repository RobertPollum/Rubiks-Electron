// Move notation helpers (standard Singmaster-style face letters).
// Pure functions: no DOM, no three.js.

/** Face letters that can be turned. */
export const FACES = ['R', 'L', 'U', 'D', 'F', 'B'];

/** Axes the whole cube can be rotated around. */
export const CUBE_AXES = ['x', 'y', 'z'];

/** Human-readable names used in UI feedback. */
export const FACE_NAMES = {
    R: 'Right',
    L: 'Left',
    U: 'Up',
    D: 'Down',
    F: 'Front',
    B: 'Back'
};

/** { face: 'R', clockwise: false } -> "R'" */
export function formatMoveNotation(face, clockwise) {
    return clockwise ? face : face + "'";
}

/** "R'" -> { face: 'R', clockwise: false }. Single quarter turns only. */
export function parseNotationToMove(notation) {
    const isPrime = notation.endsWith("'");
    const face = isPrime ? notation.slice(0, -1) : notation;
    return { face, clockwise: !isPrime };
}

/**
 * Parse a space-separated algorithm ("R U2 R' U'") into quarter-turn moves.
 * Double turns ("U2") expand into two quarter turns.
 */
export function parseAlgorithmMoves(moveString) {
    if (!moveString || !moveString.trim()) return [];
    return moveString.trim().split(/\s+/).map(notation => {
        const has2 = notation.includes('2');
        const isPrime = notation.includes("'");
        const face = notation.replace(/['2]/g, '');
        const clockwise = !isPrime;
        const moves = [{ face, clockwise }];
        if (has2) moves.push({ face, clockwise });
        return moves;
    }).flat();
}
