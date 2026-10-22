import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { en, type Messages } from "./en";
import { hu } from "./hu";

export type Lang = "en" | "hu";

export const LANGUAGES: { id: Lang; label: string }[] = [
    { id: "en", label: "English" },
    { id: "hu", label: "Magyar" },
];

const DICTIONARIES: Record<Lang, Messages> = { en, hu };
const STORAGE_KEY = "kid-maze:lang";

// hasOwnProperty, not `in`: `in` would accept inherited keys such as "constructor".
function isLang(v: unknown): v is Lang {
    return (
        typeof v === "string" &&
        Object.prototype.hasOwnProperty.call(DICTIONARIES, v)
    );
}

/**
 * Chooses a language: the user's saved choice if valid, otherwise the first of the
 * browser's preferred languages that we support (regional codes like `hu-HU` match
 * `hu`), otherwise English.
 */
export function pickLanguage(
    saved: unknown,
    browserLanguages: readonly (string | null | undefined)[],
): Lang {
    if (isLang(saved)) return saved;
    for (const tag of browserLanguages) {
        const base = tag?.trim().toLowerCase().split(/[-_]/)[0];
        if (isLang(base)) return base;
    }
    return "en";
}

function detectLanguage(): Lang {
    let saved: string | null = null;
    try {
        saved = localStorage.getItem(STORAGE_KEY);
    } catch {
        // storage unavailable
    }
    const nav = typeof navigator === "undefined" ? undefined : navigator;
    const browser = nav?.languages?.length ? nav.languages : [nav?.language];
    return pickLanguage(saved, browser);
}

/** Replaces `{name}` placeholders. Unknown placeholders are left untouched. */
export function interpolate(
    template: string,
    vars?: Record<string, string | number>,
): string {
    if (!vars) return template;
    return template.replace(/\{(\w+)\}/g, (m, k: string) =>
        k in vars ? String(vars[k]) : m,
    );
}

interface I18n {
    lang: Lang;
    setLang: (l: Lang) => void;
    /** The active dictionary, for reading nested labels (e.g. `m.mazeTypes.circular`). */
    m: Messages;
    /** Interpolates a message template: `f(m.app.stats, { cells: 5 })`. */
    f: (template: string, vars?: Record<string, string | number>) => string;
}

const Ctx = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
    const [lang, setLangState] = useState<Lang>(detectLanguage);

    const setLang = useCallback((l: Lang) => {
        setLangState(l);
        try {
            localStorage.setItem(STORAGE_KEY, l);
        } catch {
            // ignore
        }
    }, []);

    useEffect(() => {
        document.documentElement.lang = lang;
    }, [lang]);

    const value = useMemo<I18n>(
        () => ({ lang, setLang, m: DICTIONARIES[lang], f: interpolate }),
        [lang, setLang],
    );
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
    return ctx;
}

export { DICTIONARIES };
export type { Messages };
