'use client';
import { useTranslations } from 'next-intl';

export default function LoadingSkeleton({ kind = 'table', rows = 5 }: { kind?: 'table' | 'form'; rows?: number }) {
  const t = useTranslations('Common');
  return <section className="card loading-skeleton" role="status" aria-label={t('loading')}>
    <span className="sr-only">{t('loading')}</span>
    <div className="skeleton-head"><span className="skeleton-block skeleton-title" /><span className="skeleton-block skeleton-button" /></div>
    {kind === 'table' ? <div className="skeleton-rows" aria-hidden="true">{Array.from({ length: rows }, (_, i) => <div className="skeleton-row" key={i}><span className="skeleton-block" /><span className="skeleton-block" /><span className="skeleton-block" /></div>)}</div> : <div className="skeleton-form" aria-hidden="true">{Array.from({ length: 4 }, (_, i) => <span className="skeleton-block" key={i} />)}</div>}
  </section>;
}
