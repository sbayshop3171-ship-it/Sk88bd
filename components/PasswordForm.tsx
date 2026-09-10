'use client';

import { useState } from 'react';
import {
  CardCheckFillIcon, EyeOffIcon, EyeOnIcon, LockFillIcon, LockPlusFillIcon,
} from '@/components/Icons';

/** The three-field form both password screens are. The reference draws the
    same shape for the login password and the fund password and changes only
    the title and the character range, so this is one component with two
    callers. */
export default function PasswordForm({
  min,
  max,
  /** false on the fund password before one exists — there is no current one
      to ask for, and a box that can only be wrong is worse than no box */
  askCurrent = true,
  submit,
}: {
  min: number;
  max: number;
  askCurrent?: boolean;
  submit: (current: string, next: string) => Promise<string | null>;
}) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [shown, setShown] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const ok = /^[A-Za-z0-9]+$/;
  const valid =
    (!askCurrent || current.length > 0) &&
    next.length >= min && next.length <= max && ok.test(next) &&
    confirm === next;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    const message = await submit(current, next);
    setBusy(false);
    if (message) { setErr(message); return; }
    setCurrent(''); setNext(''); setConfirm('');
    setErr('');
  };

  const field = (
    key: string,
    icon: React.ReactNode,
    placeholder: string,
    value: string,
    onChange: (v: string) => void,
  ) => (
    <label className="ms-field">
      <span className="ms-field__ico">{icon}</span>
      <input
        type={shown[key] ? 'text' : 'password'}
        placeholder={placeholder}
        autoComplete={key === 'current' ? 'current-password' : 'new-password'}
        value={value}
        onChange={(e) => { onChange(e.target.value); setErr(''); }}
      />
      <button
        type="button" className="ms-field__eye"
        aria-label={shown[key] ? 'Hide' : 'Show'}
        onClick={() => setShown((s) => ({ ...s, [key]: !s[key] }))}
      >
        {shown[key] ? <EyeOnIcon /> : <EyeOffIcon />}
      </button>
    </label>
  );

  return (
    <form className="ms-pad ms-pw" onSubmit={onSubmit} noValidate>
      {askCurrent && field('current', <LockFillIcon />, 'Enter your current password.', current, setCurrent)}
      {field('next', <LockPlusFillIcon />, 'Please enter a new password', next, setNext)}
      {field('confirm', <CardCheckFillIcon />, 'Confirm new password', confirm, setConfirm)}

      <p className="ms-note">
        * Please enter {min} - {max} characters using only letters or numbers.
        No special characters allowed.
      </p>

      {err && <p className="ms-err">{err}</p>}

      <button type="submit" className="ms-submit" disabled={!valid || busy}>
        {busy ? '…' : 'Submit'}
      </button>
    </form>
  );
}
