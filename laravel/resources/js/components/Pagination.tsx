import { Link } from '@inertiajs/react';
import type { Paginated } from '../types';

/** Renders Laravel's paginator links. Hidden while everything fits on one page. */
export default function Pagination({ page }: { page: Paginated<unknown> }) {
    if (page.last_page <= 1) return null;

    return (
        <nav className="pager" aria-label="পাতা">
            {page.links.map((link, i) =>
                link.url === null ? (
                    <span key={i} className="off" dangerouslySetInnerHTML={{ __html: link.label }} />
                ) : (
                    <Link
                        key={i}
                        href={link.url}
                        className={link.active ? 'on' : undefined}
                        preserveScroll
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                ),
            )}
        </nav>
    );
}
