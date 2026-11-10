'use client';
import { FormEvent, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '../ToastProvider';

export default function LoginForm() {
  const t = useTranslations('Login');
  const toast = useToast();
  const [error, setErrorState] = useState('');
  const setError = (message: string) => { setErrorState(message); if (message) toast.error(message); };
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch('/backend/api/v1/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ username: data.get('username'), password: data.get('password') }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? t('error'));
      location.assign('/timesheets');
    } catch (reason) { setError(reason instanceof Error ? reason.message : t('networkError')); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="form">
    <label>{t('username')}<input required name="username" autoComplete="username" /></label>
    <label>{t('password')}<input required name="password" type="password" autoComplete="current-password" /></label>
    {error && <p role="alert" className="error">{error}</p>}
    <button disabled={busy}>{busy ? t('submitting') : t('submit')}</button>
  </form>;
}
