// Game data stored as a JSON file in Electron's user-data folder
// (e.g. ~/.config/rubiks-cube-js/game-data.json on Linux).
// Runs in the main process; the renderer reaches it through IPC (see preload.ts).

import { app, ipcMain } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const STORAGE_CHANNELS = {
    load: 'storage:load',
    save: 'storage:save'
} as const;

const MAX_BYTES = 5 * 1024 * 1024; // refuse anything absurdly large

const dataFile = () => path.join(app.getPath('userData'), 'game-data.json');

async function load(): Promise<unknown> {
    try {
        return JSON.parse(await fs.readFile(dataFile(), 'utf8'));
    } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') console.error('Failed to read game data:', err);
        return null;
    }
}

// Writes go one at a time, each to a temp file renamed into place, so a
// crash mid-write never leaves a half-written file.
let writeQueue: Promise<void> = Promise.resolve();

function save(data: unknown): Promise<void> {
    if (!data || typeof data !== 'object') return Promise.reject(new Error('Game data must be an object'));
    const json = JSON.stringify(data);
    if (json.length > MAX_BYTES) return Promise.reject(new Error('Game data is too large'));

    const write = async () => {
        const file = dataFile();
        const temp = `${file}.tmp`;
        await fs.mkdir(path.dirname(file), { recursive: true });
        await fs.writeFile(temp, json, 'utf8');
        await fs.rename(temp, file);
    };
    const result = writeQueue.then(write);
    writeQueue = result.catch(err => console.error('Failed to save game data:', err));
    return result;
}

/** Register the IPC handlers. Call once after the app is ready. */
export function registerFileStore(): void {
    ipcMain.handle(STORAGE_CHANNELS.load, () => load());
    ipcMain.handle(STORAGE_CHANNELS.save, (_event, data: unknown) => save(data));
}
