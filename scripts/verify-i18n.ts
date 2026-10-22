import { DICTIONARIES, interpolate, pickLanguage } from "../src/i18n";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
    if (!ok) failures++;
    console.log(ok ? "ok  " : "FAIL", name, ok ? "" : detail);
};

/** Flatten nested dictionary into dotted-path -> string. */
function flatten(
    obj: unknown,
    prefix = "",
    out: Record<string, string> = {},
): Record<string, string> {
    if (typeof obj === "string") out[prefix] = obj;
    else if (obj && typeof obj === "object") {
        for (const [k, v] of Object.entries(obj))
            flatten(v, prefix ? `${prefix}.${k}` : k, out);
    }
    return out;
}

const placeholders = (s: string) =>
    [...s.matchAll(/\{(\w+)\}/g)]
        .map((m) => m[1])
        .sort()
        .join(",");

const base = flatten(DICTIONARIES.en);
for (const [lang, dict] of Object.entries(DICTIONARIES)) {
    if (lang === "en") continue;
    const flat = flatten(dict);
    const missing = Object.keys(base).filter((k) => !(k in flat));
    const extra = Object.keys(flat).filter((k) => !(k in base));
    check(`${lang}: no missing keys`, missing.length === 0, missing.join(", "));
    check(`${lang}: no extra keys`, extra.length === 0, extra.join(", "));
    const empty = Object.entries(flat)
        .filter(([, v]) => !v.trim())
        .map(([k]) => k);
    check(`${lang}: no empty strings`, empty.length === 0, empty.join(", "));
    const mismatched = Object.keys(base).filter(
        (k) => k in flat && placeholders(base[k]) !== placeholders(flat[k]),
    );
    check(
        `${lang}: placeholders match English`,
        mismatched.length === 0,
        mismatched.join(", "),
    );
}

check(
    "interpolate replaces",
    interpolate("{a} and {b}", { a: 1, b: "x" }) === "1 and x",
);
check(
    "interpolate keeps unknown",
    interpolate("{a} {zzz}", { a: 1 }) === "1 {zzz}",
);
check("interpolate without vars", interpolate("plain {a}") === "plain {a}");

// Language selection
check("browser hu -> hu", pickLanguage(null, ["hu"]) === "hu");
check("regional hu-HU -> hu", pickLanguage(null, ["hu-HU"]) === "hu");
check("case/underscore tolerant", pickLanguage(null, ["HU_hu"]) === "hu");
check("browser en-US -> en", pickLanguage(null, ["en-US"]) === "en");
check("unsupported -> en", pickLanguage(null, ["de-DE", "fr"]) === "en");
check("no browser languages -> en", pickLanguage(null, []) === "en");
check(
    "undefined entries -> en",
    pickLanguage(null, [undefined, null, ""]) === "en",
);
check("first supported wins", pickLanguage(null, ["de", "hu", "en"]) === "hu");
check("order respected", pickLanguage(null, ["en", "hu"]) === "en");
check("saved choice beats browser", pickLanguage("en", ["hu-HU"]) === "en");
check(
    "invalid saved falls back to browser",
    pickLanguage("xx", ["hu"]) === "hu",
);
check(
    "inherited key not a language (saved)",
    pickLanguage("constructor", ["hu"]) === "hu",
);
check(
    "inherited key not a language (browser)",
    pickLanguage(null, ["toString", "hu"]) === "hu",
);
check("non-string saved ignored", pickLanguage(42, []) === "en");

console.log(failures ? `${failures} FAILED` : "all passed");
process.exit(failures ? 1 : 0);
