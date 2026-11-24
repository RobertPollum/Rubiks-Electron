import { FACES } from './notation';
import type { Face, Move } from './types';

/**
 * Generate a random scramble of `count` quarter turns, never turning the
 * same face twice in a row. `random` is injectable so scrambles can be
 * reproduced in tests.
 */
export function generateScramble(count: number, random: () => number = Math.random): Move[] {
    const moves: Move[] = [];
    let lastFace: Face | null = null;
    for (let i = 0; i < count; i++) {
        let face: Face;
        do {
            face = FACES[Math.floor(random() * FACES.length)];
        } while (face === lastFace);
        lastFace = face;
        const clockwise = random() < 0.5;
        moves.push({ face, clockwise });
    }
    return moves;
}
