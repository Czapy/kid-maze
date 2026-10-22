import { braid, carve } from "./algorithms";
import { wallMid } from "./builder";
import {
    circular,
    diamond,
    hexagonal,
    rectangular,
    shaped,
    triangular,
} from "./generators";
import { createRng } from "./rng";
import { distances } from "./solver";
import type { GenerationParams, Maze, Point, WallShape } from "./types";

export * from "./types";
export { solve } from "./solver";
export {
    MAX_HISTORY,
    emptyUndo,
    randomParams,
    recordChange,
    redo,
    undo,
    unseededRng,
    type UndoState,
} from "./randomize";

function dist2(a: Point, b: Point): number {
    return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}

function nodeIsInsideWall(maze: Maze, nodeId: number, w: WallShape): boolean {
    // A cell touches a border wall if the wall's midpoint is within about one cell of the cell center
    // AND the midpoint lies on the cell's outline (checked via distance to outline segments).
    const mid = wallMid(w);
    const outline = maze.nodes[nodeId].outline;
    const tol = 1e-3;
    for (let i = 0; i < outline.length; i++) {
        const a = outline[i];
        const b = outline[(i + 1) % outline.length];
        const abx = b.x - a.x;
        const aby = b.y - a.y;
        const len2 = abx * abx + aby * aby;
        if (len2 === 0) continue;
        let t = ((mid.x - a.x) * abx + (mid.y - a.y) * aby) / len2;
        t = Math.max(0, Math.min(1, t));
        const px = a.x + abx * t;
        const py = a.y + aby * t;
        if ((mid.x - px) ** 2 + (mid.y - py) ** 2 < tol) return true;
    }
    return false;
}

/**
 * For each border wall, the single cell it belongs to (or -1). Computed by
 * checking which nearby cell's outline contains the wall midpoint.
 */
function borderOwners(maze: Maze): number[] {
    return maze.border.map((w) => {
        const mid = wallMid(w);
        let best = -1;
        let bestD = Infinity;
        for (const n of maze.nodes) {
            const d = dist2(n.center, mid);
            if (d < bestD && d < 4 && nodeIsInsideWall(maze, n.id, w)) {
                bestD = d;
                best = n.id;
            }
        }
        return best;
    });
}

function buildGeometry(p: GenerationParams): Maze {
    switch (p.type) {
        case "rectangular":
            return rectangular(p.cols, p.rows);
        case "circular":
            return circular(p.rings, p.centerCells);
        case "hexagonal":
            return hexagonal(p.cols, p.rows);
        case "triangular":
            return triangular(p.cols, p.rows);
        case "shape":
            return shaped(p.shape, p.cols, p.rows);
        case "diamond":
            return diamond(p.cols);
    }
}

/** Builds geometry, carves passages, and chooses the entrance and exit. */
export function generateMaze(params: GenerationParams): Maze {
    const rng = createRng(params.seed);
    const maze = buildGeometry(params);
    carve(maze, params.algorithm, rng, params.twistiness);
    braid(maze, params.braid, rng);

    const owners = borderOwners(maze);
    // Cells that can host an entrance/exit gap, with the wall index to open.
    const gapFor = new Map<number, number>();
    owners.forEach((cell, wallIdx) => {
        if (cell >= 0 && !gapFor.has(cell)) gapFor.set(cell, wallIdx);
    });
    const candidates = [...gapFor.keys()];

    // Circular mazes with a center disc: start on the outside, finish in the middle.
    const centerGoal = params.type === "circular" && params.centerCells <= 1;

    if (centerGoal) {
        maze.end = 0;
        const d = distances(maze, 0);
        maze.start = candidates.reduce(
            (best, c) => (d[c] > d[best] ? c : best),
            candidates[0],
        );
        maze.startGap = gapFor.get(maze.start) ?? null;
        maze.endGap = null;
        return maze;
    }

    if (!candidates.length) {
        maze.startGap = null;
        maze.endGap = null;
        return maze;
    }

    if (params.farEnds) {
        // Farthest pair among border cells: sweep from an arbitrary border cell, then from its farthest.
        const d0 = distances(maze, candidates[0]);
        const a = candidates.reduce(
            (best, c) => (d0[c] > d0[best] ? c : best),
            candidates[0],
        );
        const d1 = distances(maze, a);
        const b = candidates.reduce(
            (best, c) => (d1[c] > d1[best] ? c : best),
            candidates[0],
        );
        maze.start = a;
        maze.end = b;
    } else {
        // Default: opposite corners-ish (min and max reading order among border cells).
        maze.start = candidates[0];
        maze.end = candidates[candidates.length - 1];
    }
    maze.startGap = gapFor.get(maze.start) ?? null;
    maze.endGap = gapFor.get(maze.end) ?? null;
    if (maze.startGap === maze.endGap) maze.endGap = null;
    return maze;
}
