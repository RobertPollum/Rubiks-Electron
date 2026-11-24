// Combining this device's data with an account's data from the sync API.
//
// Rules (see docs/sync-api.md):
//   - Settings: the more recently changed copy wins as a whole.
//   - Solve history: the union of both; nothing is lost.
//   - Current game: the more recently saved game wins.
//   - Stats: recomputed from the merged solves.
// Pure function: no network, no storage.

import { computeStats } from './stats';
import type { GameData, SavedGame, SolveRecord } from './types';

/** Stable identity for a solve. Older solves have no id, so fall back to their contents. */
export function solveKey(solve: SolveRecord): string {
    return solve.id ?? `legacy:${solve.date}|${solve.timestamp}|${solve.moves}`;
}

/** ISO timestamps compare correctly as strings; missing ones count as oldest. */
const isNewer = (a: string | undefined, b: string | undefined) => (a ?? '') > (b ?? '');

const gameUpdatedAt = (game: GameData['currentGame']) =>
    (game as Partial<SavedGame> | undefined)?.updatedAt;

function mergeSolves(local: readonly SolveRecord[], remote: readonly SolveRecord[]): SolveRecord[] {
    const merged = new Map<string, SolveRecord>();
    for (const solve of [...remote, ...local]) {
        if (!merged.has(solveKey(solve))) merged.set(solveKey(solve), solve);
    }
    // Oldest first, like the local list. Solves without a time keep their relative order at the start.
    return [...merged.values()].sort((a, b) => (a.solvedAt ?? '').localeCompare(b.solvedAt ?? ''));
}

export function mergeGameData(local: GameData, remote: GameData): GameData {
    const localSettingsWin = !isNewer(remote.settingsUpdatedAt, local.settingsUpdatedAt);
    const localGameWins = !isNewer(gameUpdatedAt(remote.currentGame), gameUpdatedAt(local.currentGame));
    const solves = mergeSolves(local.solves ?? [], remote.solves ?? []);

    return {
        ...remote,
        ...local,
        settings: localSettingsWin ? local.settings : remote.settings,
        settingsUpdatedAt: localSettingsWin ? local.settingsUpdatedAt : remote.settingsUpdatedAt,
        currentGame: localGameWins ? local.currentGame : remote.currentGame,
        solves,
        stats: computeStats(solves)
    };
}

/** True if two data objects hold the same content. */
export function sameData(a: GameData, b: GameData): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}
