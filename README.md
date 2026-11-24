# Rubiks-Electron
Playing around with building an electron application to play with a Rubik's cube digitally.

This is my attempt at learning electron since it gives the ability to build desktop applications using front end web frameworks/language that I'm already familiar with. 

# Project layout

- `rubiks-cube-js/` – the working app (Electron Forge + webpack + three.js). All active development happens here.
- `rubiks-cube-ts/` – an early TypeScript scaffold. It is being replaced by converting `rubiks-cube-js` to TypeScript in place (see Roadmap), not kept in parity.

## How `rubiks-cube-js/src` is organised

The code is split so that everything except `electron/` and `platform/` can run as a plain web page.

| Folder | What lives there | May use |
| --- | --- | --- |
| `core/` | Pure rules and data: the cube model (`cubeModel.js`), notation, scramble, themes, algorithms, settings rules, stats, save format and migration. Unit tested (`npm test`) | Nothing (no DOM, no three.js) |
| `view/` | three.js scene and turn animation (`CubeView`). Draws whatever cube state it is given | three.js, its own canvas |
| `ui/` | Sidebar, status line, settings modal, algorithm panel, keyboard shortcuts | DOM |
| `app/` | Game flow (`gameController`), settings store, and `bootstrap` which wires everything together | core, view, ui |
| `platform/` | Storage adapters and file import/export. The only place web and Electron are allowed to differ | Browser / Electron bridge |
| `electron/` | Electron main process and the (small) preload bridge | Electron, Node |

`renderer.js` is the entry point: it calls `bootstrap(createPlatform())`.

# Goals
- [x] Get the basic electron application running
- [x] Figure out including node modules within the application (bundled with webpack)
    - [ ] Ideally use file storage for electron app (add an Electron storage adapter in `platform/`)
- [x] Get a Three JS render running within the application
- [x] Transform basic render into a 3x3x3 set of cubes
- [x] Create a predefined matrix to then generate the 3x3x3 cube
    - This will help me define the data store for the cube and state
- [x] Create scambling logic for the cube so that it can actually be solved
    - IE Sides need to pair up correctly so that once __solved__ for a side, the edges on each side will match up.
    - [x] Make the amount the cube scrambles user defined (IE, between 1 and infinity)
    - [x] Save the scramble amount to user settings
- [x] Create interaction with cube to change rows
    - Functions will need to be defined for how the 9x9x9 matrix will transform based on the move
    - Create a visual transformation within the cube
- [ ] Potential play by play walkthrough of solving a cube
    - [x] Algorithm viewer that sets up a case and plays the algorithm
    - [ ] Step-by-step walkthrough of a full solve
- [x] Move tracking for a round of solving the cube
    - [x] Replay of the moves since the last scramble/reset
- [ ] Migrate node/interaction code so that it can run as a web application
    - [x] Move the game out of the Electron preload script into the renderer
    - [x] Separate code into `core` / `view` / `ui` / `app` / `platform` / `electron`
    - [x] Create a storage adapter interface (`platform/storageAdapter.js`) so storage can be swapped
    - [ ] Add a web build target and publish it (e.g. GitHub Pages)
    - [ ] Add individual user log in that allows different people to access their cube data on the web
    - [ ] Data backup for an account if it's an electron application? IE story in Google Drive, Dropbox, Onedrive, Mega, etc...
- [x] Storage for session to allow user to return and pick up where they left off when the application opens/closes
- [ ] Allow user to modify the cube
    - [ ] Allow them to modify number of cubes 2x2, 3x3, 4x4, etc. This may require an interace redesin.
    - [x] Allow user to modify the colors used for the faces in realtime.
    - [x] Create some predefined color sets, things for color blindness, high contrast, grayscale, standard, pastel
    - [x] Allow user to save and load color sets
    - [x] Allow user to import and export color sets

# Roadmap

1. ~~Move the game out of `preload.js` and separate concerns into folders.~~
2. ~~Add a pure cube model in `core/` with unit tests (`npm test`); make turns awaitable.~~
    - ~~Fix turn directions to match standard notation.~~
    - ~~Fix replay (status after replay, replay after reloading the app).~~
3. ~~Escape imported/saved text in the UI; make the status line readable.~~
4. Shrink the settings modal (move fixed markup into `<template>`s in `index.html`).
5. Switch the build to Vite (Electron Forge has a Vite plugin) so the same renderer also builds as a website.
6. Convert `rubiks-cube-js` to TypeScript, starting with `core/`; retire `rubiks-cube-ts`.
7. Publish the web build; add an Electron file-storage adapter over IPC.
8. Accounts and cloud sync via an API storage adapter.
9. Other cube sizes (2x2, 4x4, ...), built on the cube model.
