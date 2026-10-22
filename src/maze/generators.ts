import { buildFromPolygons, normalize, type PolyCell } from "./builder";
import { shapeMask } from "./shapes";
import type {
    Maze,
    MazeEdge,
    MazeNode,
    Point,
    ShapeId,
    WallShape,
} from "./types";

const SQRT3 = Math.sqrt(3);

/** Rectangular grid of square cells (1x1). */
export function rectangular(cols: number, rows: number): Maze {
    const cells: PolyCell[] = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            cells.push({
                verts: [
                    { x: c, y: r },
                    { x: c + 1, y: r },
                    { x: c + 1, y: r + 1 },
                    { x: c, y: r + 1 },
                ],
            });
        }
    }
    return normalize(buildFromPolygons(cells));
}

/** Square grid rotated 45 degrees and clipped to a diamond silhouette. */
export function diamond(size: number): Maze {
    const n = Math.max(2, size);
    const cells: PolyCell[] = [];
    const mid = (n - 1) / 2;
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            // Keep cells within a diamond: |dx| + |dy| <= mid
            if (Math.abs(c - mid) + Math.abs(r - mid) > mid + 0.01) continue;
            cells.push({
                verts: [
                    { x: c, y: r },
                    { x: c + 1, y: r },
                    { x: c + 1, y: r + 1 },
                    { x: c, y: r + 1 },
                ],
            });
        }
    }
    return normalize(buildFromPolygons(cells));
}

/** Pointy-top hexagons, laid out in an odd-r offset grid. */
export function hexagonal(cols: number, rows: number): Maze {
    const cells: PolyCell[] = [];
    const size = 1; // circumradius
    const w = SQRT3 * size;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cx = c * w + (r % 2 ? w / 2 : 0) + w / 2;
            const cy = r * 1.5 * size + size;
            const verts: Point[] = [];
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI / 180) * (60 * i - 30);
                verts.push({
                    x: cx + size * Math.cos(a),
                    y: cy + size * Math.sin(a),
                });
            }
            cells.push({ verts });
        }
    }
    return normalize(buildFromPolygons(cells));
}

/** Triangular grid: rows of alternating up/down triangles. */
export function triangular(cols: number, rows: number): Maze {
    const cells: PolyCell[] = [];
    const side = 1;
    const h = (SQRT3 / 2) * side;
    // Triangle i in a row has its bounding box starting at x = i * side / 2.
    // Rows alternate which parity points up, so horizontal edges line up between rows:
    // a down-triangle's flat top edge matches the up-triangle's flat bottom edge above it.
    // An odd count per row makes both ends of a row point the same way, so the outline is symmetric.
    const perRow = cols * 2 + 1;
    for (let r = 0; r < rows; r++) {
        for (let i = 0; i < perRow; i++) {
            const x0 = (i * side) / 2;
            const y0 = r * h;
            const y1 = y0 + h;
            const up = (i + r) % 2 === 0;
            const verts: Point[] = up
                ? [
                      { x: x0 + side / 2, y: y0 },
                      { x: x0 + side, y: y1 },
                      { x: x0, y: y1 },
                  ]
                : [
                      { x: x0, y: y0 },
                      { x: x0 + side, y: y0 },
                      { x: x0 + side / 2, y: y1 },
                  ];
            cells.push({ verts });
        }
    }
    return normalize(buildFromPolygons(cells));
}

/** Rectangular grid masked with a silhouette; keeps only the largest connected region. */
export function shaped(shape: ShapeId, cols: number, rows: number): Maze {
    const mask = shapeMask(shape);
    const cells: PolyCell[] = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (!mask((c + 0.5) / cols, (r + 0.5) / rows)) continue;
            cells.push({
                verts: [
                    { x: c, y: r },
                    { x: c + 1, y: r },
                    { x: c + 1, y: r + 1 },
                    { x: c, y: r + 1 },
                ],
            });
        }
    }
    return normalize(keepLargestComponent(cells));
}

