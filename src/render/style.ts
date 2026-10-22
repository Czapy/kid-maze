export type FillMode = "none" | "solid" | "distance" | "checker";
export type LineCap = "round" | "square" | "butt";
export type MarkerStyle = "none" | "circles" | "emoji" | "symbols";

/**
 * Start/end symbol pairs for the printer-friendly 'symbols' marker style. They differ by
 * shape, not color, and are drawn in the wall color, so they survive black-and-white printing.
 */
export type SymbolSet = "ringDot" | "arrowFlag" | "starSquare" | "letters";

export interface MazeStyle {
    background: string;
    wallColor: string;
    /** Wall thickness as a fraction of one cell (e.g. 0.1). */
    wallWidth: number;
    lineCap: LineCap;
    fillMode: FillMode;
    cellColor: string;
    /** Second color for 'checker' fill (the first is `cellColor`). */
    checkerColor: string;
    /** Gradient endpoints for 'distance' fill. */
    gradientFrom: string;
    gradientTo: string;
    /** Draw a thick outer frame around the maze. */
    frame: boolean;
    frameColor: string;
    /** Margin around the maze as a fraction of the maze's longest side. */
    margin: number;
    markerStyle: MarkerStyle;
    symbolSet: SymbolSet;
    /** Single characters shown by the 'letters' symbol set. */
    startLetter: string;
    endLetter: string;
    startEmoji: string;
    endEmoji: string;
    startColor: string;
    endColor: string;
    solutionColor: string;
    /** Solution line width as a fraction of one cell. */
    solutionWidth: number;
    solutionDashed: boolean;
    title: string;
    titleColor: string;
    titleSize: number;
    fontFamily: string;
}

export const DEFAULT_STYLE: MazeStyle = {
    background: "#ffffff",
    wallColor: "#1f2937",
    wallWidth: 0.12,
    lineCap: "round",
    fillMode: "none",
    cellColor: "#fff7d6",
    checkerColor: "#d6ecff",
    gradientFrom: "#ffe0e9",
    gradientTo: "#d6ecff",
    frame: false,
    frameColor: "#1f2937",
    margin: 0.06,
    markerStyle: "emoji",
    symbolSet: "ringDot",
    startLetter: "S",
    endLetter: "E",
    startEmoji: "🐭",
    endEmoji: "🧀",
    startColor: "#16a34a",
    endColor: "#dc2626",
    solutionColor: "#ef4444",
    solutionWidth: 0.12,
    solutionDashed: false,
    title: "",
    titleColor: "#1f2937",
    titleSize: 0.05,
    fontFamily: "Comic Sans MS, Chalkboard SE, system-ui, sans-serif",
};

export type StylePresetId =
    "classic" | "chunky" | "thin" | "rainbow" | "chalkboard" | "inkSaver";

export interface StylePreset {
    /** Stable id; the display name comes from the i18n dictionaries. */
    id: StylePresetId;
    /** Overrides applied on top of DEFAULT_STYLE (presets never stack). */
    style: Partial<MazeStyle>;
}

/** Full style for a preset: defaults plus the preset's overrides. Keeps the user's title. */
export function applyPreset(
    preset: StylePreset,
    current: MazeStyle,
): MazeStyle {
    return { ...DEFAULT_STYLE, ...preset.style, title: current.title };
}

export const PRESETS: StylePreset[] = [
    { id: "classic", style: {} },
    {
        id: "chunky",
        style: {
            wallWidth: 0.22,
            lineCap: "round",
            wallColor: "#0f172a",
            solutionWidth: 0.12,
        },
    },
    {
        id: "thin",
        style: {
            wallWidth: 0.05,
            lineCap: "butt",
            wallColor: "#334155",
            solutionWidth: 0.08,
        },
    },
    {
        id: "rainbow",
        style: {
            fillMode: "distance",
            gradientFrom: "#fecdd3",
            gradientTo: "#bae6fd",
            wallColor: "#4c1d95",
            wallWidth: 0.14,
            solutionColor: "#f59e0b",
        },
    },
    {
        id: "chalkboard",
        style: {
            background: "#1e3a2f",
            wallColor: "#f8fafc",
            titleColor: "#f8fafc",
            frameColor: "#f8fafc",
            fillMode: "none",
            solutionColor: "#fde047",
            startColor: "#86efac",
            endColor: "#fca5a5",
        },
    },
    {
        id: "inkSaver",
        style: {
            background: "#ffffff",
            wallColor: "#000000",
            wallWidth: 0.07,
            lineCap: "square",
            fillMode: "none",
            markerStyle: "circles",
            solutionColor: "#000000",
            solutionDashed: true,
        },
    },
];
