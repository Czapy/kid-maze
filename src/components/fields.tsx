import type { ReactNode } from "react";

export function Section({
    title,
    children,
    defaultOpen = true,
}: {
    title: string;
    children: ReactNode;
    defaultOpen?: boolean;
}) {
    return (
        <details className="section" open={defaultOpen}>
            <summary>{title}</summary>
            <div className="section-body">{children}</div>
        </details>
    );
}

interface SliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (v: number) => void;
    format?: (v: number) => string;
}

export function Slider({
    label,
    value,
    min,
    max,
    step = 1,
    onChange,
    format,
}: SliderProps) {
    return (
        <label className="field">
            <span className="field-label">
                {label}
                <output>{format ? format(value) : value}</output>
            </span>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
            />
        </label>
    );
}

interface SelectProps<T extends string> {
    label: string;
    value: T;
    options: { id: T; label: string }[];
    onChange: (v: T) => void;
    hint?: string;
}

export function Select<T extends string>({
    label,
    value,
    options,
    onChange,
    hint,
}: SelectProps<T>) {
    return (
        <label className="field">
            <span className="field-label">{label}</span>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value as T)}
            >
                {options.map((o) => (
                    <option key={o.id} value={o.id}>
                        {o.label}
                    </option>
                ))}
            </select>
            {hint && <small className="hint">{hint}</small>}
        </label>
    );
}

export function ColorField({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <label className="field color-field">
            <span className="field-label">{label}</span>
            <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </label>
    );
}

export function Toggle({
    label,
    value,
    onChange,
}: {
    label: string;
    value: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <label className="field toggle">
            <input
                type="checkbox"
                checked={value}
                onChange={(e) => onChange(e.target.checked)}
            />
            <span>{label}</span>
        </label>
    );
}

export function TextField({
    label,
    value,
    onChange,
    placeholder,
    maxLength,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    maxLength?: number;
}) {
    return (
        <label className="field">
            <span className="field-label">{label}</span>
            <input
                type="text"
                value={value}
                placeholder={placeholder}
                maxLength={maxLength}
                onChange={(e) => onChange(e.target.value)}
            />
        </label>
    );
}
