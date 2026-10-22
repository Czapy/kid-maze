import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Controls,
    type PageSettings,
    type PaperSize,
} from "./components/Controls";
import { MazePreview, type MazePreviewHandle } from "./components/MazePreview";
import {
    generateMaze,
    pushHistory,
    randomParams,
    solve,
    unseededRng,
    type GenerationParams,
} from "./maze";
import { PresetsPanel } from "./components/PresetsPanel";
import { LANGUAGES, useI18n, type Lang } from "./i18n";
import { DEFAULT_STYLE, type MazeStyle } from "./render/style";
import {
    loadState,
    saveState,
    type PresetConfig,
    type UserPreset,
} from "./storage";

function randomSeed(): number {
    return Math.floor(Math.random() * 1_000_000);
}

/** Fresh defaults; each call picks a new random seed. */
const makeDefaultParams = (): GenerationParams => ({
    type: "rectangular",
    algorithm: "backtracker",
    seed: randomSeed(),
    cols: 10,
    rows: 10,
    rings: 8,
    centerCells: 1,
    braid: 0,
    twistiness: 0.5,
    shape: "heart",
    farEnds: true,
});

/** Paper sizes in millimetres (portrait). */
const PAPER_MM: Record<PaperSize, [number, number]> = {
    a4: [210, 297],
    letter: [215.9, 279.4],
    a3: [297, 420],
    square: [250, 250],
};

function paperDims(page: PageSettings): [number, number] {
    const [w, h] = PAPER_MM[page.paper];
    return page.orientation === "portrait" ? [w, h] : [h, w];
}

const DEFAULT_PAGE: PageSettings = { paper: "a4", orientation: "portrait" };

const makeDefaults = () => ({
    params: makeDefaultParams(),
    style: DEFAULT_STYLE,
    page: DEFAULT_PAGE,
});

function newId(): string {
    return (
        globalThis.crypto?.randomUUID?.() ?? `p${Date.now()}${Math.random()}`
    );
}

