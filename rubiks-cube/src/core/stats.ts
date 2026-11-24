import type { SolveRecord, Stats } from './types';

/** Summary statistics over a list of solve records. */
export function computeStats(solves: SolveRecord[]): Stats {
    return {
        totalSolves: solves.length,
        bestSolve: solves.length > 0 ? Math.min(...solves.map(s => s.moves)) : null,
        averageMoves: solves.length > 0 ? Math.round(solves.reduce((sum, s) => sum + s.moves, 0) / solves.length) : 0
    };
}

export function createSolveRecord(moveCount: number, now: Date = new Date(), random: () => number = Math.random): SolveRecord {
    return {
        id: `${now.getTime().toString(36)}-${random().toString(36).slice(2, 10)}`,
        solvedAt: now.toISOString(),
        moves: moveCount,
        timestamp: now.toLocaleTimeString(),
        date: now.toLocaleDateString()
    };
}
