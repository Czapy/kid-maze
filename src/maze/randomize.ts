import {
    ALGORITHMS,
    MAZE_TYPES,
    SHAPES,
    type GenerationParams,
    type MazeTypeId,
} from "./types";
import { pick, randInt, type Rng } from "./rng";

/**
 * Size ranges used when randomizing. Narrower than the slider limits so a random maze is
 * always a sensible, printable kids' maze (neither a handful of cells nor a wall of them).
 */
export const RANDOM_SIZE: Record<
    MazeTypeId,
    { cols: [number, number]; rows: [number, number] }
> = {
    rectangular: { cols: [8, 28], rows: [10, 36] },
    circular: { cols: [8, 28], rows: [8, 28] },
    hexagonal: { cols: [7, 20], rows: [8, 24] },
    triangular: { cols: [4, 12], rows: [8, 24] },
    shape: { cols: [24, 48], rows: [24, 48] },
    diamond: { cols: [11, 35], rows: [11, 35] },
};

const RANDOM_RINGS: [number, number] = [5, 14];

/** Slider limits per maze type. The controls and the randomizer both use these. */
export const SIZE_LIMITS: Record<
    MazeTypeId,
    { cols: [number, number]; rows: [number, number] }
> = {
    rectangular: { cols: [3, 60], rows: [3, 60] },
    circular: { cols: [3, 60], rows: [3, 60] },
    hexagonal: { cols: [3, 40], rows: [3, 40] },
    triangular: { cols: [2, 30], rows: [3, 40] },
    shape: { cols: [10, 70], rows: [10, 70] },
    diamond: { cols: [5, 61], rows: [5, 61] },
};

export const RINGS_LIMITS: [number, number] = [3, 25];
export const CENTER_CELLS_LIMITS: [number, number] = [1, 12];

/** Groups of settings that can be kept as they are when randomizing. */
export interface RandomizeLocks {
    type: boolean;
    size: boolean;
    difficulty: boolean;
}

export const NO_LOCKS: RandomizeLocks = {
    type: false,
    size: false,
    difficulty: false,
};

const clamp = (v: number, [min, max]: [number, number]) =>
    Math.min(max, Math.max(min, v));

/**
 * Fits a kept (locked) size into what `type` allows: within its slider limits, and odd for
 * the diamond. Keeps the value as close to the original as possible.
 */
export function fitSizeToType(
    p: Pick<GenerationParams, "cols" | "rows" | "rings" | "centerCells">,
    type: MazeTypeId,
): Pick<GenerationParams, "cols" | "rows" | "rings" | "centerCells"> {
    const limits = SIZE_LIMITS[type];
    let cols = clamp(p.cols, limits.cols);
    if (type === "diamond" && cols % 2 === 0) {
        // Even is invalid; step to the nearest odd value that is still within the limits.
        cols = cols + 1 <= limits.cols[1] ? cols + 1 : cols - 1;
    }
    return {
        cols,
        rows: clamp(p.rows, limits.rows),
        rings: clamp(p.rings, RINGS_LIMITS),
        centerCells: clamp(p.centerCells, CENTER_CELLS_LIMITS),
    };
}

/** Inclusive random integer in [min, max]. */
function between(rng: Rng, [min, max]: [number, number]): number {
    return min + randInt(rng, max - min + 1);
}

/** Rounds to the nearest multiple of 0.05, matching the sliders' step. */
function snap(v: number): number {
    return Math.round(v * 20) / 20;
}

/**
 * Picks a complete, random set of generation parameters (everything that is not style or
 * page related). The result is always within the ranges the controls allow.
 */
export function randomParams(
    rng: Rng,
    current?: GenerationParams,
    locks: RandomizeLocks = NO_LOCKS,
): GenerationParams {
    // Settings in a locked group keep their value from `current`; the rest are re-rolled.
    // Without `current` there is nothing to keep, so locks have no effect.
    const keep = current ? locks : NO_LOCKS;

    const type = keep.type ? current!.type : pick(rng, MAZE_TYPES).id;
    const shape = keep.type ? current!.shape : pick(rng, SHAPES).id;

    let size: Pick<GenerationParams, "cols" | "rows" | "rings" | "centerCells">;
    if (keep.size) {
        // The type may have changed, so the kept size must be made valid for it.
        size = fitSizeToType(current!, type);
    } else {
        const range = RANDOM_SIZE[type];
        let cols = between(rng, range.cols);
        // The diamond is a single odd size (the slider only produces odd values).
        if (type === "diamond" && cols % 2 === 0) cols += 1;
        size = {
            cols,
            rows: between(rng, range.rows),
            rings: between(rng, RANDOM_RINGS),
            // Favor the center-goal layout (1) since it is the classic circular maze.
            centerCells: rng() < 0.6 ? 1 : between(rng, [3, 8]),
        };
    }

    const difficulty = keep.difficulty
        ? {
              algorithm: current!.algorithm,
              twistiness: current!.twistiness,
              braid: current!.braid,
              farEnds: current!.farEnds,
          }
        : {
              algorithm: pick(rng, ALGORITHMS).id,
              // Mostly perfect mazes; occasionally add loops.
              braid: rng() < 0.7 ? 0 : snap(rng() * 0.6),
              twistiness: snap(rng()),
              farEnds: rng() < 0.8,
          };

    return {
        type,
        shape,
        ...size,
        ...difficulty,
        // Always re-rolled, so "Surprise me" never repeats the same maze.
        seed: randInt(rng, 1_000_000),
    };
}

/** A non-reproducible random source for interactive use. */
export const unseededRng: Rng = () => Math.random();

/** Maximum number of randomizations that can be undone. */
export const MAX_HISTORY = 100;

/**
 * Returns a new history with `entry` pushed on top, dropping the oldest entries so the
 * result never exceeds `max`. The input array is not modified.
 */
export function pushHistory<T>(
    history: readonly T[],
    entry: T,
    max: number = MAX_HISTORY,
): T[] {
    const next = [...history, entry];
    return next.length > max ? next.slice(next.length - max) : next;
}

/** Undo/redo stacks of earlier values, newest last. */
export interface UndoState<T> {
    past: T[];
    future: T[];
}

export const emptyUndo = <T>(): UndoState<T> => ({ past: [], future: [] });

/**
 * Records that `current` is being replaced by a new value. Starts a new branch, so anything
 * that could previously be redone is discarded. The past is capped at `max`.
 */
export function recordChange<T>(
    state: UndoState<T>,
    current: T,
    max: number = MAX_HISTORY,
): UndoState<T> {
    return { past: pushHistory(state.past, current, max), future: [] };
}

/**
 * Steps back. Returns the value to restore and the new state, or null when there is
 * nothing to undo. `current` goes onto the redo stack.
 */
export function undo<T>(
    state: UndoState<T>,
    current: T,
): { value: T; state: UndoState<T> } | null {
    if (!state.past.length) return null;
    return {
        value: state.past[state.past.length - 1],
        state: {
            past: state.past.slice(0, -1),
            future: [...state.future, current],
        },
    };
}

/**
 * Steps forward again after an undo. Returns the value to restore and the new state, or
 * null when there is nothing to redo. `current` goes back onto the undo stack.
 */
export function redo<T>(
    state: UndoState<T>,
    current: T,
    max: number = MAX_HISTORY,
): { value: T; state: UndoState<T> } | null {
    if (!state.future.length) return null;
    return {
        value: state.future[state.future.length - 1],
        state: {
            past: pushHistory(state.past, current, max),
            future: state.future.slice(0, -1),
        },
    };
}
