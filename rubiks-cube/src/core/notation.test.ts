import { describe, it, expect } from 'vitest';
import { formatMoveNotation, parseNotationToMove, parseAlgorithmMoves } from './notation';

describe('notation', () => {
    it.each([
        ['R', { face: 'R', clockwise: true }],
        ["U'", { face: 'U', clockwise: false }],
        ['x', { face: 'x', clockwise: true }],
        ["2R'", { face: 'R', clockwise: false, layer: 2 }],
        ['3F', { face: 'F', clockwise: true, layer: 3 }]
    ])('%s round-trips', (text, move) => {
        expect(parseNotationToMove(text)).toEqual(move);
        expect(formatMoveNotation(parseNotationToMove(text)!)).toBe(text);
    });

    it('rejects unknown moves and layered rotations', () => {
        for (const bad of ['Q', 'R2', "R''", '2x', '', 'r']) expect(parseNotationToMove(bad)).toBeNull();
        expect(parseNotationToMove(undefined)).toBeNull();
    });

    it('treats layer 1 as the outer face', () => {
        expect(parseNotationToMove('1R')).toEqual({ face: 'R', clockwise: true });
    });

    it('expands double turns, including on inner layers', () => {
        expect(parseAlgorithmMoves("R2 U2' 2F2").map(formatMoveNotation)).toEqual(['R', 'R', "U'", "U'", '2F', '2F']);
    });
});
