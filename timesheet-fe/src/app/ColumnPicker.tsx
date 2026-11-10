'use client';
import { useTranslations } from 'next-intl';

export type ColumnOption = { key: string; label: string };
export default function ColumnPicker({ columns, visible, onChange }: { columns: ColumnOption[]; visible: string[]; onChange: (next: string[]) => void }) {
  const t = useTranslations('Common');
  return <details className="column-picker"><summary>{t('columns')}</summary><div className="column-picker-options">{columns.map((column) => <label key={column.key}><input type="checkbox" checked={visible.includes(column.key)} disabled={visible.length === 1 && visible.includes(column.key)} onChange={() => onChange(visible.includes(column.key) ? visible.filter((key) => key !== column.key) : [...visible, column.key])} />{column.label}</label>)}</div></details>;
}
