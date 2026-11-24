// Game flow: player moves, scramble / reset / replay, algorithm playback,
// solve detection, stats, and saving progress.
//
// The controller owns the real cube state (a core/cubeModel state). The
// CubeView only animates and draws it. Moves run one at a time through a
// queue, so every action reads top to bottom:
//
//     mode = 'scrambling';
//     await playMoves(scramble);
//     mode = 'idle';

import { formatMoveNotation, parseNotationToMove, parseAlgorithmMoves, isCubeRotation } from '../core/notation';
import { createSolvedState, applyMove, isSolved, statesEqual, cubeSizeOf, isMoveValidForSize } from '../core/cubeModel';
import { createSavedGame, loadSavedGame, countMoves } from '../core/savedGame';
import { generateScramble } from '../core/scramble';
import { computeStats, createSolveRecord } from '../core/stats';
import { getAlgorithmById } from '../core/algorithms';
import type { CubeState, CubeStatus, GameData, Move, MoveRecord, SolveRecord } from '../core/types';
import type { CubeView } from '../view/cubeView';
import type { SettingsStore } from './settingsStore';
import type { Sidebar } from '../ui/sidebar';
import type { StatusBar } from '../ui/statusBar';

export interface GameControllerDeps {
    /** Persisted data object (mutated in place). */
    gameData: GameData;
    /** Persist gameData. */
    save: () => void;
    settings: SettingsStore;
    sidebar: Sidebar;
    status: StatusBar;
}

/** 'idle' (player can move) | 'scrambling' | 'playback' (replay or algorithm) */
type Mode = 'idle' | 'scrambling' | 'playback';

interface PlayOptions {
    speed?: number | (() => number);
    onMove?: (move: Move) => void;
}

export type GameController = ReturnType<typeof createGameController>;

