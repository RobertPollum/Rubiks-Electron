// Preload script: the only bridge between Electron and the web page.
// See https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
//
// Keep this file small. App code belongs in the renderer (src/app, src/ui,
// src/view, src/core). Only expose narrow, explicit APIs here: version info,
// and game-data storage that platform/electronFileAdapter.ts uses.

import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronStorage, ElectronVersions } from '../platform/types';
import type { GameData } from '../core/types';

// Must match STORAGE_CHANNELS in fileStore.ts (not imported, to keep the
// preload bundle free of main-process code).
const STORAGE_LOAD = 'storage:load';
const STORAGE_SAVE = 'storage:save';

const versions: ElectronVersions = {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron
};

const storage: ElectronStorage = {
    load: () => ipcRenderer.invoke(STORAGE_LOAD),
    save: (data: GameData) => ipcRenderer.invoke(STORAGE_SAVE, data)
};

contextBridge.exposeInMainWorld('versions', versions);
contextBridge.exposeInMainWorld('rubiksStorage', storage);
