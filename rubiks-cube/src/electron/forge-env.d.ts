// Globals that Electron Forge's Vite plugin defines for the main process.
/// <reference types="@electron-forge/plugin-vite/forge-vite-env" />

declare module 'electron-squirrel-startup' {
    /** True when the app was launched by the Windows installer to create/remove shortcuts. */
    const started: boolean;
    export default started;
}