export function createGameController({ gameData, save, settings, sidebar, status }: GameControllerDeps) {
    let view!: CubeView; // set by attachView() before use

    // ---- State -----------------------------------------------------------

    let cube: CubeState = createSolvedState(settings.getCubeSize()); // the real cube
    let start: CubeState = cube;               // cube at the start of this attempt (after the scramble)
    let scramble: Move[] = [];                 // moves that produced `start`, if known
    let moveHistory: MoveRecord[] = [];        // moves since `start`
    let cubeState: CubeStatus = 'solved';
    // Solves live in gameData (not a local copy) so data arriving from sync is picked up.
    const solves = (): SolveRecord[] => (gameData.solves ??= []);
    let mode: Mode = 'idle';

    // ---- Move queue --------------------------------------------------------

    // Moves animate one at a time. `generation` changes on reset so that
    // anything queued or animating from before is abandoned.
    let queue: Promise<unknown> = Promise.resolve();
    let pendingTasks = 0;
    let generation = 0;

    /** Run `task(isCurrent)` after everything already queued. Resolves with its result. */
    function enqueue(task: (isCurrent: () => boolean) => Promise<boolean>): Promise<boolean> {
        const gen = generation;
        const isCurrent = () => gen === generation;
        pendingTasks++;
        const result = queue
            .then(() => (isCurrent() ? task(isCurrent) : false))
            .finally(() => { pendingTasks--; });
        queue = result.catch(err => console.error('Move failed:', err));
        return result;
    }

    /**
     * Queue `moves` to animate in order, updating the cube after each.
     * Resolves true if they all ran, false if a reset interrupted them.
     */
    function playMoves(moves: readonly Move[], { speed = 1, onMove }: PlayOptions = {}): Promise<boolean> {
        return enqueue(async isCurrent => {
            for (const move of moves) {
                const finished = await view.animate(move, speed);
                if (!finished || !isCurrent()) return false;
                cube = applyMove(cube, move);
                if (onMove) onMove(move);
            }
            return true;
        });
    }

    /** Drop everything queued or animating. */
    function cancelMoves() {
        generation++;
        view.cancel();
    }

    function showCube(state: CubeState): void {
        cube = state;
        view.show(cube);
    }

    const isBusy = () => mode !== 'idle' || pendingTasks > 0;
    const replaySpeed = () => settings.getReplaySpeed();

    // ---- UI sync -----------------------------------------------------------

    function setCubeState(state: CubeStatus): void {
        cubeState = state;
        sidebar.setCubeState(state);
    }

    function setMoveHistory(history: MoveRecord[]): void {
        moveHistory = history;
        sidebar.renderMoveList(moveHistory);
        sidebar.setMoveCount(countMoves(moveHistory));
    }

    function updateReplayButton() {
        sidebar.setReplayEnabled(moveHistory.length > 0 && mode === 'idle');
    }

    function setActionButtonsEnabled(enabled: boolean): void {
        sidebar.setActionButtonsEnabled(enabled);
        if (enabled) updateReplayButton();
    }

    /** Make the current cube the starting point of a new attempt. */
    function startAttempt(scrambleMoves: Move[], state: CubeStatus): void {
        start = cube;
        scramble = scrambleMoves;
        setMoveHistory([]);
        setCubeState(state);
    }

    // ---- Persistence -------------------------------------------------------

    function persist() {
        gameData.currentGame = createSavedGame({ start, scramble, moveHistory, cubeState });
        gameData.stats = computeStats(solves());
        sidebar.renderStats(gameData.stats);
        save();
    }

    function recordSolve(moveCount: number): void {
        solves().push(createSolveRecord(moveCount));
        sidebar.renderSolveList(solves());
    }

    // ---- Player moves -------------------------------------------------------

    function onPlayerMove(move: Move): void {
        setMoveHistory([...moveHistory, { notation: formatMoveNotation(move), timestamp: Date.now() }]);

        if (!isCubeRotation(move) && cubeState !== 'solved') {
            if (cubeState === 'scrambled') setCubeState('solving');
            if (isSolved(cube)) {
                const moveCount = countMoves(moveHistory);
                setCubeState('solved');
                recordSolve(moveCount);
                status.show(`Cube solved in ${moveCount} moves!`, 'success');
            }
        }

        persist();
        updateReplayButton();
    }

    /** A turn from the keyboard. Ignored during scrambles and playback. */
    function turn(move: Move, label: string): void {
        if (mode !== 'idle') return;
        const size = cubeSizeOf(cube);
        if (!isMoveValidForSize(move, size)) {
            status.show(`A ${size}x${size}x${size} cube has no layer ${move.layer} to turn`, 'warning', { revertAfter: 1500 });
            return;
        }
        playMoves([move], { onMove: onPlayerMove });
        const direction = move.clockwise ? 'clockwise' : 'counter-clockwise';
        status.show(`Rotating ${label} ${direction}...`, 'success', { revertAfter: 1000 });
    }

    // ---- Actions -------------------------------------------------------------

    async function scrambleCube() {
        if (isBusy()) return;
        const count = settings.getScrambleAmount();
        const moves = generateScramble(count, Math.random, cubeSizeOf(cube));

        mode = 'scrambling';
        setMoveHistory([]);
        setCubeState('scrambled');
        updateReplayButton();
        status.show(`Scrambling with ${count} random moves...`, 'warning');

        const finished = await playMoves(moves);
        if (!finished) return; // reset while scrambling; reset() tidied up

        mode = 'idle';
        startAttempt(moves, 'scrambled');
        persist();
        updateReplayButton();
    }

    function reset() {
        cancelMoves();
        mode = 'idle';
        showCube(createSolvedState(settings.getCubeSize()));
        startAttempt([], 'solved');
        setActionButtonsEnabled(true);
        persist();
        status.show('Cube reset to solved state!', 'info', { revertAfter: 1500 });
    }

    /** True if there's an attempt in progress that changing the cube would throw away. */
    function hasProgress(): boolean {
        return moveHistory.length > 0 || !isSolved(cube);
    }

    /** Switch to a cube of a different size, starting from solved. */
    function setCubeSize(size: number): void {
        cancelMoves();
        mode = 'idle';
        settings.setCubeSize(size);
        showCube(createSolvedState(settings.getCubeSize()));
        startAttempt([], 'solved');
        setActionButtonsEnabled(true);
        persist();
        status.show(`Now playing a ${size}x${size}x${size} cube`, 'info', { revertAfter: 2000 });
    }

    /** Jump back to the start of this attempt and animate every move since. */
    async function replay() {
        if (moveHistory.length === 0 || isBusy()) return;
        const moves = moveHistory.map(entry => parseNotationToMove(entry.notation)).filter((m): m is Move => m !== null);
        const finalCube = cube;

        mode = 'playback';
        setActionButtonsEnabled(false);
        showCube(start);
        status.show(`Replaying ${moves.length} moves...`, 'replay');

        let done = 0;
        const finished = await playMoves(moves, {
            speed: replaySpeed,
            onMove: () => status.show(`Replaying move ${++done} of ${moves.length}...`, 'replay')
        });

        mode = 'idle';
        setActionButtonsEnabled(true);
        if (finished) {
            if (!statesEqual(cube, finalCube)) console.warn('Replay ended on a different cube than it started from');
            status.show('Replay complete!', 'success', { revertAfter: 2000 });
        }
    }

    /**
     * Start from solved, apply the algorithm's setup, then play the
     * algorithm. The resulting position becomes a new attempt.
     */
    async function runAlgorithm(algorithmId: string): Promise<void> {
        const alg = getAlgorithmById(algorithmId);
        if (!alg || isBusy()) return;
        const setupMoves = parseAlgorithmMoves(alg.setup);
        const algMoves = parseAlgorithmMoves(alg.moves);
        if (algMoves.length === 0) return;

        mode = 'playback';
        setActionButtonsEnabled(false);
        showCube(createSolvedState(cubeSizeOf(cube)));
        startAttempt([], 'solved');

        let finished = true;
        if (setupMoves.length > 0) {
            status.show(`Setting up ${alg.name}...`, 'warning');
            finished = await playMoves(setupMoves);
        }
        if (finished) {
            status.show(`Playing ${alg.name}: ${alg.moves}`, 'replay');
            finished = await playMoves(algMoves, { speed: replaySpeed });
        }

        mode = 'idle';
        startAttempt([], isSolved(cube) ? 'solved' : 'scrambled');
        setActionButtonsEnabled(true);
        persist();
        if (finished) status.show(`${alg.name} complete!`, 'success', { revertAfter: 2000 });
    }

    function resetCamera() {
        view.resetCamera();
        status.show('Resetting view...', 'info');
    }

    /** Restore the saved game, if there is one worth resuming. */
    /** Show the game saved in gameData.currentGame, or a fresh solved cube if there isn't one. Returns it. */
    function loadCurrentGame() {
        const saved = loadSavedGame(gameData.currentGame);
        if (saved) {
            showCube(saved.cube);
            start = saved.start;
            scramble = saved.scramble;
            setMoveHistory(saved.moveHistory);
            setCubeState(saved.cubeState);
        } else {
            showCube(createSolvedState(settings.getCubeSize()));
            startAttempt([], 'solved');
        }
        updateReplayButton();
        return saved;
    }

    /** At startup: restore the saved game, if there is one. */
    function resumeSavedGame() {
        const saved = loadCurrentGame();
        if (!saved) return;
        if (cubeSizeOf(saved.cube) !== settings.getCubeSize()) settings.setCubeSize(cubeSizeOf(saved.cube));
        if (saved.migrated) persist(); // upgrade old saves to the current format
        if (cubeState !== 'solved') status.show('Resumed previous game', 'warning', { bold: false });
    }

    /** After gameData was replaced (e.g. by sync): show its game, solves and stats. */
    function reloadFromData() {
        loadCurrentGame();
        sidebar.renderSolveList(solves());
        sidebar.renderStats(gameData.stats);
    }

    return {
        attachView(cubeView: CubeView): void {
            view = cubeView;
        },
        turn,
        scramble: scrambleCube,
        reset,
        replay,
        runAlgorithm,
        resetCamera,
        resumeSavedGame,
        reloadFromData,
        /** True while anything is animating, queued, scrambling or playing back. */
        isBusy,
        setCubeSize,
        hasProgress,
        getCubeSize: () => cubeSizeOf(cube),
        renderHistory() {
            sidebar.renderSolveList(solves());
            sidebar.renderStats(gameData.stats);
        },
        /** True while scrambling or playing back; keyboard turns are ignored. */
        isInputLocked: () => mode !== 'idle'
    };
}
