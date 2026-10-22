import { useState } from "react";
import { useI18n } from "../i18n";
import type { UserPreset } from "../storage";

interface Props {
    presets: UserPreset[];
    open: boolean;
    onToggle: () => void;
    onSave: (name: string) => void;
    onApply: (id: string) => void;
    onOverwrite: (id: string) => void;
    onRename: (id: string, name: string) => void;
    onDelete: (id: string) => void;
    onResetAll: () => void;
}

/** Collapsible right-hand sidebar for saving and managing the user's own presets. */
export function PresetsPanel(props: Props) {
    const { presets, open } = props;
    const { m, f } = useI18n();
    const [name, setName] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");

    const save = () => {
        const trimmed = name.trim();
        if (!trimmed) return;
        props.onSave(trimmed);
        setName("");
    };

    const commitRename = () => {
        const trimmed = editName.trim();
        if (editingId && trimmed) props.onRename(editingId, trimmed);
        setEditingId(null);
    };

    return (
        <aside
            className={open ? "presets no-print" : "presets collapsed no-print"}
        >
            <button
                className="presets-toggle"
                onClick={props.onToggle}
                title={open ? m.presets.collapse : m.presets.expand}
                aria-expanded={open}
            >
                {open ? "▶" : "◀"}
                {!open && (
                    <span className="presets-toggle-label">
                        {m.presets.title}
                    </span>
                )}
            </button>

            {open && (
                <div className="presets-body">
                    <h2>{m.presets.title}</h2>
                    <p className="hint">{m.presets.description}</p>

                    <form
                        className="preset-save"
                        onSubmit={(e) => {
                            e.preventDefault();
                            save();
                        }}
                    >
                        <input
                            type="text"
                            placeholder={m.presets.namePlaceholder}
                            value={name}
                            maxLength={40}
                            onChange={(e) => setName(e.target.value)}
                        />
                        <button
                            type="submit"
                            className="primary"
                            disabled={!name.trim()}
                        >
                            {m.presets.save}
                        </button>
                    </form>

                    {presets.length === 0 ? (
                        <p className="hint empty">{m.presets.empty}</p>
                    ) : (
                        <ul className="preset-list">
                            {presets.map((p) => (
                                <li key={p.id} className="preset-item">
                                    {editingId === p.id ? (
                                        <input
                                            type="text"
                                            autoFocus
                                            value={editName}
                                            maxLength={40}
                                            onChange={(e) =>
                                                setEditName(e.target.value)
                                            }
                                            onBlur={commitRename}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter")
                                                    commitRename();
                                                if (e.key === "Escape")
                                                    setEditingId(null);
                                            }}
                                        />
                                    ) : (
                                        <button
                                            className="preset-name"
                                            onClick={() => props.onApply(p.id)}
                                            title={m.presets.apply}
                                        >
                                            {p.name}
                                            <small>
                                                {
                                                    m.mazeTypes[
                                                        p.config.params.type
                                                    ]
                                                }
                                                {p.config.params.type ===
                                                "shape"
                                                    ? ` · ${m.shapes[p.config.params.shape]}`
                                                    : ""}
                                            </small>
                                        </button>
                                    )}
                                    <div className="preset-actions">
                                        <button
                                            className="icon-button"
                                            title={m.presets.rename}
                                            onClick={() => {
                                                setEditingId(p.id);
                                                setEditName(p.name);
                                            }}
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            className="icon-button"
                                            title={m.presets.overwrite}
                                            onClick={() => {
                                                if (
                                                    window.confirm(
                                                        f(
                                                            m.presets
                                                                .confirmOverwrite,
                                                            { name: p.name },
                                                        ),
                                                    )
                                                )
                                                    props.onOverwrite(p.id);
                                            }}
                                        >
                                            💾
                                        </button>
                                        <button
                                            className="icon-button"
                                            title={m.presets.delete}
                                            onClick={() => {
                                                if (
                                                    window.confirm(
                                                        f(
                                                            m.presets
                                                                .confirmDelete,
                                                            { name: p.name },
                                                        ),
                                                    )
                                                )
                                                    props.onDelete(p.id);
                                            }}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}

                    <button
                        className="reset-all"
                        onClick={() => {
                            if (window.confirm(m.presets.confirmReset))
                                props.onResetAll();
                        }}
                    >
                        {m.presets.resetAll}
                    </button>
                </div>
            )}
        </aside>
    );
}
