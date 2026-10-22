import {
    ALGORITHMS,
    MAZE_TYPES,
    SHAPES,
    generateMaze,
    solve,
} from "../src/maze";
import {
    MAX_HISTORY,
    emptyUndo,
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

// Slider limits from Controls.tsx (kept in sync by hand; this test would catch drift).
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
