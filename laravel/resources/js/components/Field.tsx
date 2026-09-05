import type { ReactNode } from 'react';

/** Labelled form control. Keeps every form on the site visually identical. */
export default function Field({
    label,
    error,
    children,
}: {
    label: string;
    error?: string;
    children: ReactNode;
}) {
    return (
        <div className="field">
            <label>{label}</label>
            {children}
            {error && <div className="field__err">{error}</div>}
        </div>
    );
}
