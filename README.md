# Rubiks-Electron
Playing around with building an electron application to play with a Rubik's cube digitally.

This is my attempt at learning electron since it gives the ability to build desktop applications using front end web frameworks/language that I'm already familiar with. 

# Project layout

- `rubiks-cube/` – the app: TypeScript, three.js, Vite, and Electron Forge. It builds as both an Electron desktop app and a website from the same code.

## Running it

From `rubiks-cube/`:

| Command | What it does |
| --- | --- |
| `npm start` | Run the Electron app in development (Vite dev server, DevTools open) |
| `npm run dev:web` | Run the website locally in a browser |
| `npm run build:web` | Build the website into `dist-web/` (static files, host anywhere) |
| `npm run package` / `npm run make` | Package the Electron app / build installers |
| `npm test` | Unit tests (Vitest) |
| `npm run typecheck` | Type-check everything (TypeScript) |
| `npm run test:e2e` | Browser tests of the web build (Playwright). First time: `npx playwright install chromium` |

The Electron app and the website are built from the same `index.html` and `src/renderer.ts`.

## Continuous integration and the website

`.github/workflows/web.yml` type-checks and runs the unit and browser tests on every push and pull request. Pushes to `main` also build the website and publish it to GitHub Pages. To turn publishing on, set **Settings > Pages > Source** to **GitHub Actions** once.

## Where data is saved

- **Website:** the browser's localStorage.
- **Electron app:** `game-data.json` in the app's user-data folder (`~/.config/rubiks-cube-js/` on Linux, `%APPDATA%\rubiks-cube-js\` on Windows, `~/Library/Application Support/rubiks-cube-js/` on macOS). Data saved by older versions in localStorage is picked up automatically.

## How `rubiks-cube/src` is organised

The code is split so that everything except `electron/` and `platform/` can run as a plain web page.

| Folder | What lives there | May use |
| --- | --- | --- |
| `core/` | Pure rules and data: shared types (`types.ts`), the cube model (`cubeModel.ts`), notation, scramble, themes, algorithms, settings rules, stats, save format and migration. Unit tested (`npm test`) | Nothing (no DOM, no three.js) |
| `view/` | three.js scene and turn animation (`CubeView`). Draws whatever cube state it is given | three.js, its own canvas |
| `ui/` | Sidebar, status line, settings modal, algorithm panel, keyboard shortcuts | DOM |
| `app/` | Game flow (`gameController`), settings store, and `bootstrap` which wires everything together | core, view, ui |
| `platform/` | Storage adapters and file import/export. The only place web and Electron are allowed to differ | Browser / Electron bridge |
| `electron/` | Electron main process and the (small) preload bridge | Electron, Node |

`renderer.ts` is the entry point (loaded by `index.html`): it calls `bootstrap(createPlatform())`.

# Goals
- [x] Get the basic electron application running
- [x] Figure out including node modules within the application (bundled with webpack)
    - [x] Use file storage for the Electron app (`game-data.json` in the app's user-data folder)
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
    - [x] Create a storage adapter interface (`platform/types.ts`) so storage can be swapped
    - [x] Add a web build target and publish it (GitHub Pages, see below)
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
4. ~~Shrink the settings modal (move fixed markup into `<template>`s in `index.html`).~~
5. ~~Switch the build to Vite so the same renderer also builds as a website.~~
6. ~~Convert to TypeScript and retire the old `rubiks-cube-ts` scaffold.~~
7. ~~Publish the web build; add an Electron file-storage adapter over IPC.~~
8. Accounts and cloud sync via an API storage adapter.
9. Other cube sizes (2x2, 4x4, ...), built on the cube model.
