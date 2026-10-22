import {
    ALGORITHMS,
    MAZE_TYPES,
    SHAPES,
    generateMaze,
    solve,
    type GenerationParams,
} from "../src/maze";
import {
    MAX_HISTORY,
    NO_LOCKS,
    SIZE_LIMITS,
    emptyUndo,
    fitSizeToType,
    pushHistory,
    randomParams,
    recordChange,
    redo,
    undo,
    type UndoState,
} from "../src/maze/randomize";
import { createRng } from "../src/maze/rng";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
    if (!ok) failures++;
    console.log(ok ? "ok  " : "FAIL", name, ok ? "" : detail);
};

// An independent copy of the slider limits: if SIZE_LIMITS is changed by accident, the
// "within slider limits" check below still compares against these known-good values.
const LIMITS = {
    rectangular: { cols: [3, 60], rows: [3, 60] },
    circular: { cols: [3, 60], rows: [3, 60] },
    hexagonal: { cols: [3, 40], rows: [3, 40] },
    triangular: { cols: [2, 30], rows: [3, 40] },
    shape: { cols: [10, 70], rows: [10, 70] },
    diamond: { cols: [5, 61], rows: [5, 61] },
} as const;

const N = 600;
const seenTypes = new Set<string>();
const seenAlgorithms = new Set<string>();
const seenShapes = new Set<string>();
let badLimits = "";
let badRanges = "";
let badMaze = "";

for (let i = 0; i < N; i++) {
    const p = randomParams(createRng(i + 1));
    seenTypes.add(p.type);
    seenAlgorithms.add(p.algorithm);
    seenShapes.add(p.shape);

    const lim = LIMITS[p.type];
    if (p.cols < lim.cols[0] || p.cols > lim.cols[1])
        badLimits += ` cols(${p.type}:${p.cols})`;
    if (
        p.type !== "diamond" &&
        (p.rows < lim.rows[0] || p.rows > lim.rows[1])
    ) {
        badLimits += ` rows(${p.type}:${p.rows})`;
    }
    if (p.type === "diamond" && p.cols % 2 === 0)
        badLimits += ` diamond-even(${p.cols})`;
    if (p.rings < 3 || p.rings > 25) badRanges += ` rings(${p.rings})`;
    if (p.centerCells < 1 || p.centerCells > 12)
        badRanges += ` center(${p.centerCells})`;
    if (p.braid < 0 || p.braid > 1 || p.twistiness < 0 || p.twistiness > 1)
        badRanges += " fraction";
    if (!Number.isInteger(p.seed) || p.seed < 0)
        badRanges += ` seed(${p.seed})`;

    try {
        const maze = generateMaze(p);
        if (!solve(maze, maze.start, maze.end).length)
            badMaze += ` unsolvable#${i}`;
        if (maze.start === maze.end) badMaze += ` start==end#${i}`;
    } catch (e) {
        badMaze += ` threw#${i}(${p.type}): ${(e as Error).message}`;
    }
}

check(`${N} random params are within slider limits`, !badLimits, badLimits);
check("other values are within range", !badRanges, badRanges);
check(`${N} random params all generate solvable mazes`, !badMaze, badMaze);
check(
    "every maze type gets picked",
    seenTypes.size === MAZE_TYPES.length,
    [...seenTypes].join(),
);
check(
    "every algorithm gets picked",
    seenAlgorithms.size === ALGORITHMS.length,
    [...seenAlgorithms].join(),
);
check(
    "every shape gets picked",
    seenShapes.size === SHAPES.length,
    [...seenShapes].join(),
);

// Determinism and variety
const a = randomParams(createRng(7));
const b = randomParams(createRng(7));
check(
    "same rng seed gives same params",
    JSON.stringify(a) === JSON.stringify(b),
);
const distinct = new Set(
    Array.from({ length: 50 }, (_, i) =>
        JSON.stringify(randomParams(createRng(i))),
    ),
);
check("different rng seeds vary", distinct.size > 40, String(distinct.size));

// Only generation parameters come out (nothing style related)
const keys = Object.keys(a).sort().join(",");
check(
    "result has exactly the generation parameter keys",
    keys ===
        "algorithm,braid,centerCells,cols,farEnds,rings,rows,seed,shape,twistiness,type",
    keys,
);

// History cap
check("MAX_HISTORY is 100", MAX_HISTORY === 100);
let h: number[] = [];
for (let i = 0; i < 150; i++) h = pushHistory(h, i);
check("history capped at 100", h.length === 100);
check(
    "history keeps the newest, drops the oldest",
    h[0] === 50 && h[99] === 149,
    `${h[0]}..${h[99]}`,
);
const before = [1, 2, 3];
const after = pushHistory(before, 4);
check(
    "pushHistory does not mutate input",
    before.length === 3 && after.length === 4,
);
check(
    "pushHistory below cap keeps everything",
    JSON.stringify(after) === "[1,2,3,4]",
);
check(
    "custom cap respected",
    JSON.stringify(pushHistory([1, 2, 3], 4, 3)) === "[2,3,4]",
);

