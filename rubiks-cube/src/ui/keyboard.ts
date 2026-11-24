// Keyboard shortcuts. Shift reverses the direction.

import { FACE_NAMES } from '../core/notation';
import type { Axis, Face, Move } from '../core/types';

const FACE_KEYS: Record<string, Face> = { r: 'R', l: 'L', u: 'U', d: 'D', f: 'F', b: 'B' };
const CUBE_KEYS: Record<string, Axis> = { x: 'x', y: 'y', z: 'z' };

export interface KeyboardHandlers {
    isSettingsOpen(): boolean;
    closeSettings(): void;
    /** True while scrambling or playing back; turns are ignored. */
    isInputLocked(): boolean;
    /** `label` describes the move for the status line, e.g. "Right". */
    turn(move: Move, label: string): void;
    resetCamera(): void;
}

export function bindKeyboard(handlers: KeyboardHandlers, target: Document = document): void {
    target.addEventListener('keydown', (event) => {
        if (handlers.isSettingsOpen()) {
            if (event.key === 'Escape') handlers.closeSettings();
            return;
        }
        if (handlers.isInputLocked()) return;

        const key = event.key.toLowerCase();
        const clockwise = !event.shiftKey;
        const face = FACE_KEYS[key];
        const axis = CUBE_KEYS[key];

        if (face) {
            handlers.turn({ face, clockwise }, FACE_NAMES[face]);
        } else if (axis) {
            handlers.turn({ face: axis, clockwise }, `Cube ${axis.toUpperCase()}`);
        } else if (key === ' ') {
            event.preventDefault();
            handlers.resetCamera();
        }
    });
}
