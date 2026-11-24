// Shared data shapes. These describe everything the app stores or passes
// between layers; start here when reading the code.

/** A face that can be turned. */
export type Face = 'R' | 'L' | 'U' | 'D' | 'F' | 'B';

/** An axis the whole cube can be rotated around. */
export type Axis = 'x' | 'y' | 'z';

/** A quarter turn of one face, or a quarter rotation of the whole cube. */
export interface Move {
    face: Face | Axis;
    clockwise: boolean;
}

/** 54 sticker colours (0-5), indexed by sticker slot. See core/cubeModel.ts. */
export type CubeState = number[];

/** Six hex colours ("#RRGGBB"), one per face in FACE_ORDER. */
export type Palette = string[];

/** Status shown in the sidebar. */
export type CubeStatus = 'solved' | 'scrambled' | 'solving';

/** One entry in the move history. */
export interface MoveRecord {
    notation: string;
    timestamp: number;
}

/** The game in progress, as saved (version 2). See core/savedGame.ts. */
export interface SavedGame {
    version: 2;
    cubeState: CubeStatus;
    /** Cube at the start of the attempt, as a 54-digit string; null for a fresh solved cube. */
    start: string | null;
    scramble: string[];
    moveHistory: MoveRecord[];
}

export interface SolveRecord {
    moves: number;
    timestamp: string;
    date: string;
}

export interface Stats {
    totalSolves: number;
    bestSolve: number | null;
    averageMoves: number;
}

export interface ColorTheme {
    name: string;
    description: string;
    colors: Palette;
}

export interface UserPreset extends ColorTheme {
    id: string;
    createdAt: string;
}

export interface Settings {
    /** Built-in theme id or user preset id ("user_..."). */
    theme: string;
    /** Per-face overrides; when set, they win over the theme. */
    customColors: Palette | null;
    userPresets: UserPreset[];
    scrambleAmount: number;
    replaySpeed: number;
}

/** Everything the app persists. Saved data from older versions may differ (see loadSavedGame). */
export interface GameData {
    solves: SolveRecord[];
    /** Current format is SavedGame; older saves are migrated when loaded. */
    currentGame: SavedGame | Record<string, unknown>;
    stats: Stats;
    settings: Settings;
}