function download(filename: string, blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function App() {
    const { m, f, lang, setLang } = useI18n();
    // Read storage once, on first render only.
    const [initial] = useState(() => loadState(makeDefaults()));
    const [params, setParams] = useState<GenerationParams>(initial.params);
    const [style, setStyle] = useState<MazeStyle>(initial.style);
    const [page, setPage] = useState<PageSettings>(initial.page);
    const [showSolution, setShowSolution] = useState(initial.showSolution);
    const [presets, setPresets] = useState<UserPreset[]>(initial.presets);
    const [presetsOpen, setPresetsOpen] = useState(initial.presetsOpen);
    const previewRef = useRef<MazePreviewHandle>(null);

    // Persist everything shortly after the last change (sliders fire many updates).
    useEffect(() => {
        const t = setTimeout(
            () =>
                saveState({
                    params,
                    style,
                    page,
                    showSolution,
                    presets,
                    presetsOpen,
                }),
            250,
        );
        return () => clearTimeout(t);
    }, [params, style, page, showSolution, presets, presetsOpen]);

    const maze = useMemo(() => generateMaze(params), [params]);
    const solution = useMemo(() => solve(maze, maze.start, maze.end), [maze]);
    const [paperW, paperH] = paperDims(page);

    // Keep a dynamic @page rule in sync so printing uses the selected paper size.
    useEffect(() => {
        let el = document.getElementById(
            "page-size-style",
        ) as HTMLStyleElement | null;
        if (!el) {
            el = document.createElement("style");
            el.id = "page-size-style";
            document.head.appendChild(el);
        }
        el.textContent = `@page { size: ${paperW}mm ${paperH}mm; margin: 0; }`;
    }, [paperW, paperH]);

    const updateParams = useCallback((p: Partial<GenerationParams>) => {
        setParams((prev) => {
            const next = { ...prev, ...p };
            // Switching type: pick sensible default sizes so mazes are not huge/tiny.
            if (p.type && p.type !== prev.type) {
                const defaults: Record<string, Partial<GenerationParams>> = {
                    rectangular: { cols: 15, rows: 20 },
                    hexagonal: { cols: 12, rows: 14 },
                    triangular: { cols: 8, rows: 16 },
                    shape: { cols: 40, rows: 40 },
                    diamond: { cols: 21 },
                    circular: {},
                };
                Object.assign(next, defaults[p.type]);
            }
            return next;
        });
    }, []);

    const updateStyle = useCallback(
        (s: Partial<MazeStyle>) => setStyle((prev) => ({ ...prev, ...s })),
        [],
    );
    const updatePage = useCallback(
        (p: Partial<PageSettings>) => setPage((prev) => ({ ...prev, ...p })),
        [],
    );

    const randomize = useCallback(() => {
        setParams((prev) => ({
            ...prev,
            seed: randomSeed(),
        }));
    }, []);

    // Previous parameter sets, newest last. Only filled by "randomize everything".
    const [history, setHistory] = useState<GenerationParams[]>([]);

    const randomizeAll = useCallback(() => {
        setHistory((h) => pushHistory(h, params));
        setParams(randomParams(unseededRng));
    }, [params]);

    const undoRandomize = useCallback(() => {
        if (!history.length) return;
        setParams(history[history.length - 1]);
        setHistory(history.slice(0, -1));
    }, [history]);

    const currentConfig = useCallback((): PresetConfig => {
        const { seed: _seed, ...rest } = params;
        return { params: rest, style, page };
    }, [params, style, page]);

    const savePreset = useCallback(
        (name: string) =>
            setPresets((prev) => [
                ...prev,
                { id: newId(), name, config: currentConfig() },
            ]),
        [currentConfig],
    );

    const applyPreset = useCallback(
        (id: string) => {
            const preset = presets.find((p) => p.id === id);
            if (!preset) return;
            const { config } = preset;
            // Keep the current seed so applying a preset doesn't silently change the maze layout.
            setParams((prev) => ({ ...config.params, seed: prev.seed }));
            setStyle(config.style);
            setPage(config.page);
        },
        [presets],
    );

    const overwritePreset = useCallback(
        (id: string) =>
            setPresets((prev) =>
                prev.map((p) =>
                    p.id === id ? { ...p, config: currentConfig() } : p,
                ),
            ),
        [currentConfig],
    );

    const renamePreset = useCallback(
        (id: string, name: string) =>
            setPresets((prev) =>
                prev.map((p) => (p.id === id ? { ...p, name } : p)),
            ),
        [],
    );

    const deletePreset = useCallback(
        (id: string) => setPresets((prev) => prev.filter((p) => p.id !== id)),
        [],
    );

    const resetAll = useCallback(() => {
        setParams(makeDefaultParams());
        setStyle(DEFAULT_STYLE);
        setPage(DEFAULT_PAGE);
        setShowSolution(false);
    }, []);

    const downloadSvg = useCallback(() => {
        const svg = previewRef.current?.getSvg();
        if (!svg) return;
        const clone = svg.clone();
        clone.attr({ width: `${paperW}mm`, height: `${paperH}mm` });
        const markup = clone.svg();
        clone.remove();
        download(
            `maze-${params.seed}.svg`,
            new Blob([markup], { type: "image/svg+xml" }),
        );
    }, [paperW, paperH, params.seed]);

    const downloadPng = useCallback(() => {
        const svg = previewRef.current?.getSvg();
        if (!svg) return;
        const pxW = 2480; // ~300dpi at A4 width
        const pxH = Math.round((pxW * paperH) / paperW);
        const clone = svg.clone();
        clone.attr({ width: pxW, height: pxH });
        const markup = clone.svg();
        clone.remove();
        const url = URL.createObjectURL(
            new Blob([markup], { type: "image/svg+xml;charset=utf-8" }),
        );
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = pxW;
            canvas.height = pxH;
            const ctx = canvas.getContext("2d")!;
            ctx.drawImage(img, 0, 0, pxW, pxH);
            URL.revokeObjectURL(url);
            canvas.toBlob(
                (b) => b && download(`maze-${params.seed}.png`, b),
                "image/png",
            );
        };
        img.src = url;
    }, [paperW, paperH, params.seed]);

    return (
        <div className="app">
            <header className="topbar no-print">
                <h1>🧩 {m.app.title}</h1>
                <span className="subtitle">
                    {f(m.app.stats, {
                        cells: maze.nodes.length,
                        length: solution.length,
                    })}
                </span>
                <label className="lang-select">
                    <span className="sr-only">{m.app.language}</span>
                    <select
                        value={lang}
                        aria-label={m.app.language}
                        onChange={(e) => setLang(e.target.value as Lang)}
                    >
                        {LANGUAGES.map((l) => (
                            <option key={l.id} value={l.id}>
                                {l.label}
                            </option>
                        ))}
                    </select>
                </label>
            </header>
            <aside className="sidebar no-print">
                <Controls
                    params={params}
                    style={style}
                    page={page}
                    showSolution={showSolution}
                    onParams={updateParams}
                    onStyle={updateStyle}
                    onStyleReplace={setStyle}
                    onPage={updatePage}
                    onShowSolution={setShowSolution}
                    onRandomize={randomize}
                    onRandomizeAll={randomizeAll}
                    onUndoRandomize={undoRandomize}
                    undoCount={history.length}
                    onPrint={() => window.print()}
                    onDownloadSvg={downloadSvg}
                    onDownloadPng={downloadPng}
                />
            </aside>
            <main className="stage">
                <MazePreview
                    ref={previewRef}
                    maze={maze}
                    style={style}
                    showSolution={showSolution}
                    solution={solution}
                    aspect={paperW / paperH}
                />
            </main>
            <PresetsPanel
                presets={presets}
                open={presetsOpen}
                onToggle={() => setPresetsOpen((o) => !o)}
                onSave={savePreset}
                onApply={applyPreset}
                onOverwrite={overwritePreset}
                onRename={renamePreset}
                onDelete={deletePreset}
                onResetAll={resetAll}
            />
        </div>
    );
}
