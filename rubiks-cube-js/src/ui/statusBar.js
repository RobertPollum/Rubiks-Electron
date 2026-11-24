// The one-line status message under the controls (#info).

const TONES = {
    idle: '#333',
    success: '#4CAF50',
    info: '#2196F3',
    warning: '#FF9800',
    replay: '#00897B'
};

export const READY_MESSAGE = 'Ready for next move';

export function createStatusBar(element) {
    let revertTimer = null;

    function apply(text, tone, bold) {
        element.textContent = text;
        element.style.color = TONES[tone] || TONES.idle;
        element.style.fontWeight = bold ? 'bold' : 'normal';
    }

    return {
        /**
         * Show a message. With `revertAfter` (ms) it falls back to the idle
         * "ready" message afterwards. A newer message cancels a pending revert,
         * so e.g. "Cube solved!" isn't wiped by an earlier turn's feedback.
         */
        show(text, tone = 'idle', { bold = tone !== 'idle', revertAfter } = {}) {
            if (!element) return;
            clearTimeout(revertTimer);
            revertTimer = null;
            apply(text, tone, bold);
            if (revertAfter) {
                revertTimer = setTimeout(() => apply(READY_MESSAGE, 'idle', false), revertAfter);
            }
        },

        ready() {
            this.show(READY_MESSAGE, 'idle');
        },

        /** Plain text with no styling (used for the platform/version line). */
        setPlain(text) {
            if (element) element.innerText = text;
        }
    };
}
