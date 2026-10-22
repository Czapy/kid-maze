# Kid Maze Maker

A small React + TypeScript app for generating printable mazes for kids.
Mazes are rendered as **SVG** (via [SVG.js](https://svgjs.dev/)), so they scale
to any size without losing quality. Print them directly, or export SVG / PNG.

## Run

```sh
npm install
npm run dev
```

## Deploy (GitHub Pages)

Pushing to `main` runs `.github/workflows/deploy.yml`, which installs, runs
`npm run verify`, builds, and publishes `dist/` to GitHub Pages. One-time setup
in the repository: **Settings -> Pages -> Build and deployment -> Source:
GitHub Actions**. The build uses relative asset paths (`base: './'`), so it
works under `https://<user>.github.io/<repo>/` without further configuration.

## Features

- **6 maze types**: rectangular, circular (with center goal), hexagonal,
  triangular, shaped silhouettes (heart, star, circle, cross, arrow), diamond.
- **7 generation algorithms**: recursive backtracker, Prim's, Kruskal's,
  Wilson's, Aldous-Broder, growing tree, hunt-and-kill.
- **Difficulty controls**: size, twistiness, loops (dead-end removal),
  entrance/exit placement, reproducible seed.
- **Style controls**: presets, wall thickness / ends / color, paper color,
  heavy frame, cell fill (solid, distance gradient, checkerboard), margin,
  emoji or dot start/end markers, solution color / thickness / dashed, title.
- **Saved settings**: your configuration is stored in `localStorage` and
  restored on reload.
- **My presets**: a collapsible right-hand sidebar to save the current setup
  (maze type, size, algorithm, style, page) under a name, then apply, rename,
  overwrite or delete it. Applying a preset keeps the current seed.
- **Languages**: English and Hungarian, chosen from the selector in the top
  bar. The choice is remembered; the first visit follows the browser language.
- **Solution view**: toggle the shortest path on and off.
- **Output**: browser print (with matching `@page` size for A4 / Letter / A3 /
  square), SVG download, 300 dpi PNG download.

## Architecture

- `src/maze/`: pure logic, no DOM. Every maze type is built as a graph of cells
  and walls, so all algorithms, braiding and the BFS solver work for every type.
- `src/render/`: SVG.js renderer and style model.
- `src/components/`: React controls and preview.

## Adding a language

1. Copy `src/i18n/en.ts` to `src/i18n/<code>.ts` and translate the values
   (keep `{placeholders}` intact). It is typed as `Messages`, so a missing key
   is a compile error.
2. Register it in `src/i18n/index.tsx` (`Lang`, `LANGUAGES`, `DICTIONARIES`).

## Dev scripts

- `npm run verify`: generates every type x algorithm combination and checks
  connectivity, perfect-maze edge count, solvability and entrance/exit gaps,
  then tests loading/saving settings (corrupt or outdated storage) and checks
  that every translation has the same keys and placeholders as English.
- `npm run samples`: renders sample SVG/PNG files for each type into `out/`.
