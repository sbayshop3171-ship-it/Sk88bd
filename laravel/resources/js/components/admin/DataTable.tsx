import type { ReactNode } from 'react';

/** Admin table with a built-in empty state, so every screen looks the same. */
export default function DataTable({
    columns,
    rows,
    empty = 'কোনো রেকর্ড নেই।',
}: {
    columns: string[];
    rows: ReactNode[][];
    empty?: string;
}) {
    return (
        <div className="adm__tablewrap">
            <table className="adm__table">
                <thead>
                    <tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr>
                </thead>
                <tbody>
                    {rows.length === 0 ? (
                        <tr><td colSpan={columns.length} className="adm__empty">{empty}</td></tr>
                    ) : (
                        rows.map((r, i) => (
                            <tr key={i}>{r.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
