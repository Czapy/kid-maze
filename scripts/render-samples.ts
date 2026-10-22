import { createSVGWindow } from "svgdom";
import { SVG, registerWindow } from "@svgdotjs/svg.js";
import { mkdirSync, writeFileSync } from "node:fs";
import {
    MAZE_TYPES,
    generateMaze,
    solve,
    type GenerationParams,
} from "../src/maze";
import { renderMaze } from "../src/render/renderMaze";
import { DEFAULT_STYLE } from "../src/render/style";

const window = createSVGWindow();
registerWindow(window, window.document);
void SVG;

const base: GenerationParams = {
    type: "rectangular",
    algorithm: "backtracker",
    seed: 7,
    cols: 14,
    rows: 14,
    rings: 7,
    centerCells: 1,
    braid: 0,
    twistiness: 0.5,
    shape: "heart",
    farEnds: true,
};

mkdirSync("out", { recursive: true });
for (const t of MAZE_TYPES) {
    const p: GenerationParams = {
        ...base,
        type: t.id,
        ...(t.id === "shape" ? { cols: 30, rows: 30 } : {}),
        ...(t.id === "diamond" ? { cols: 15 } : {}),
        ...(t.id === "triangular" ? { cols: 8, rows: 14 } : {}),
    };
    const maze = generateMaze(p);
    const host = window.document.createElement("div");
    const svg = renderMaze(
        host as unknown as HTMLElement,
        maze,
        { ...DEFAULT_STYLE, markerStyle: "circles", fillMode: "checker" },
        {
            showSolution: true,
            solution: solve(maze, maze.start, maze.end),
        },
    );
    writeFileSync(`out/${t.id}.svg`, svg.svg());
    console.log("wrote", t.id);
}
