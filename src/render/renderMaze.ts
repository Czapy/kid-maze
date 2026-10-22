import { SVG, type Svg } from "@svgdotjs/svg.js";
import { wallMid } from "../maze/builder";
import { distances } from "../maze/solver";
import type { Maze, Point, WallShape } from "../maze/types";
import type { MazeStyle } from "./style";

const f = (n: number) => Number(n.toFixed(3));

function wallToPath(w: WallShape): string {
    if (w.kind === "line")
        return `M${f(w.a.x)} ${f(w.a.y)}L${f(w.b.x)} ${f(w.b.y)}`;
    const { center, radius, startAngle, endAngle } = w;
    const sx = center.x + Math.cos(startAngle) * radius;
    const sy = center.y + Math.sin(startAngle) * radius;
    const ex = center.x + Math.cos(endAngle) * radius;
    const ey = center.y + Math.sin(endAngle) * radius;
    const large = endAngle - startAngle > Math.PI ? 1 : 0;
    return `M${f(sx)} ${f(sy)}A${f(radius)} ${f(radius)} 0 ${large} 1 ${f(ex)} ${f(ey)}`;
}

function lerpColor(a: string, b: string, t: number): string {
    const pa = parseInt(a.slice(1), 16);
    const pb = parseInt(b.slice(1), 16);
    const ch = (shift: number) => {
        const ca = (pa >> shift) & 255;
        const cb = (pb >> shift) & 255;
        return Math.round(ca + (cb - ca) * t);
    };
    return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

function outlinePath(pts: Point[]): string {
    return (
        pts.map((p, i) => `${i ? "L" : "M"}${f(p.x)} ${f(p.y)}`).join("") + "Z"
    );
}

/** Point just outside the maze through a border wall, used to extend the path to the gap. */
/**
 * Colors cells so neighbors differ (a checkerboard on any cell shape). Uses BFS 2-coloring;
 * cells that would clash (odd cycles in hex/triangle grids) get a third value, 2.
 */
function checkerColoring(maze: Maze): Uint8Array {
    const n = maze.nodes.length;
    const color = new Uint8Array(n).fill(255);
    for (let s = 0; s < n; s++) {
        if (color[s] !== 255) continue;
        color[s] = 0;
        const queue = [s];
        for (let h = 0; h < queue.length; h++) {
            const u = queue[h];
            for (const v of maze.nodes[u].edges) {
                if (color[v] === 255) {
                    color[v] = color[u] === 0 ? 1 : 0;
                    queue.push(v);
                }
            }
        }
    }
    // Resolve clashes (same color as a neighbor) with the third value.
    const result = Uint8Array.from(color);
    for (let u = 0; u < n; u++) {
        if (maze.nodes[u].edges.some((v) => v < u && result[v] === result[u])) {
            result[u] = 2;
        }
    }
    return result;
}

/**
 * Subdivides each segment, interpolating radius and angle around `c` so that
 * paths between cells in the same ring follow the ring's curvature instead of a chord.
 */
function polarSubdivide(pts: Point[], c: Point): Point[] {
    const out: Point[] = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        const ra = Math.hypot(a.x - c.x, a.y - c.y);
        const rb = Math.hypot(b.x - c.x, b.y - c.y);
        let ta = Math.atan2(a.y - c.y, a.x - c.x);
        const tb = Math.atan2(b.y - c.y, b.x - c.x);
        // Take the short way around; skip degenerate cases near the center.
        let dt = tb - ta;
        while (dt > Math.PI) dt -= Math.PI * 2;
        while (dt < -Math.PI) dt += Math.PI * 2;
        if (ra < 1e-6 || rb < 1e-6 || Math.abs(dt) < 1e-6) {
            out.push(b);
            continue;
        }
        const steps = Math.max(1, Math.ceil(Math.abs(dt) / 0.12));
        for (let s = 1; s <= steps; s++) {
            const t = s / steps;
            const r = ra + (rb - ra) * t;
            const th = ta + dt * t;
            out.push({ x: c.x + Math.cos(th) * r, y: c.y + Math.sin(th) * r });
        }
        ta = tb;
    }
    return out;
}

function gapExit(maze: Maze, wallIdx: number, from: Point): Point {
    const mid = wallMid(maze.border[wallIdx]);
    const dx = mid.x - from.x;
    const dy = mid.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: mid.x + (dx / len) * 0.6, y: mid.y + (dy / len) * 0.6 };
}

export interface RenderOptions {
    showSolution: boolean;
    solution: number[];
}

/**
 * Renders the maze into `host` as an SVG using SVG.js. The SVG uses a viewBox so
 * it scales to any size (screen, print, export) without losing quality.
 */
