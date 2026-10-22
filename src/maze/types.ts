import type { Rng } from "./rng";

export interface Point {
    x: number;
    y: number;
}

/**
 * A wall segment between two points. Straight walls are lines; curved walls
 * (used by circular mazes) are circular arcs around `center`.
 */
export type WallShape =
    | { kind: "line"; a: Point; b: Point }
    | {
          kind: "arc";
          center: Point;
          radius: number;
          /** radians */
          startAngle: number;
          /** radians, always > startAngle */
          endAngle: number;
      };

export interface MazeNode {
    id: number;
    /** Center used for drawing the solution path and markers. */
    center: Point;
    /** Outline used for filling cells (may be empty for arcs-only nodes). */
    outline: Point[];
    /** Neighbor node ids reachable through `edges`. */
    edges: number[];
}

export interface MazeEdge {
    id: number;
    a: number;
    b: number;
    /** Wall drawn between a and b while the edge is closed. */
    wall: WallShape;
}

/** Undirected graph of cells plus the set of carved (open) edges. */
export interface Maze {
    nodes: MazeNode[];
    edges: MazeEdge[];
    /** Edge ids that are open (passages). */
    open: Set<number>;
    /** Boundary walls that are always drawn (outer border), except entrance/exit. */
    border: WallShape[];
    /** Overall drawing bounds in maze units. */
    width: number;
    height: number;
    start: number;
    end: number;
    /** Where the entrance/exit gaps are cut into the border (indexes into `border`). */
    startGap: number | null;
    endGap: number | null;
    /** Optional decorative outline clip for shaped mazes. */
    bounds: Point[] | null;
    /** True if the outer border is a circle (circular mazes). */
    isCircular: boolean;
}

export type MazeTypeId =
    | "rectangular"
    | "circular"
    | "hexagonal"
    | "triangular"
    | "shape"
    | "diamond";

export type AlgorithmId =
    | "backtracker"
    | "prim"
    | "kruskal"
    | "wilson"
    | "aldousBroder"
    | "growingTree"
    | "huntAndKill";

export type ShapeId = "heart" | "star" | "circle" | "cross" | "arrow";

export interface GenerationParams {
    type: MazeTypeId;
    algorithm: AlgorithmId;
    seed: number;
    /** Generic size controls; meaning depends on type. */
    cols: number;
    rows: number;
    rings: number;
    /** Cells around the innermost ring (circular). */
    centerCells: number;
    /** 0..1 fraction of dead ends to remove (creates loops). */
    braid: number;
    /** 0..1 bias toward long straight corridors (backtracker/growing tree). */
    twistiness: number;
    shape: ShapeId;
    /** Place start/end far apart (true) or at default positions. */
    farEnds: boolean;
}

export interface Generated {
    maze: Maze;
    rng: Rng;
}

// Display names live in the i18n dictionaries (src/i18n), keyed by these ids.
export const MAZE_TYPES: { id: MazeTypeId }[] = [
    { id: "rectangular" },
    { id: "circular" },
    { id: "hexagonal" },
    { id: "triangular" },
    { id: "shape" },
    { id: "diamond" },
];

export const ALGORITHMS: { id: AlgorithmId }[] = [
    { id: "backtracker" },
    { id: "prim" },
    { id: "kruskal" },
    { id: "wilson" },
    { id: "aldousBroder" },
    { id: "growingTree" },
    { id: "huntAndKill" },
];

export const SHAPES: { id: ShapeId }[] = [
    { id: "heart" },
    { id: "star" },
    { id: "circle" },
    { id: "cross" },
    { id: "arrow" },
];
