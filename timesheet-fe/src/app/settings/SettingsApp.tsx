'use client';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { useToast } from '../ToastProvider';
import { useRouter } from 'next/navigation';
import { LOCALE_COOKIE, type Locale } from '../../i18n/locale';
import SelectField from '../SelectField';

type Settings = { theme: 'light' | 'dark' | 'system'; language: Locale };

export default function SettingsApp() {
  const t = useTranslations('Settings');
  const tc = useTranslations('Common');
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [language, setLanguage] = useState<Settings['language']>('vi');
  const toast = useToast();
  const [error, setErrorState] = useState('');
  const setError = (message: string) => { setErrorState(message); if (message) toast.error(message); };

  useEffect(() => {
    fetch('/backend/api/v1/settings').then(async (response) => {
      if (response.status === 401) { location.assign('/login'); return; }
      const data: Settings = await response.json();
      setTheme(data.theme);
      setLanguage(data.language);
    }).catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(next: Partial<Settings>) {
    setError('');
    const response = await fetch('/backend/api/v1/settings', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(next) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error ?? tc('saveError')); return; }
    toast.success(tc('saved'));
  }
  function changeLanguage(next: Settings['language']) {
    setLanguage(next);
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000`;
    save({ language: next });
    router.refresh();
  }

  return <main className="shell">
    <section className="card narrow">
      <h1>{t('title')}</h1>
      <label>{t('theme')}
        <SelectField value={theme} options={[{ value: 'system', label: t('themeSystem') }, { value: 'light', label: t('themeLight') }, { value: 'dark', label: t('themeDark') }]} onValueChange={(next) => { setTheme(next); save({ theme: next as Settings['theme'] }); }} />
      </label>
      <label>{t('language')}
        <SelectField value={language} options={[{ value: 'vi', label: t('languageVi') }, { value: 'en', label: t('languageEn') }]} onValueChange={(next) => changeLanguage(next as Settings['language'])} />
      </label>
      {error && <p role="alert" className="error">{error}</p>}
    </section>
  </main>;
}