export function renderMaze(
    host: HTMLElement,
    maze: Maze,
    style: MazeStyle,
    opts: RenderOptions,
): Svg {
    host.innerHTML = "";

    const longest = Math.max(maze.width, maze.height);
    const pad = Math.max(0.8, longest * style.margin);
    const titleH = style.title ? longest * style.titleSize * 1.8 : 0;
    const vbW = maze.width + pad * 2;
    const vbH = maze.height + pad * 2 + titleH;

    const draw = SVG().addTo(host).viewbox(0, 0, vbW, vbH);
    draw.attr({
        width: "100%",
        height: "100%",
        preserveAspectRatio: "xMidYMid meet",
    });
    draw.rect(vbW, vbH).fill(style.background);

    if (style.title) {
        draw.text(style.title)
            .font({
                family: style.fontFamily,
                size: longest * style.titleSize,
                anchor: "middle",
                weight: "bold",
            })
            .fill(style.titleColor)
            .center(vbW / 2, pad * 0.5 + (longest * style.titleSize) / 2 + 0.2);
    }

    const g = draw.group().translate(pad, pad + titleH);

    // 1. Cell fills
    if (style.fillMode !== "none") {
        const fills = g.group();
        const dist =
            style.fillMode === "distance" ? distances(maze, maze.start) : null;
        const maxD = dist ? Math.max(1, ...Array.from(dist)) : 1;
        const checker =
            style.fillMode === "checker" ? checkerColoring(maze) : null;
        for (const n of maze.nodes) {
            let color = style.cellColor;
            if (dist)
                color = lerpColor(
                    style.gradientFrom,
                    style.gradientTo,
                    dist[n.id] / maxD,
                );
            else if (checker) {
                const c = checker[n.id];
                color =
                    c === 0
                        ? style.cellColor
                        : c === 1
                          ? style.checkerColor
                          : lerpColor(style.cellColor, style.checkerColor, 0.5);
            }
            // Slight stroke in the same color hides hairline gaps between adjacent cells.
            fills
                .path(outlinePath(n.outline))
                .fill(color)
                .stroke({ color, width: 0.02 });
        }
    }

    // 2. Solution (drawn under walls so walls stay crisp)
    if (opts.showSolution && opts.solution.length) {
        // Route through the midpoint of each crossed wall so the path follows the passage
        // instead of cutting corners (matters for curved/polar and irregular cells).
        const edgeBetween = new Map<string, number>();
        for (const e of maze.edges) {
            edgeBetween.set(`${e.a}-${e.b}`, e.id);
            edgeBetween.set(`${e.b}-${e.a}`, e.id);
        }
        const pts: Point[] = [maze.nodes[opts.solution[0]].center];
        for (let i = 1; i < opts.solution.length; i++) {
            const edgeId = edgeBetween.get(
                `${opts.solution[i - 1]}-${opts.solution[i]}`,
            );
            if (edgeId !== undefined)
                pts.push(wallMid(maze.edges[edgeId].wall));
            pts.push(maze.nodes[opts.solution[i]].center);
        }
        if (maze.startGap !== null)
            pts.unshift(gapExit(maze, maze.startGap, pts[0]));
        if (maze.endGap !== null)
            pts.push(gapExit(maze, maze.endGap, pts[pts.length - 1]));
        const smooth = maze.isCircular
            ? polarSubdivide(pts, { x: maze.width / 2, y: maze.height / 2 })
            : pts;
        const d = smooth
            .map((p, i) => `${i ? "L" : "M"}${f(p.x)} ${f(p.y)}`)
            .join("");
        const sw = style.solutionWidth;
        g.path(d)
            .fill("none")
            .stroke({
                color: style.solutionColor,
                width: sw,
                linecap: "round",
                linejoin: "round",
                dasharray: style.solutionDashed
                    ? `${sw * 1.6} ${sw * 1.4}`
                    : undefined,
            });
    }

    // 3. Walls: interior walls that are closed, plus the border minus entrance/exit gaps.
    const segs: string[] = [];
    for (const e of maze.edges)
        if (!maze.open.has(e.id)) segs.push(wallToPath(e.wall));
    maze.border.forEach((w, i) => {
        if (i === maze.startGap || i === maze.endGap) return;
        segs.push(wallToPath(w));
    });
    g.path(segs.join("")).fill("none").stroke({
        color: style.wallColor,
        width: style.wallWidth,
        linecap: style.lineCap,
        linejoin: "round",
    });

    // 4. Optional heavier frame over the border
    if (style.frame) {
        const frameSegs: string[] = [];
        maze.border.forEach((w, i) => {
            if (i === maze.startGap || i === maze.endGap) return;
            frameSegs.push(wallToPath(w));
        });
        g.path(frameSegs.join(""))
            .fill("none")
            .stroke({
                color: style.frameColor,
                width: style.wallWidth * 1.8,
                linecap: style.lineCap,
                linejoin: "round",
            });
    }

    // 5. Start / end markers
    drawMarker(g, maze.nodes[maze.start].center, style, "start");
    drawMarker(g, maze.nodes[maze.end].center, style, "end");

    return draw;
}

function drawMarker(
    g: ReturnType<Svg["group"]>,
    at: Point,
    style: MazeStyle,
    which: "start" | "end",
) {
    if (style.markerStyle === "none") return;
    const color = which === "start" ? style.startColor : style.endColor;
    if (style.markerStyle === "circles") {
        g.circle(0.5)
            .fill(color)
            .stroke({ color: style.wallColor, width: 0.04 })
            .center(at.x, at.y);
        return;
    }
    const glyph = which === "start" ? style.startEmoji : style.endEmoji;
    g.text(glyph)
        .font({
            size: 0.75,
            anchor: "middle",
            family: "Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif",
        })
        .center(at.x, at.y);
}

/** Serialized, standalone SVG markup for download. */
export function svgToString(
    svg: Svg,
    widthMm?: number,
    heightMm?: number,
): string {
    const clone = svg.clone();
    if (widthMm && heightMm) {
        clone.attr({ width: `${widthMm}mm`, height: `${heightMm}mm` });
    }
    const markup = clone.svg();
    clone.remove();
    return markup;
}
