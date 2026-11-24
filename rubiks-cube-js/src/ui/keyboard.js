// Keyboard shortcuts. Shift reverses the direction.

import { FACE_NAMES } from '../core/notation';

const FACE_KEYS = { r: 'R', l: 'L', u: 'U', d: 'D', f: 'F', b: 'B' };
const CUBE_KEYS = { x: 'x', y: 'y', z: 'z' };

/**
 * @param {Object} handlers
 * @param {() => boolean} handlers.isSettingsOpen
 * @param {() => void}    handlers.closeSettings
 * @param {() => boolean} handlers.isInputLocked   True while a replay/algorithm is playing.
 * @param {(face: string, clockwise: boolean, label: string) => void} handlers.turnFace
 * @param {(axis: string, clockwise: boolean, label: string) => void} handlers.turnCube
 * @param {() => void}    handlers.resetCamera
 */
export function bindKeyboard(handlers, target = document) {
    target.addEventListener('keydown', (event) => {
        if (handlers.isSettingsOpen()) {
            if (event.key === 'Escape') handlers.closeSettings();
            return;
        }
        if (handlers.isInputLocked()) return;

        const key = event.key.toLowerCase();
        const clockwise = !event.shiftKey;

        if (FACE_KEYS[key]) {
            const face = FACE_KEYS[key];
            handlers.turnFace(face, clockwise, FACE_NAMES[face]);
        } else if (CUBE_KEYS[key]) {
            handlers.turnCube(CUBE_KEYS[key], clockwise, `Cube ${key.toUpperCase()}`);
        } else if (key === ' ') {
            event.preventDefault();
            handlers.resetCamera();
        }
    });
}