function keepLargestComponent(cells: PolyCell[]): Maze {
    const maze = buildFromPolygons(cells);
    const n = maze.nodes.length;
    const comp = new Int32Array(n).fill(-1);
    const sizes: number[] = [];
    for (let i = 0; i < n; i++) {
        if (comp[i] !== -1) continue;
        const id = sizes.length;
        let count = 0;
        const stack = [i];
        comp[i] = id;
        while (stack.length) {
            const u = stack.pop()!;
            count++;
            for (const v of maze.nodes[u].edges) {
                if (comp[v] === -1) {
                    comp[v] = id;
                    stack.push(v);
                }
            }
        }
        sizes.push(count);
    }
    if (sizes.length <= 1) return maze;
    let best = 0;
    sizes.forEach((s, i) => {
        if (s > sizes[best]) best = i;
    });
    return buildFromPolygons(cells.filter((_, i) => comp[i] === best));
}

/**
 * Circular (polar) maze. Ring 0 is a single center disc if `centerCells` is 1,
 * otherwise rings start at radius 1. Cell counts double when cells would become
 * too wide, keeping cells roughly square.
 */
export function circular(rings: number, centerCells: number): Maze {
    const nodes: MazeNode[] = [];
    const edges: MazeEdge[] = [];
    const border: WallShape[] = [];
    const TWO_PI = Math.PI * 2;

    const ringCount: number[] = [];
    const ringStart: number[] = [];
    // With a center disc, ring 0 is the disc (radius 0..1) and ring k spans [k, k+1].
    // Without, there is a hollow core: ring k spans [k+1, k+2].
    const hasCenterDisc = centerCells <= 1;
    const radiusInner = (k: number) => (hasCenterDisc ? k : k + 1);
    const radiusOuter = (k: number) => radiusInner(k) + 1;

    // First real ring: roughly one cell per unit of arc length at its mid radius.
    const firstRing = hasCenterDisc ? 1 : 0;
    let base = hasCenterDisc
        ? Math.max(5, Math.round(TWO_PI * (radiusInner(firstRing) + 0.5)))
        : Math.max(3, centerCells);
    for (let k = 0; k < rings; k++) {
        if (hasCenterDisc && k === 0) {
            ringCount.push(1);
            continue;
        }
        // Double the cell count whenever cells would become too wide (keeps cells roughly square).
        const arcLen = (TWO_PI * (radiusInner(k) + 0.5)) / base;
        if (k > firstRing && arcLen > 1.6) base *= 2;
        ringCount.push(base);
    }

    let total = 0;
    for (let k = 0; k < rings; k++) {
        ringStart.push(total);
        total += ringCount[k];
    }

    const maxR = radiusOuter(rings - 1);
    const cx = maxR;
    const cy = maxR;

    for (let k = 0; k < rings; k++) {
        const count = ringCount[k];
        const r0 = radiusInner(k);
        const r1 = radiusOuter(k);
        for (let i = 0; i < count; i++) {
            const id = ringStart[k] + i;
            if (count === 1 && r0 === 0) {
                const outline: Point[] = [];
                for (let s = 0; s < 24; s++) {
                    const a = (s / 24) * TWO_PI;
                    outline.push({
                        x: cx + Math.cos(a) * r1,
                        y: cy + Math.sin(a) * r1,
                    });
                }
                nodes.push({
                    id,
                    center: { x: cx, y: cy },
                    outline,
                    edges: [],
                });
                continue;
            }
            const a0 = (i / count) * TWO_PI;
            const a1 = ((i + 1) / count) * TWO_PI;
            const steps = 8;
            const outline: Point[] = [];
            for (let s = 0; s <= steps; s++) {
                const a = a0 + ((a1 - a0) * s) / steps;
                outline.push({
                    x: cx + Math.cos(a) * r1,
                    y: cy + Math.sin(a) * r1,
                });
            }
            for (let s = steps; s >= 0; s--) {
                const a = a0 + ((a1 - a0) * s) / steps;
                outline.push({
                    x: cx + Math.cos(a) * r0,
                    y: cy + Math.sin(a) * r0,
                });
            }
            const am = (a0 + a1) / 2;
            const rm = (r0 + r1) / 2;
            nodes.push({
                id,
                center: {
                    x: cx + Math.cos(am) * rm,
                    y: cy + Math.sin(am) * rm,
                },
                outline,
                edges: [],
            });
        }
    }

    const link = (a: number, b: number, wall: WallShape) => {
        edges.push({ id: edges.length, a, b, wall });
        nodes[a].edges.push(b);
        nodes[b].edges.push(a);
    };

    for (let k = 0; k < rings; k++) {
        const count = ringCount[k];
        const r0 = radiusInner(k);
        const r1 = radiusOuter(k);
        const isDisc = count === 1 && r0 === 0;

        // Radial walls between neighbors in the same ring.
        if (!isDisc) {
            for (let i = 0; i < count; i++) {
                const j = (i + 1) % count;
                const a = (j / count) * TWO_PI;
                const wall: WallShape = {
                    kind: "line",
                    a: { x: cx + Math.cos(a) * r0, y: cy + Math.sin(a) * r0 },
                    b: { x: cx + Math.cos(a) * r1, y: cy + Math.sin(a) * r1 },
                };
                if (count > 1) link(ringStart[k] + i, ringStart[k] + j, wall);
            }
        }

        // Arc walls between this ring and the next outward ring.
        if (k + 1 < rings) {
            const outerCount = ringCount[k + 1];
            if (isDisc) {
                for (let j = 0; j < outerCount; j++) {
                    const a0 = (j / outerCount) * TWO_PI;
                    const a1 = ((j + 1) / outerCount) * TWO_PI;
                    link(ringStart[k], ringStart[k + 1] + j, {
                        kind: "arc",
                        center: { x: cx, y: cy },
                        radius: r1,
                        startAngle: a0,
                        endAngle: a1,
                    });
                }
            } else {
                const ratio = outerCount / count; // 1 or 2
                for (let i = 0; i < count; i++) {
                    for (let m = 0; m < ratio; m++) {
                        const j = i * ratio + m;
                        const a0 = (j / outerCount) * TWO_PI;
                        const a1 = ((j + 1) / outerCount) * TWO_PI;
                        link(ringStart[k] + i, ringStart[k + 1] + j, {
                            kind: "arc",
                            center: { x: cx, y: cy },
                            radius: r1,
                            startAngle: a0,
                            endAngle: a1,
                        });
                    }
                }
            }
        }
    }

    // Hollow core: the innermost ring's inner edge is a closed wall.
    if (!hasCenterDisc) {
        const firstCount = ringCount[0];
        const r = radiusInner(0);
        for (let i = 0; i < firstCount; i++) {
            border.push({
                kind: "arc",
                center: { x: cx, y: cy },
                radius: r,
                startAngle: (i / firstCount) * TWO_PI,
                endAngle: ((i + 1) / firstCount) * TWO_PI,
            });
        }
    }

    // Outer border: arcs around the last ring.
    const lastCount = ringCount[rings - 1];
    for (let i = 0; i < lastCount; i++) {
        border.push({
            kind: "arc",
            center: { x: cx, y: cy },
            radius: maxR,
            startAngle: (i / lastCount) * TWO_PI,
            endAngle: ((i + 1) / lastCount) * TWO_PI,
        });
    }

    return {
        nodes,
        edges,
        open: new Set(),
        border,
        width: maxR * 2,
        height: maxR * 2,
        start: 0,
        end: nodes.length - 1,
        startGap: null,
        endGap: null,
        bounds: null,
        isCircular: true,
    };
}
