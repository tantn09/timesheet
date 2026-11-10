'use client';
import { useTranslations } from 'next-intl';

export default function GlobalLoading() {
  const t = useTranslations('Common');
  return <main className="global-loading" role="status" aria-live="polite" aria-label={t('loading')}>
    <div className="global-loading-content">
      <span className="global-loading-mark" aria-hidden="true">T</span>
      <span className="global-loading-bar" aria-hidden="true"><span /></span>
      <span className="global-loading-label">{t('loading')}</span>
    </div>
  </main>;
}
