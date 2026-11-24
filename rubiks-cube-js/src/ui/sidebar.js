// Sidebar: move history, cube state badge, stats, solve history,
// plus enabling/disabling the main action buttons.

const STATE_LABELS = {
    solved: 'Solved',
    scrambled: 'Scrambled',
    solving: 'Solving'
};

const ACTION_BUTTON_IDS = ['scrambleBtn', 'resetBtn', 'replayBtn', 'settingsBtn', 'watchAlgorithmBtn'];

export function createSidebar(doc = document) {
    const $ = id => doc.getElementById(id);

    return {
        renderMoveList(moveHistory) {
            const el = $('move-list');
            if (!el) return;
            el.innerHTML = '';
            moveHistory.forEach((move, i) => {
                const div = doc.createElement('div');
                div.className = 'move-entry';
                div.innerHTML = `<span class="move-num">${i + 1}.</span><span class="move-notation">${move.notation}</span>`;
                el.appendChild(div);
            });
            el.scrollTop = el.scrollHeight;
        },

        setMoveCount(count) {
            const el = $('move-count');
            if (el) el.textContent = `Moves: ${count}`;
        },

        setCubeState(state) {
            const el = $('cube-state');
            if (!el || !STATE_LABELS[state]) return;
            el.className = '';
            el.textContent = STATE_LABELS[state];
            el.classList.add(`state-${state}`);
        },

        renderStats({ totalSolves, bestSolve, averageMoves }) {
            const el = $('stats-display');
            if (!el) return;
            el.innerHTML = `<span>Total: <strong>${totalSolves}</strong></span>` +
                `<span>Best: <strong>${bestSolve !== null ? bestSolve : '-'}</strong></span>` +
                `<span>Avg: <strong>${averageMoves || '-'}</strong></span>`;
        },

        renderSolveList(solves) {
            const el = $('solve-list');
            if (!el) return;
            el.innerHTML = '';
            if (solves.length === 0) {
                el.innerHTML = '<div style="color:#888;font-style:italic;">No solves yet</div>';
                return;
            }
            solves.slice().reverse().forEach(solve => {
                const div = doc.createElement('div');
                div.className = 'solve-entry';
                div.innerHTML = `<span class="solve-moves">${solve.moves} moves</span> <span class="solve-time">${solve.timestamp} ${solve.date}</span>`;
                el.appendChild(div);
            });
        },

        setReplayEnabled(enabled) {
            const btn = $('replayBtn');
            if (btn) btn.disabled = !enabled;
        },

        setActionButtonsEnabled(enabled) {
            ACTION_BUTTON_IDS.forEach(id => {
                const btn = $(id);
                if (btn) btn.disabled = !enabled;
            });
        },

        /** Wire the main action buttons to handlers. */
        bindActions({ onScramble, onReset, onReplay, onOpenSettings }) {
            $('scrambleBtn').addEventListener('click', onScramble);
            $('resetBtn').addEventListener('click', onReset);
            $('replayBtn').addEventListener('click', onReplay);
            $('settingsBtn').addEventListener('click', onOpenSettings);
        }
    };
}
