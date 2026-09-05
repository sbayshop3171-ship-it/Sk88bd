import { router } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { LeftIcon } from './Icons';

/** Sticky back-bar used by every sub-page. `action` renders on the right. */
export default function PageHeader({
    title,
    action,
}: {
    title: string;
    action?: ReactNode;
}) {
    // landing straight on a sub-page (a shared link, a redirect) leaves nothing
    // to go back to, so the arrow falls through to the home screen
    const back = () => {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            router.visit('/');
        }
    };

    return (
        <header className="page-hd">
            <button className="icon-btn" type="button" aria-label="পিছনে" onClick={back}>
                <LeftIcon />
            </button>
            <h1>{title}</h1>
            {action}
        </header>
    );
}