// ---- Locks ----
const baseParams: GenerationParams = {
    type: "rectangular",
    algorithm: "kruskal",
    seed: 42,
    cols: 33,
    rows: 44,
    rings: 20,
    centerCells: 9,
    braid: 0.35,
    twistiness: 0.85,
    shape: "star",
    farEnds: false,
};
const TYPE_KEYS = ["type", "shape"] as const;
const SIZE_KEYS = ["cols", "rows", "rings", "centerCells"] as const;
const DIFF_KEYS = ["algorithm", "twistiness", "braid", "farEnds"] as const;

const same = (
    a: GenerationParams,
    b: GenerationParams,
    keys: readonly (keyof GenerationParams)[],
) => keys.every((k) => a[k] === b[k]);

let keptType = true;
let keptSize = true;
let keptDiff = true;
let validLocked = "";
let unlockedVaries = { type: false, size: false, diff: false };
let allLockedOk = true;

for (let i = 0; i < 400; i++) {
    const r = createRng(1000 + i);

    const t = randomParams(r, baseParams, {
        type: true,
        size: false,
        difficulty: false,
    });
    if (!same(t, baseParams, TYPE_KEYS)) keptType = false;
    if (!same(t, baseParams, SIZE_KEYS)) unlockedVaries.size = true;
    if (!same(t, baseParams, DIFF_KEYS)) unlockedVaries.diff = true;

    const s2 = randomParams(r, baseParams, {
        type: false,
        size: true,
        difficulty: false,
    });
    if (s2.type !== baseParams.type) unlockedVaries.type = true;
    if (!same(s2, baseParams, DIFF_KEYS)) unlockedVaries.diff = true;
    // The kept size is fitted to the (possibly new) type, so check it matches the fit rule.
    const fit = fitSizeToType(baseParams, s2.type);
    if (!same(s2, { ...baseParams, ...fit }, SIZE_KEYS)) keptSize = false;

    const d = randomParams(r, baseParams, {
        type: false,
        size: false,
        difficulty: true,
    });
    if (!same(d, baseParams, DIFF_KEYS)) keptDiff = false;

    // Combined locks: every combination must give a valid, generatable, solvable maze.
    for (const lt of [false, true]) {
        for (const ls of [false, true]) {
            for (const ld of [false, true]) {
                const p = randomParams(r, baseParams, {
                    type: lt,
                    size: ls,
                    difficulty: ld,
                });

                const lim = SIZE_LIMITS[p.type];
                const inRange =
                    p.cols >= lim.cols[0] &&
                    p.cols <= lim.cols[1] &&
                    p.rows >= lim.rows[0] &&
                    p.rows <= lim.rows[1];
                if (!inRange)
                    validLocked += ` range(${p.type}:${p.cols}x${p.rows})`;
                if (p.type === "diamond" && p.cols % 2 === 0)
                    validLocked += ` even-diamond(${p.cols})`;
                try {
                    const maze = generateMaze(p);
                    if (!solve(maze, maze.start, maze.end).length)
                        validLocked += ` unsolvable(${p.type})`;
                } catch (e) {
                    validLocked += ` threw(${p.type}): ${(e as Error).message}`;
                }
                if (lt && lt !== (p.type === baseParams.type))
                    allLockedOk = false;
            }
        }
    }
}

check("type lock keeps type and silhouette", keptType);
check("size lock keeps size (fitted to the type)", keptSize);
check("difficulty lock keeps all difficulty settings", keptDiff);
check("unlocked size varies", unlockedVaries.size);
check("unlocked difficulty varies", unlockedVaries.diff);
check("unlocked type varies", unlockedVaries.type);
check(
    "every lock combination gives valid, solvable mazes",
    !validLocked,
    validLocked.slice(0, 300),
);
check("type lock holds in every combination", allLockedOk);

// Kept size is fitted into a new type's limits
const big = { cols: 50, rows: 55, rings: 20, centerCells: 9 };
const tri = fitSizeToType(big, "triangular");
check(
    "oversized kept size clamped for triangular",
    tri.cols === 30 && tri.rows === 40,
    JSON.stringify(tri),
);
const tiny = fitSizeToType(
    { cols: 3, rows: 3, rings: 3, centerCells: 1 },
    "shape",
);
check(
    "undersized kept size raised for shape",
    tiny.cols === 10 && tiny.rows === 10,
    JSON.stringify(tiny),
);
check(
    "even size made odd for diamond",
    fitSizeToType({ ...big, cols: 20 }, "diamond").cols % 2 === 1,
);
check(
    "diamond at the upper limit stays odd and in range",
    fitSizeToType({ ...big, cols: 100 }, "diamond").cols === 61,
);
check(
    "in-range size is unchanged",
    JSON.stringify(
        fitSizeToType(
            { cols: 12, rows: 14, rings: 8, centerCells: 1 },
            "rectangular",
        ),
    ) === JSON.stringify({ cols: 12, rows: 14, rings: 8, centerCells: 1 }),
);

