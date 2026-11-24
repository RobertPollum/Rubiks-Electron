import { FACES } from './notation';
import type { Face, Move } from './types';
import { DEFAULT_CUBE_SIZE, maxLayer } from './cubeModel';

/**
 * Generate a random scramble of `count` quarter turns for a cube of `size`,
 * never turning the same face twice in a row. Cubes bigger than 3x3x3 also
 * get inner-layer turns, which they need to be properly mixed.
 * `random` is injectable so scrambles can be reproduced in tests.
 */
export function generateScramble(count: number, random: () => number = Math.random, size: number = DEFAULT_CUBE_SIZE): Move[] {
    const deepest = size > 3 ? maxLayer(size) : 1;
    const moves: Move[] = [];
    let lastFace: Face | null = null;
    for (let i = 0; i < count; i++) {
        let face: Face;
        do {
            face = FACES[Math.floor(random() * FACES.length)];
        } while (face === lastFace);
        lastFace = face;
        const clockwise = random() < 0.5;
        const layer = deepest > 1 ? 1 + Math.floor(random() * deepest) : 1;
        moves.push(layer > 1 ? { face, clockwise, layer } : { face, clockwise });
    }
    return moves;
}
