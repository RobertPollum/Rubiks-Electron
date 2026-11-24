import { FACES } from './notation';

/**
 * Generate a random scramble of `count` quarter turns, never turning the
 * same face twice in a row. `random` is injectable so scrambles can be
 * reproduced in tests.
 * @returns {{ face: string, clockwise: boolean }[]}
 */
export function generateScramble(count, random = Math.random) {
    const moves = [];
    let lastFace = null;
    for (let i = 0; i < count; i++) {
        let face;
        do {
            face = FACES[Math.floor(random() * FACES.length)];
        } while (face === lastFace);
        lastFace = face;
        const clockwise = random() < 0.5;
        moves.push({ face, clockwise });
    }
    return moves;
}