// Seed always re-rolls, even with everything locked
const allLocked = { type: true, size: true, difficulty: true };
const seeds = new Set<number>();
let othersSame = true;
for (let i = 0; i < 40; i++) {
    const p = randomParams(createRng(i + 5), baseParams, allLocked);
    seeds.add(p.seed);
    const fit = fitSizeToType(baseParams, baseParams.type);
    if (
        !same(p, { ...baseParams, ...fit }, [
            ...TYPE_KEYS,
            ...SIZE_KEYS,
            ...DIFF_KEYS,
        ])
    )
        othersSame = false;
}
check("all locked: only the seed changes", othersSame);
check("all locked: seed still varies", seeds.size > 30, String(seeds.size));

// No current params means locks cannot apply
check(
    "locks without current params are ignored",
    randomParams(createRng(3), undefined, allLocked).cols ===
        randomParams(createRng(3)).cols,
);
check(
    "no locks given equals unlocked",
    JSON.stringify(randomParams(createRng(9), baseParams, NO_LOCKS)) ===
        JSON.stringify(randomParams(createRng(9), baseParams)),
);

// Undo / redo model
const e = emptyUndo<string>();
check("undo on empty is null", undo(e, "x") === null);
check("redo on empty is null", redo(e, "x") === null);

// A -> (randomize) B -> (randomize) C
let s: UndoState<string> = recordChange(emptyUndo<string>(), "A");
s = recordChange(s, "B");
check(
    "record stacks the past",
    JSON.stringify(s.past) === '["A","B"]' && s.future.length === 0,
);

let cur = "C";
const u1 = undo(s, cur)!;
check("undo restores the previous value", u1.value === "B");
check(
    "undo moves current to redo",
    JSON.stringify(u1.state.future) === '["C"]' && u1.state.past.length === 1,
);

const u2 = undo(u1.state, u1.value)!;
check(
    "second undo goes further back",
    u2.value === "A" && u2.state.past.length === 0,
);
check("undo past the start is null", undo(u2.state, u2.value) === null);

const r1 = redo(u2.state, u2.value)!;
check("redo goes forward again", r1.value === "B");
const r2 = redo(r1.state, r1.value)!;
check("redo returns to the latest value", r2.value === "C");
check("redo past the end is null", redo(r2.state, r2.value) === null);
check(
    "undo then redo round-trips the state",
    JSON.stringify(r2.state) === JSON.stringify(s) && r2.value === cur,
);

// A new randomization after an undo discards the redo branch
const afterUndo = undo(s, cur)!; // now at B, future = [C]
cur = afterUndo.value;
const branched = recordChange(afterUndo.state, cur);
check("new change clears redo", branched.future.length === 0);
check(
    "new change keeps undo history",
    JSON.stringify(branched.past) === '["A","B"]',
);
check("cleared redo cannot be redone", redo(branched, "D") === null);

// Cap applies to the undo stack, including via redo
let capped = emptyUndo<number>();
for (let i = 0; i < 250; i++) capped = recordChange(capped, i);
check("undo stack capped at 100", capped.past.length === MAX_HISTORY);
check(
    "oldest entries dropped",
    capped.past[0] === 150 && capped.past[99] === 249,
);

let value = 250;
let steps = 0;
while (steps < 500) {
    const step = undo(capped, value);
    if (!step) break;
    capped = step.state;
    value = step.value;
    steps++;
}
check("exactly 100 undos available", steps === 100, String(steps));
check(
    "undid all the way back to the oldest kept",
    value === 150,
    String(value),
);
check(
    "redo stack holds everything undone",
    capped.future.length === 100,
    String(capped.future.length),
);

let redone = 0;
while (redone < 500) {
    const step = redo(capped, value);
    if (!step) break;
    capped = step.state;
    value = step.value;
    redone++;
}
check("exactly 100 redos available", redone === 100, String(redone));
check("redo returns to the starting value", value === 250, String(value));
check(
    "stacks stay within the cap after redo",
    capped.past.length <= MAX_HISTORY,
);

// Inputs are not mutated
const frozen: UndoState<number> = Object.freeze({
    past: Object.freeze([1, 2]) as number[],
    future: Object.freeze([9]) as number[],
});
let threw = false;
try {
    undo(frozen, 3);
    redo(frozen, 3);
    recordChange(frozen, 3);
} catch {
    threw = true;
}
check("operations do not mutate their input", !threw);

console.log(failures ? `${failures} FAILED` : "all passed");
process.exit(failures ? 1 : 0);
