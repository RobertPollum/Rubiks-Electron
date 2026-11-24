/** Summary statistics over a list of solve records. */
export function computeStats(solves) {
    return {
        totalSolves: solves.length,
        bestSolve: solves.length > 0 ? Math.min(...solves.map(s => s.moves)) : null,
        averageMoves: solves.length > 0 ? Math.round(solves.reduce((sum, s) => sum + s.moves, 0) / solves.length) : 0
    };
}

export function createSolveRecord(moveCount, now = new Date()) {
    return {
        moves: moveCount,
        timestamp: now.toLocaleTimeString(),
        date: now.toLocaleDateString()
    };
}
