import {
    ALGORITHMS,
    MAZE_TYPES,
    SHAPES,
    generateMaze,
    solve,
    type GenerationParams,
} from "../src/maze";
import { distances } from "../src/maze/solver";

const base: GenerationParams = {
    type: "rectangular",
    algorithm: "backtracker",
    seed: 1,
    cols: 12,
    rows: 12,
    rings: 7,
    centerCells: 1,
    braid: 0,
    twistiness: 0.5,
    shape: "heart",
    farEnds: true,
};

let failures = 0;
let checked = 0;
const fail = (msg: string) => {
    failures++;
    console.log("FAIL", msg);
};

for (const type of MAZE_TYPES) {
    const variants: Partial<GenerationParams>[] = [{}];
    if (type.id === "circular")
        variants.push({ centerCells: 4 }, { centerCells: 1, rings: 12 });
    if (type.id === "shape")
        variants.push(
            ...SHAPES.map((s) => ({ shape: s.id, cols: 30, rows: 30 })),
        );
    if (type.id === "diamond") variants.push({ cols: 21 });

    for (const v of variants) {
        for (const alg of ALGORITHMS) {
            for (const farEnds of [true, false]) {
                for (const braid of [0, 0.6]) {
                    const p = {
                        ...base,
                        type: type.id,
                        algorithm: alg.id,
                        farEnds,
                        braid,
                        ...v,
                    };
                    const label = `${type.id}/${alg.id}/${JSON.stringify(v)}/far=${farEnds}/braid=${braid}`;
                    checked++;
                    let maze: ReturnType<typeof generateMaze>;
                    try {
                        maze = generateMaze(p);
                    } catch (err) {
                        fail(`${label}: ${(err as Error).message}`);
                        continue;
                    }
                    const n = maze.nodes.length;

                    // Connected: every node reachable from start.
                    const d = distances(maze, 0);
                    if (d.some((x) => x < 0))
                        fail(`${label}: not fully connected`);

                    // Perfect maze has exactly n-1 open edges; braiding adds more.
                    if (braid === 0 && maze.open.size !== n - 1)
                        fail(`${label}: open=${maze.open.size} n=${n}`);

                    // Solvable, and start != end.
                    const path = solve(maze, maze.start, maze.end);
                    if (!path.length) fail(`${label}: no solution`);
                    if (maze.start === maze.end) fail(`${label}: start == end`);

                    // Gaps
                    const centerGoal =
                        type.id === "circular" && p.centerCells <= 1;
                    if (maze.startGap === null)
                        fail(`${label}: missing start gap`);
                    if (!centerGoal && maze.endGap === null)
                        fail(`${label}: missing end gap`);
                    if (maze.startGap !== null && maze.startGap === maze.endGap)
                        fail(`${label}: same gap`);
                }
            }
        }
    }
}

console.log(`checked ${checked} configurations, ${failures} failures`);
process.exit(failures ? 1 : 0);
