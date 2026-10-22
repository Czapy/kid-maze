import { useI18n } from "../i18n";
import {
    ALGORITHMS,
    MAZE_TYPES,
    SHAPES,
    type GenerationParams,
    type MazeTypeId,
} from "../maze";
import { PRESETS, applyPreset, type MazeStyle } from "../render/style";
import {
    ColorField,
    Section,
    Select,
    Slider,
    TextField,
    Toggle,
} from "./fields";

export type PaperSize = "a4" | "letter" | "a3" | "square";
export type Orientation = "portrait" | "landscape";

export interface PageSettings {
    paper: PaperSize;
    orientation: Orientation;
}

interface Props {
    params: GenerationParams;
    style: MazeStyle;
    page: PageSettings;
    showSolution: boolean;
    onParams: (p: Partial<GenerationParams>) => void;
    onStyle: (s: Partial<MazeStyle>) => void;
    onStyleReplace: (s: MazeStyle) => void;
    onPage: (p: Partial<PageSettings>) => void;
    onShowSolution: (v: boolean) => void;
    onRandomize: () => void;
    onPrint: () => void;
    onDownloadSvg: () => void;
    onDownloadPng: () => void;
}

const SIZE_LIMITS: Record<
    MazeTypeId,
    { cols: [number, number]; rows: [number, number] }
> = {
    rectangular: { cols: [3, 60], rows: [3, 60] },
    circular: { cols: [3, 60], rows: [3, 60] },
    hexagonal: { cols: [3, 40], rows: [3, 40] },
    triangular: { cols: [2, 30], rows: [3, 40] },
    shape: { cols: [10, 70], rows: [10, 70] },
    diamond: { cols: [5, 61], rows: [5, 61] },
};

const percent = (v: number) => `${Math.round(v * 100)}%`;

