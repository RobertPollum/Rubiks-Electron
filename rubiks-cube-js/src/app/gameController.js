// Game flow: move history, scramble / reset / replay, algorithm playback,
// solve detection, stats, and saving progress.
//
// The controller coordinates the pieces but owns no DOM or three.js code
// itself: it drives a CubeView, reports to the sidebar and status bar, and
// persists through the `save` callback.

import { formatMoveNotation, parseNotationToMove, parseAlgorithmMoves } from '../core/notation';
import { generateScramble } from '../core/scramble';
import { computeStats, createSolveRecord } from '../core/stats';
import { getAlgorithmById } from '../core/algorithms';

/** Poll until `condition()` is true, then run `then`. */
function waitUntil(condition, then, intervalMs = 50) {
    const timer = setInterval(() => {
        if (condition()) {
            clearInterval(timer);
            then();
        }
    }, intervalMs);
}

/**
 * @param {Object} deps
 * @param {Object} deps.gameData   Persisted data object (mutated in place).
 * @param {() => void} deps.save   Persist gameData.
 * @param {ReturnType<import('./settingsStore').createSettingsStore>} deps.settings
 * @param {ReturnType<import('../ui/sidebar').createSidebar>} deps.sidebar
 * @param {ReturnType<import('../ui/statusBar').createStatusBar>} deps.status
 */
