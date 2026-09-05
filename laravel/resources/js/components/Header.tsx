import { Link } from '@inertiajs/react';
import { BRAND, taka } from '../lib/brand';
import { useAuth } from '../lib/auth';
import { t } from '../lib/strings';
import { MenuIcon } from './Icons';
import { useUI } from '../providers/UIProvider';

export function Wordmark() {
    return (
        <span className="logo__mark">
            <i className="tk">{BRAND.light}</i>
            <i className="num">{BRAND.accent}</i>
        </span>
    );
}

export default function Header() {
    const { openDrawer } = useUI();
    const { signedIn, wallet } = useAuth();

    return (
        <header className="hdr">
            <button className="icon-btn" type="button" aria-label="মেনু" onClick={openDrawer}>
                <MenuIcon />
            </button>

            <Link href="/" className="logo" aria-label={BRAND.name}>
                <Wordmark />
                <span className="logo__sub">{BRAND.tag}</span>
            </Link>

            <div className="hdr__actions">
                {signedIn ? (
                    <Link href="/member" className="bal-pill">
                        <b>{taka(wallet?.balance ?? 0)}</b>
                        <i className="av" aria-hidden>👤</i>
                    </Link>
                ) : (
                    <>
                        <Link href="/login" className="btn btn--ghost">{t.login}</Link>
                        <Link href="/register" className="btn btn--gold">{t.registerNow}</Link>
                    </>
                )}
            </div>
        </header>
    );
}