export function Controls(props: Props) {
    const { params, style, page, showSolution } = props;
    const { m, f } = useI18n();
    const limits = SIZE_LIMITS[params.type];
    const t = params.type;

    return (
        <div className="controls">
            <div className="button-row">
                <button className="primary" onClick={props.onRandomize}>
                    🎲 {m.actions.newMaze}
                </button>
                <button onClick={() => props.onShowSolution(!showSolution)}>
                    {showSolution
                        ? `🙈 ${m.actions.hideSolution}`
                        : `👀 ${m.actions.showSolution}`}
                </button>
            </div>

            <Section title={m.sections.mazeType}>
                <div className="type-grid">
                    {MAZE_TYPES.map((mt) => (
                        <button
                            key={mt.id}
                            className={mt.id === t ? "chip active" : "chip"}
                            onClick={() => props.onParams({ type: mt.id })}
                        >
                            {m.mazeTypes[mt.id]}
                        </button>
                    ))}
                </div>

                {t === "shape" && (
                    <Select
                        label={m.fields.silhouette}
                        value={params.shape}
                        options={SHAPES.map((s) => ({
                            id: s.id,
                            label: m.shapes[s.id],
                        }))}
                        onChange={(shape) => props.onParams({ shape })}
                    />
                )}

                {t === "circular" ? (
                    <>
                        <Slider
                            label={m.fields.rings}
                            value={params.rings}
                            min={3}
                            max={25}
                            onChange={(rings) => props.onParams({ rings })}
                        />
                        <Slider
                            label={m.fields.centerCells}
                            value={params.centerCells}
                            min={1}
                            max={12}
                            onChange={(centerCells) =>
                                props.onParams({ centerCells })
                            }
                            format={(v) =>
                                v === 1
                                    ? f(m.fields.centerGoal, { value: 1 })
                                    : String(v)
                            }
                        />
                    </>
                ) : t === "diamond" ? (
                    <Slider
                        label={m.fields.size}
                        value={params.cols}
                        min={limits.cols[0]}
                        max={limits.cols[1]}
                        step={2}
                        onChange={(cols) =>
                            props.onParams({
                                cols: cols % 2 === 0 ? cols + 1 : cols,
                            })
                        }
                    />
                ) : (
                    <>
                        <Slider
                            label={m.fields.columns}
                            value={params.cols}
                            min={limits.cols[0]}
                            max={limits.cols[1]}
                            onChange={(cols) => props.onParams({ cols })}
                        />
                        <Slider
                            label={m.fields.rows}
                            value={params.rows}
                            min={limits.rows[0]}
                            max={limits.rows[1]}
                            onChange={(rows) => props.onParams({ rows })}
                        />
                    </>
                )}
            </Section>

            <Section title={m.sections.difficulty}>
                <Select
                    label={m.fields.algorithm}
                    value={params.algorithm}
                    options={ALGORITHMS.map((a) => ({
                        id: a.id,
                        label: m.algorithms[a.id].label,
                    }))}
                    hint={m.algorithms[params.algorithm].hint}
                    onChange={(algorithm) => props.onParams({ algorithm })}
                />
                <Slider
                    label={m.fields.twistiness}
                    value={params.twistiness}
                    min={0}
                    max={1}
                    step={0.05}
                    format={percent}
                    onChange={(twistiness) => props.onParams({ twistiness })}
                />
                <Slider
                    label={m.fields.loops}
                    value={params.braid}
                    min={0}
                    max={1}
                    step={0.05}
                    format={percent}
                    onChange={(braid) => props.onParams({ braid })}
                />
                <Toggle
                    label={m.fields.farEnds}
                    value={params.farEnds}
                    onChange={(farEnds) => props.onParams({ farEnds })}
                />
                <div className="field">
                    <span className="field-label">{m.fields.seed}</span>
                    <div className="seed-row">
                        <input
                            type="number"
                            aria-label={m.fields.seed}
                            value={params.seed}
                            onChange={(e) =>
                                props.onParams({
                                    seed: Math.floor(
                                        Number(e.target.value) || 0,
                                    ),
                                })
                            }
                        />
                        <button
                            className="icon-button"
                            title={m.actions.randomizeSeed}
                            onClick={props.onRandomize}
                        >
                            🎲
                        </button>
                    </div>
                </div>
            </Section>

            <Section title={m.sections.style}>
                <label className="field">
                    <span className="field-label">{m.fields.preset}</span>
                    <select
                        value=""
                        onChange={(e) => {
                            const preset = PRESETS.find(
                                (p) => p.id === e.target.value,
                            );
                            if (preset)
                                props.onStyleReplace(
                                    applyPreset(preset, style),
                                );
                        }}
                    >
                        <option value="" disabled>
                            {m.fields.choosePreset}
                        </option>
                        {PRESETS.map((p) => (
                            <option key={p.id} value={p.id}>
                                {m.stylePresets[p.id]}
                            </option>
                        ))}
                    </select>
                </label>

                <Slider
                    label={m.fields.wallThickness}
                    value={style.wallWidth}
                    min={0.02}
                    max={0.35}
                    step={0.01}
                    format={percent}
                    onChange={(wallWidth) => props.onStyle({ wallWidth })}
                />
                <Select
                    label={m.fields.wallEnds}
                    value={style.lineCap}
                    options={[
                        { id: "round", label: m.options.wallEnds.round },
                        { id: "square", label: m.options.wallEnds.square },
                        { id: "butt", label: m.options.wallEnds.butt },
                    ]}
                    onChange={(lineCap) => props.onStyle({ lineCap })}
                />
                <div className="color-row">
                    <ColorField
                        label={m.fields.walls}
                        value={style.wallColor}
                        onChange={(wallColor) => props.onStyle({ wallColor })}
                    />
                    <ColorField
                        label={m.fields.paper}
                        value={style.background}
                        onChange={(background) => props.onStyle({ background })}
                    />
                </div>
                <Toggle
                    label={m.fields.heavyFrame}
                    value={style.frame}
                    onChange={(frame) => props.onStyle({ frame })}
                />

                <Select
                    label={m.fields.cellFill}
                    value={style.fillMode}
                    options={[
                        { id: "none", label: m.options.fill.none },
                        { id: "solid", label: m.options.fill.solid },
                        { id: "distance", label: m.options.fill.distance },
                        { id: "checker", label: m.options.fill.checker },
                    ]}
                    onChange={(fillMode) => props.onStyle({ fillMode })}
                />
                {style.fillMode !== "none" && (
                    <div className="color-row">
                        {(style.fillMode === "solid" ||
                            style.fillMode === "checker") && (
                            <ColorField
                                label={m.fields.cell}
                                value={style.cellColor}
                                onChange={(cellColor) =>
                                    props.onStyle({ cellColor })
                                }
                            />
                        )}
                        {style.fillMode === "checker" && (
                            <ColorField
                                label={m.fields.altCell}
                                value={style.checkerColor}
                                onChange={(checkerColor) =>
                                    props.onStyle({ checkerColor })
                                }
                            />
                        )}
                        {style.fillMode === "distance" && (
                            <>
                                <ColorField
                                    label={m.fields.from}
                                    value={style.gradientFrom}
                                    onChange={(gradientFrom) =>
                                        props.onStyle({ gradientFrom })
                                    }
                                />
                                <ColorField
                                    label={m.fields.to}
                                    value={style.gradientTo}
                                    onChange={(gradientTo) =>
                                        props.onStyle({ gradientTo })
                                    }
                                />
                            </>
                        )}
                    </div>
                )}

                <Slider
                    label={m.fields.margin}
                    value={style.margin}
                    min={0}
                    max={0.2}
                    step={0.01}
                    format={percent}
                    onChange={(margin) => props.onStyle({ margin })}
                />
            </Section>

            <Section title={m.sections.markers}>
                <Select
                    label={m.fields.markerStyle}
                    value={style.markerStyle}
                    options={[
                        { id: "emoji", label: m.options.markers.emoji },
                        { id: "circles", label: m.options.markers.circles },
                        { id: "none", label: m.options.markers.none },
                    ]}
                    onChange={(markerStyle) => props.onStyle({ markerStyle })}
                />
                {style.markerStyle === "emoji" && (
                    <div className="color-row">
                        <TextField
                            label={m.fields.start}
                            value={style.startEmoji}
                            maxLength={4}
                            onChange={(startEmoji) =>
                                props.onStyle({ startEmoji })
                            }
                        />
                        <TextField
                            label={m.fields.end}
                            value={style.endEmoji}
                            maxLength={4}
                            onChange={(endEmoji) => props.onStyle({ endEmoji })}
                        />
                    </div>
                )}
                {style.markerStyle === "circles" && (
                    <div className="color-row">
                        <ColorField
                            label={m.fields.start}
                            value={style.startColor}
                            onChange={(startColor) =>
                                props.onStyle({ startColor })
                            }
                        />
                        <ColorField
                            label={m.fields.end}
                            value={style.endColor}
                            onChange={(endColor) => props.onStyle({ endColor })}
                        />
                    </div>
                )}
                <div className="color-row">
                    <ColorField
                        label={m.fields.solution}
                        value={style.solutionColor}
                        onChange={(solutionColor) =>
                            props.onStyle({ solutionColor })
                        }
                    />
                </div>
                <Slider
                    label={m.fields.solutionThickness}
                    value={style.solutionWidth}
                    min={0.08}
                    max={0.6}
                    step={0.02}
                    format={percent}
                    onChange={(solutionWidth) =>
                        props.onStyle({ solutionWidth })
                    }
                />
                <Toggle
                    label={m.fields.dashedSolution}
                    value={style.solutionDashed}
                    onChange={(solutionDashed) =>
                        props.onStyle({ solutionDashed })
                    }
                />
            </Section>

            <Section title={m.sections.title}>
                <TextField
                    label={m.fields.heading}
                    value={style.title}
                    placeholder={m.fields.headingPlaceholder}
                    onChange={(title) => props.onStyle({ title })}
                />
                <ColorField
                    label={m.fields.titleColor}
                    value={style.titleColor}
                    onChange={(titleColor) => props.onStyle({ titleColor })}
                />
            </Section>

            <Section title={m.sections.page}>
                <Select
                    label={m.fields.paperSize}
                    value={page.paper}
                    options={[
                        { id: "a4", label: m.options.paper.a4 },
                        { id: "letter", label: m.options.paper.letter },
                        { id: "a3", label: m.options.paper.a3 },
                        { id: "square", label: m.options.paper.square },
                    ]}
                    onChange={(paper) => props.onPage({ paper })}
                />
                <Select
                    label={m.fields.orientation}
                    value={page.orientation}
                    options={[
                        {
                            id: "portrait",
                            label: m.options.orientation.portrait,
                        },
                        {
                            id: "landscape",
                            label: m.options.orientation.landscape,
                        },
                    ]}
                    onChange={(orientation) => props.onPage({ orientation })}
                />
                <div className="button-row">
                    <button className="primary" onClick={props.onPrint}>
                        🖨️ {m.actions.print}
                    </button>
                    <button onClick={props.onDownloadSvg}>
                        {m.actions.svg}
                    </button>
                    <button onClick={props.onDownloadPng}>
                        {m.actions.png}
                    </button>
                </div>
            </Section>
        </div>
    );
}
