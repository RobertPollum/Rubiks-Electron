// The one-line status message under the controls (#info).
// Colours live in index.css as .status-<tone> classes.

export type StatusTone = 'idle' | 'success' | 'info' | 'warning' | 'replay';

export const READY_MESSAGE = 'Ready for next move';

export interface ShowOptions {
    /** Defaults to bold for every tone except idle. */
    bold?: boolean;
    /** Milliseconds after which the idle "ready" message comes back. */
    revertAfter?: number;
}

export type StatusBar = ReturnType<typeof createStatusBar>;

export function createStatusBar(element: HTMLElement | null) {
    let revertTimer: ReturnType<typeof setTimeout> | undefined;

    function apply(el: HTMLElement, text: string, tone: StatusTone, bold: boolean) {
        el.textContent = text;
        el.className = `status-${tone}`;
        el.classList.toggle('status-bold', bold);
    }

    return {
        /**
         * Show a message. A newer message cancels a pending revert, so e.g.
         * "Cube solved!" isn't wiped by an earlier turn's feedback.
         */
        show(text: string, tone: StatusTone = 'idle', { bold = tone !== 'idle', revertAfter }: ShowOptions = {}): void {
            if (!element) return;
            const el = element;
            clearTimeout(revertTimer);
            apply(el, text, tone, bold);
            if (revertAfter) {
                revertTimer = setTimeout(() => apply(el, READY_MESSAGE, 'idle', false), revertAfter);
            }
        },

        ready(): void {
            this.show(READY_MESSAGE, 'idle');
        },

        /** Plain text with no styling (used for the platform/version line). */
        setPlain(text: string): void {
            if (element) element.innerText = text;
        }
    };
}
