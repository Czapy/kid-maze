import type { PageSettings } from "./components/Controls";
import { NO_LOCKS, type GenerationParams, type RandomizeLocks } from "./maze";
import type { MazeStyle } from "./render/style";

const KEY = "kid-maze:v1";

/** Everything needed to reproduce a maze setup, minus things like the seed. */
export interface PresetConfig {
    params: Omit<GenerationParams, "seed">;
    style: MazeStyle;
    page: PageSettings;
}

export interface UserPreset {
    id: string;
    name: string;
    config: PresetConfig;
}

export interface PersistedState {
    params: GenerationParams;
    style: MazeStyle;
    page: PageSettings;
    showSolution: boolean;
    presets: UserPreset[];
    presetsOpen: boolean;
    /** Which setting groups "Surprise me" keeps as they are. */
    locks: RandomizeLocks;
}

type Defaults = Pick<PersistedState, "params" | "style" | "page">;

function isObject(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Overlay saved values on defaults, keeping only keys that exist in the defaults and
 * whose type matches. Protects against corrupted storage and fields added/removed
 * between versions.
 */
export function mergeKnown<T extends object>(defaults: T, saved: unknown): T {
    if (!isObject(saved)) return defaults;
    const out = { ...defaults } as Record<string, unknown>;
    for (const [k, def] of Object.entries(defaults)) {
        if (k in saved && typeof saved[k] === typeof def) out[k] = saved[k];
    }
    return out as T;
}

function sanitizePresets(raw: unknown, d: Defaults): UserPreset[] {
    if (!Array.isArray(raw)) return [];
    const presets: UserPreset[] = [];
    for (const item of raw) {
        if (
            !isObject(item) ||
            typeof item.id !== "string" ||
            typeof item.name !== "string"
        )
            continue;
        const cfg = isObject(item.config) ? item.config : {};
        const { seed: _seed, ...paramDefaults } = d.params;
        presets.push({
            id: item.id,
            name: item.name,
            config: {
                params: mergeKnown(paramDefaults, cfg.params),
                style: mergeKnown(d.style, cfg.style),
                page: mergeKnown(d.page, cfg.page),
            },
        });
    }
    return presets;
}

export function loadState(d: Defaults): PersistedState {
    const fallback: PersistedState = {
        ...d,
        showSolution: false,
        presets: [],
        presetsOpen: false,
        locks: { ...NO_LOCKS },
    };
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return fallback;
        const saved: unknown = JSON.parse(raw);
        if (!isObject(saved)) return fallback;
        return {
            params: mergeKnown(d.params, saved.params),
            style: mergeKnown(d.style, saved.style),
            page: mergeKnown(d.page, saved.page),
            showSolution:
                typeof saved.showSolution === "boolean"
                    ? saved.showSolution
                    : false,
            presets: sanitizePresets(saved.presets, d),
            presetsOpen:
                typeof saved.presetsOpen === "boolean"
                    ? saved.presetsOpen
                    : true,
            locks: mergeKnown(NO_LOCKS, saved.locks),
        };
    } catch {
        return fallback;
    }
}

export function saveState(state: PersistedState): void {
    try {
        localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
        // Storage may be full or disabled (private mode); the app still works without it.
    }
}
