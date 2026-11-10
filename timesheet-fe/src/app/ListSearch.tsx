'use client';
import { useTranslations } from 'next-intl';

export default function ListSearch({ value, onChange, onClear }: { value: string; onChange: (value: string) => void; onClear: () => void }) {
  const t = useTranslations('Common');
  return <div className="list-search"><input type="search" aria-label={t('search')} placeholder={t('search')} value={value} onChange={(event) => onChange(event.target.value)} /><button type="button" className="secondary" onClick={onClear}>{t('clearFilters')}</button></div>;
}
