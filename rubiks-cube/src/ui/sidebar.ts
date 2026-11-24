// Sidebar: move history, cube state badge, stats, solve history,
// plus enabling/disabling the main action buttons.
// All text is set with textContent, never parsed as HTML.

import type { CubeStatus, MoveRecord, SolveRecord, Stats } from '../core/types';

const STATE_LABELS: Record<CubeStatus, string> = {
    solved: 'Solved',
    scrambled: 'Scrambled',
    solving: 'Solving'
};

const ACTION_BUTTON_IDS = ['scrambleBtn', 'resetBtn', 'replayBtn', 'settingsBtn', 'watchAlgorithmBtn'];

export type Sidebar = ReturnType<typeof createSidebar>;

export function createSidebar(doc: Document = document) {
    const $ = (id: string) => doc.getElementById(id);

    /** <span class="className">text</span> */
    function span(className: string | null, text: string | number): HTMLSpanElement {
        const el = doc.createElement('span');
        if (className) el.className = className;
        el.textContent = String(text);
        return el;
    }

    function entry(className: string, ...children: (Node | string)[]): HTMLDivElement {
        const div = doc.createElement('div');
        div.className = className;
        div.append(...children);
        return div;
    }

    return {
        renderMoveList(moveHistory: readonly MoveRecord[]): void {
            const el = $('move-list');
            if (!el) return;
            el.replaceChildren(...moveHistory.map((move, i) =>
                entry('move-entry', span('move-num', `${i + 1}.`), span('move-notation', move.notation))
            ));
            el.scrollTop = el.scrollHeight;
        },

        setMoveCount(count: number): void {
            const el = $('move-count');
            if (el) el.textContent = `Moves: ${count}`;
        },

        setCubeState(state: CubeStatus): void {
            const el = $('cube-state');
            if (!el) return;
            el.className = `state-${state}`;
            el.textContent = STATE_LABELS[state];
        },

        renderStats({ totalSolves, bestSolve, averageMoves }: Stats): void {
            const el = $('stats-display');
            if (!el) return;
            const stat = (label: string, value: string | number) => {
                const s = span(null, `${label}: `);
                const strong = doc.createElement('strong');
                strong.textContent = String(value);
                s.appendChild(strong);
                return s;
            };
            el.replaceChildren(
                stat('Total', totalSolves),
                stat('Best', bestSolve !== null ? bestSolve : '-'),
                stat('Avg', averageMoves || '-')
            );
        },

        renderSolveList(solves: readonly SolveRecord[]): void {
            const el = $('solve-list');
            if (!el) return;
            if (solves.length === 0) {
                const empty = entry('solve-empty', 'No solves yet');
                empty.style.cssText = 'color:#888;font-style:italic;';
                el.replaceChildren(empty);
                return;
            }
            el.replaceChildren(...solves.slice().reverse().map(solve =>
                entry('solve-entry', span('solve-moves', `${solve.moves} moves`), ' ', span('solve-time', `${solve.timestamp} ${solve.date}`))
            ));
        },

        setReplayEnabled(enabled: boolean): void {
            const btn = $('replayBtn') as HTMLButtonElement | null;
            if (btn) btn.disabled = !enabled;
        },

        setActionButtonsEnabled(enabled: boolean): void {
            for (const id of ACTION_BUTTON_IDS) {
                const btn = $(id) as HTMLButtonElement | null;
                if (btn) btn.disabled = !enabled;
            }
        },

        /** Wire the main action buttons to handlers. */
        bindActions({ onScramble, onReset, onReplay, onOpenSettings }: {
            onScramble: () => void; onReset: () => void; onReplay: () => void; onOpenSettings: () => void;
        }): void {
            $('scrambleBtn')?.addEventListener('click', onScramble);
            $('resetBtn')?.addEventListener('click', onReset);
            $('replayBtn')?.addEventListener('click', onReplay);
            $('settingsBtn')?.addEventListener('click', onOpenSettings);
        }
    };
}
