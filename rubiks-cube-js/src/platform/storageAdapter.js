// Storage adapter contract.
//
// Every place the app can keep data (browser localStorage, a file on disk
// via Electron IPC, a remote web API, ...) implements this shape. The rest
// of the app only talks to this interface, so swapping storage never touches
// game or UI code.
//
// Methods are async so that network- or IPC-backed adapters fit without
// changing callers.
//
// @typedef {Object} StorageAdapter
// @property {string} name                       Short id, e.g. 'localStorage'.
// @property {() => Promise<object|null>} load   Saved game data, or null if none / unreadable.
// @property {(data: object) => Promise<void>} save  Persist the full game data object.

export {};
