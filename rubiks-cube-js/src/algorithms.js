// Common Rubik's Cube solving algorithms with setup moves
// Each algorithm has a setup scramble that creates the case, then the algorithm solves it

export const ALGORITHMS = [
    {
        id: 'sexy_move',
        name: 'Sexy Move',
        category: 'Triggers',
        description: 'The most fundamental trigger in speedcubing. Used as a building block in many algorithms.',
        setup: "R U R' U' R U R' U' R U R' U' R U R' U' R U R' U' R U R' U'",
        moves: "R U R' U'"
    },
    {
        id: 'sledgehammer',
        name: 'Sledgehammer',
        category: 'Triggers',
        description: "Another common trigger, often paired with the Sexy Move. Rotates a corner-edge pair.",
        setup: "R' F R F' R' F R F' R' F R F'",
        moves: "R' F R F'"
    },
    {
        id: 'oll_cross',
        name: 'OLL Cross (Dot to Cross)',
        category: 'OLL',
        description: 'Orients the top-layer edges to form a cross. One of the first OLL patterns learned.',
        setup: "F U R U' R' F' U F R U R' U' F' U",
        moves: "F R U R' U' F' U F U R U' R' F'"
    },
    {
        id: 'sune',
        name: 'Sune',
        category: 'OLL',
        description: 'One of the most common OLL algorithms. Orients three corners on the last layer.',
        setup: "R U2 R' U' R U' R'",
        moves: "R U R' U R U2 R'"
    },
    {
        id: 'antisune',
        name: 'Anti-Sune',
        category: 'OLL',
        description: 'The mirror of Sune. Orients three corners in the opposite direction.',
        setup: "R U R' U R U2 R'",
        moves: "R U2 R' U' R U' R'"
    },
    {
        id: 't_perm',
        name: 'T-Perm',
        category: 'PLL',
        description: 'Swaps two adjacent corners and two adjacent edges on the last layer. One of the most useful PLL algorithms.',
        setup: "R U R' U' R' F R2 U' R' U' R U R' F'",
        moves: "R U R' U' R' F R2 U' R' U' R U R' F'"
    },
    {
        id: 'j_perm_a',
        name: 'J-Perm (a)',
        category: 'PLL',
        description: 'Swaps two adjacent corners and two adjacent edges. A fundamental PLL case.',
        setup: "R' U L' U2 R U' R' U2 R L",
        moves: "R' U L' U2 R U' R' U2 R L"
    },
    {
        id: 'u_perm_cw',
        name: 'U-Perm (Clockwise)',
        category: 'PLL',
        description: 'Cycles three edges clockwise on the last layer.',
        setup: "R U' R U R U R U' R' U' R2",
        moves: "R2 U R U R' U' R' U' R' U R'"
    },
    {
        id: 'f2l_basic',
        name: 'Basic F2L Insert',
        category: 'F2L',
        description: 'The simplest First Two Layers pair insertion. Pairs a corner with its edge and inserts them together.',
        setup: "R U R'",
        moves: "R U R'"
    },
    {
        id: 'f2l_reverse',
        name: 'F2L Reverse Insert',
        category: 'F2L',
        description: 'Reverse F2L insertion from the left side.',
        setup: "L' U' L",
        moves: "L' U' L"
    },
    {
        id: 'niklas',
        name: 'Niklas',
        category: 'CMLL',
        description: 'A 3-cycle of corners. Useful in many methods for permuting corners without affecting edges.',
        setup: "L' U R U' L U R'",
        moves: "R' U' L U R U' L'"
    },
    {
        id: 'checkerboard',
        name: 'Checkerboard Pattern',
        category: 'Patterns',
        description: 'Creates the classic checkerboard pattern on all faces. A fun demonstration of move sequences.',
        setup: '',
        moves: "R2 L2 U2 D2 F2 B2"
    },
    {
        id: 'superflip',
        name: 'Superflip',
        category: 'Patterns',
        description: 'Flips all 12 edges in place. One of the most famous Rubik\'s cube positions — the furthest state from solved.',
        setup: '',
        moves: "U R2 F B R B2 R U2 L B2 R U' D' R2 F R' L B2 U2 F2"
    }
];

export function getAlgorithmById(id) {
    return ALGORITHMS.find(a => a.id === id) || null;
}

export function getAlgorithmCategories() {
    const cats = [];
    for (const alg of ALGORITHMS) {
        if (!cats.includes(alg.category)) cats.push(alg.category);
    }
    return cats;
}

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