export function createGameController({ gameData, save, settings, sidebar, status }) {
    /** @type {import('../view/cubeView').CubeView} */
    let view = null;

    let moveHistory = [];
    let cubeState = 'solved'; // 'solved' | 'scrambled' | 'solving'
    let lastScrambleMoves = [];
    let sessionSolves = gameData.solves || [];

    // While scrambling (or fast-forwarding setup moves) completed turns are
    // counted down here instead of being recorded as player moves.
    let isScrambling = false;
    let scrambleMoveCount = 0;

    // While replaying a game or playing an algorithm, input is locked and
    // completed turns are counted down here.
    let isReplaying = false;
    let replayMoveCount = 0;

    // ---- UI sync -------------------------------------------------------

    function setCubeState(state) {
        cubeState = state;
        sidebar.setCubeState(state);
    }

    function refreshMoveList() {
        sidebar.renderMoveList(moveHistory);
        sidebar.setMoveCount(moveHistory.length);
    }

    function updateReplayButton() {
        sidebar.setReplayEnabled(!(moveHistory.length === 0 || isScrambling || isReplaying));
    }

    function setActionButtonsEnabled(enabled) {
        sidebar.setActionButtonsEnabled(enabled);
        if (enabled) updateReplayButton();
    }

    // ---- Persistence ---------------------------------------------------

    function persist() {
        gameData.currentGame = {
            moveHistory,
            cubeState,
            cubies: view.serialize()
        };
        gameData.solves = sessionSolves;
        gameData.stats = computeStats(sessionSolves);
        sidebar.renderStats(gameData.stats);
        save();
    }

    function recordSolve() {
        sessionSolves.push(createSolveRecord(moveHistory.length));
        sidebar.renderSolveList(sessionSolves);
        persist();
    }

    function clearMoveHistory() {
        moveHistory = [];
        refreshMoveList();
    }

    // ---- Turn completion ----------------------------------------------

    function onScrambleMoveComplete() {
        scrambleMoveCount--;
        if (scrambleMoveCount <= 0) {
            isScrambling = false;
            setCubeState('scrambled');
            persist();
            updateReplayButton();
        }
    }

    function onReplayMoveComplete() {
        replayMoveCount--;
        const total = view.pendingCount + replayMoveCount + 1;
        const done = total - replayMoveCount;
        status.show(`Replaying move ${done} of ${total}...`, 'replay');

        if (replayMoveCount <= 0 && view.pendingCount === 0) {
            isReplaying = false;
            setActionButtonsEnabled(true);
            status.show('Replay complete!', 'success', { revertAfter: 2000 });
        }
    }

    function onPlayerMoveComplete(face, clockwise) {
        moveHistory.push({ notation: formatMoveNotation(face, clockwise), timestamp: Date.now() });
        refreshMoveList();

        if (cubeState !== 'solved') {
            if (cubeState === 'scrambled') {
                setCubeState('solving');
            }
            if (view.isSolved()) {
                setCubeState('solved');
                recordSolve();
                status.show(`Cube solved in ${moveHistory.length} moves!`, 'success');
            }
        }

        persist();
        updateReplayButton();
    }

    /** Called by the CubeView each time a turn finishes animating. */
    function handleMoveComplete({ face, clockwise, isCubeRotation }) {
        if (isCubeRotation) return; // whole-cube rotations aren't moves
        if (isScrambling) return onScrambleMoveComplete();
        if (isReplaying) return onReplayMoveComplete();
        onPlayerMoveComplete(face, clockwise);
    }

    // ---- Actions -------------------------------------------------------

    function scramble() {
        if (!view.isIdle()) return;

        clearMoveHistory();
        const scrambleCount = settings.getScrambleAmount();
        lastScrambleMoves = generateScramble(scrambleCount);
        isScrambling = true;
        scrambleMoveCount = scrambleCount;
        setCubeState('scrambled');
        updateReplayButton();

        for (const move of lastScrambleMoves) {
            view.rotateFace(move.face, move.clockwise);
        }
        status.show(`Scrambling with ${scrambleCount} random moves...`, 'warning');
    }

    function reset() {
        view.rebuild(settings.getActiveColors());

        clearMoveHistory();
        lastScrambleMoves = [];
        isScrambling = false;
        scrambleMoveCount = 0;
        setCubeState('solved');
        persist();
        updateReplayButton();

        status.show('Cube reset to solved state!', 'info', { revertAfter: 1500 });
    }

    /** Rebuild from solved, fast-forward the scramble, then animate the player's moves. */
    function replay() {
        if (moveHistory.length === 0 || view.isRotating || isReplaying || isScrambling) return;

        const savedMoveHistory = [...moveHistory];
        const savedScrambleMoves = [...lastScrambleMoves];

        setActionButtonsEnabled(false);
        view.rebuild(settings.getActiveColors());

        isScrambling = true;
        scrambleMoveCount = savedScrambleMoves.length;

        const startUserMoveReplay = () => {
            isReplaying = true;
            replayMoveCount = savedMoveHistory.length;
            status.show(`Replaying ${savedMoveHistory.length} moves...`, 'replay');
            for (const move of savedMoveHistory) {
                const { face, clockwise } = parseNotationToMove(move.notation);
                view.rotateFace(face, clockwise);
            }
        };

        if (savedScrambleMoves.length > 0) {
            for (const move of savedScrambleMoves) {
                view.rotateFace(move.face, move.clockwise);
            }
            waitUntil(() => !isScrambling && view.isIdle(), () => {
                // Restore state references without re-recording
                moveHistory = savedMoveHistory;
                lastScrambleMoves = savedScrambleMoves;
                startUserMoveReplay();
            });
        } else {
            isScrambling = false;
            scrambleMoveCount = 0;
            moveHistory = savedMoveHistory;
            lastScrambleMoves = savedScrambleMoves;
            startUserMoveReplay();
        }
    }

    /** Abandon the current game, apply the algorithm's setup, then play it. */
    function runAlgorithm(algorithmId) {
        const alg = getAlgorithmById(algorithmId);
        if (!alg || view.isRotating || isReplaying || isScrambling) return;

        const setupMoves = parseAlgorithmMoves(alg.setup);
        const algMoves = parseAlgorithmMoves(alg.moves);
        if (algMoves.length === 0) return;

        clearMoveHistory();
        lastScrambleMoves = [];
        setCubeState('solved');
        setActionButtonsEnabled(false);
        view.rebuild(settings.getActiveColors());

        const play = () => {
            isReplaying = true;
            replayMoveCount = algMoves.length;
            status.show(`Playing ${alg.name}: ${alg.moves}`, 'replay');
            for (const move of algMoves) {
                view.rotateFace(move.face, move.clockwise);
            }
        };

        if (setupMoves.length > 0) {
            isScrambling = true;
            scrambleMoveCount = setupMoves.length;
            status.show(`Setting up ${alg.name}...`, 'warning');
            for (const move of setupMoves) {
                view.rotateFace(move.face, move.clockwise);
            }
            waitUntil(() => !isScrambling && view.isIdle(), play);
        } else {
            play();
        }
    }

    function turnFace(face, clockwise, label) {
        view.rotateFace(face, clockwise);
        showTurnFeedback(label, clockwise);
    }

    function turnCube(axis, clockwise, label) {
        view.rotateCube(axis, clockwise);
        showTurnFeedback(label, clockwise);
    }

    function showTurnFeedback(label, clockwise) {
        const direction = clockwise ? 'clockwise' : 'counter-clockwise';
        status.show(`Rotating ${label} face ${direction}...`, 'success', { revertAfter: 1000 });
    }

    function resetCamera() {
        view.resetCamera();
        status.show('Resetting view...', 'info');
    }

    /** Restore an unfinished game from saved data, if there is one. */
    function resumeSavedGame() {
        const saved = gameData.currentGame;
        if (saved && saved.cubies && saved.cubeState !== 'solved' && view.restore(saved.cubies)) {
            moveHistory = saved.moveHistory || [];
            refreshMoveList();
            setCubeState(saved.cubeState);
            status.show('Resumed previous game', 'warning', { bold: false });
        } else {
            setCubeState('solved');
        }
        updateReplayButton();
    }

    return {
        attachView(cubeView) {
            view = cubeView;
        },
        handleMoveComplete,
        scramble,
        reset,
        replay,
        runAlgorithm,
        turnFace,
        turnCube,
        resetCamera,
        resumeSavedGame,
        renderHistory() {
            sidebar.renderSolveList(sessionSolves);
            sidebar.renderStats(gameData.stats);
        },
        /** True while a replay or algorithm is playing; player input is ignored. */
        isReplaying: () => isReplaying
    };
}
