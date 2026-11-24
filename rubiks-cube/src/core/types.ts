// Shared data shapes. These describe everything the app stores or passes
// between layers; start here when reading the code.

/** A face that can be turned. */
export type Face = 'R' | 'L' | 'U' | 'D' | 'F' | 'B';

/** An axis the whole cube can be rotated around. */
export type Axis = 'x' | 'y' | 'z';

/** A quarter turn of one face layer, or a quarter rotation of the whole cube. */
export interface Move {
    face: Face | Axis;
    clockwise: boolean;
    /**
     * Which layer to turn, counted from `face`: 1 (default) is the outer
     * face, 2 the layer behind it, and so on. Written "2R". Face turns only.
     */
    layer?: number;
}

/** Sticker colours (0-5), 6 x size x size of them, indexed by sticker slot. See core/cubeModel.ts. */
export type CubeState = number[];

export const MIN_CUBE_SIZE = 2;
export const MAX_CUBE_SIZE = 7;

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
    /** When this game was last saved (ISO 8601); used to pick the newer game when syncing. */
    updatedAt?: string;
}

export interface SolveRecord {
    /** Unique id, so solves from several devices can be merged. Missing on solves saved before sync existed. */
    id?: string;
    /** When it was solved (ISO 8601). Missing on older solves. */
    solvedAt?: string;
    moves: number;
    /** Local time, for display. */
    timestamp: string;
    /** Local date, for display. */
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
    /** Cubies per edge: 3 for a standard cube. */
    cubeSize: number;
}

/** Everything the app persists. Saved data from older versions may differ (see loadSavedGame). */
export interface GameData {
    /** When settings last changed (ISO 8601); used to pick the newer settings when syncing. */
    settingsUpdatedAt?: string;
    solves: SolveRecord[];
    /** Current format is SavedGame; older saves are migrated when loaded. */
    currentGame: SavedGame | Record<string, unknown>;
    stats: Stats;
    settings: Settings;
}
