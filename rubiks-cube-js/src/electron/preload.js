// Preload script: the only bridge between Electron and the web page.
// See https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
//
// Keep this file small. App code belongs in the renderer (src/app, src/ui,
// src/view, src/core). Only expose narrow, explicit APIs here, e.g. a future
// file-storage API for platform/ to use instead of localStorage.

const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('versions', {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron
});
