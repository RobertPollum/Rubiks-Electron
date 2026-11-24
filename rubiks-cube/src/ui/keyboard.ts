// Keyboard shortcuts. Shift reverses the direction.
// A number key (2-9) before a face key turns that inner layer, e.g. 2 then R = "2R".

import { FACE_NAMES } from '../core/notation';
import type { Axis, Face, Move } from '../core/types';

const FACE_KEYS: Record<string, Face> = { r: 'R', l: 'L', u: 'U', d: 'D', f: 'F', b: 'B' };
const CUBE_KEYS: Record<string, Axis> = { x: 'x', y: 'y', z: 'z' };

export interface KeyboardHandlers {
    isSettingsOpen(): boolean;
    closeSettings(): void;
    /** True while scrambling or playing back; turns are ignored. */
    isInputLocked(): boolean;
    /** `label` describes the move for the status line, e.g. "Right face". */
    turn(move: Move, label: string): void;
    resetCamera(): void;
    /** A layer number was typed; the next face key turns that layer (null = cancelled). */
    onLayerSelected?(layer: number | null): void;
}

export function bindKeyboard(handlers: KeyboardHandlers, target: Document = document): void {
    let pendingLayer: number | null = null;

    target.addEventListener('keydown', (event) => {
        if (handlers.isSettingsOpen()) {
            if (event.key === 'Escape') handlers.closeSettings();
            return;
        }
        if (handlers.isInputLocked()) return;
        if (event.key === 'Shift') return; // wait for the key it modifies

        // Shift+digit gives a symbol on most layouts, so use the physical key.
        const digit = /^Digit([2-9])$/.exec(event.code)?.[1];
        if (digit) {
            pendingLayer = Number(digit);
            handlers.onLayerSelected?.(pendingLayer);
            return;
        }

        const key = event.key.toLowerCase();
        const clockwise = !event.shiftKey;
        const face = FACE_KEYS[key];
        const axis = CUBE_KEYS[key];
        const layer = pendingLayer;
        if (layer !== null) {
            pendingLayer = null;
            if (!face) handlers.onLayerSelected?.(null);
        }

        if (face) {
            const name = FACE_NAMES[face];
            if (layer !== null && layer > 1) handlers.turn({ face, clockwise, layer }, `layer ${layer} from the ${name} face`);
            else handlers.turn({ face, clockwise }, `${name} face`);
        } else if (axis) {
            handlers.turn({ face: axis, clockwise }, `whole cube on ${axis.toUpperCase()}`);
        } else if (key === ' ') {
            event.preventDefault();
            handlers.resetCamera();
        }
    });
}
