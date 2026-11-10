'use client';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

type SortValue = string | number | null | undefined;
type Direction = 'asc' | 'desc';

export function useTableSort<T>(items: T[], columns: Record<string, (item: T) => SortValue>) {
  const [sort, setSort] = useState<{ key: string; direction: Direction } | null>(null);
  const sorted = useMemo(() => {
    if (!sort || !columns[sort.key]) return items;
    const read = columns[sort.key];
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    return items.map((item, index) => ({ item, index })).sort((a, b) => {
      const left = read(a.item);
      const right = read(b.item);
      if (left == null || left === '') return right == null || right === '' ? a.index - b.index : 1;
      if (right == null || right === '') return -1;
      const result = typeof left === 'number' && typeof right === 'number' ? left - right : collator.compare(String(left), String(right));
      return result === 0 ? a.index - b.index : sort.direction === 'asc' ? result : -result;
    }).map(({ item }) => item);
  }, [items, columns, sort]);
  function toggle(key: string) { setSort((current) => ({ key, direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc' })); }
  return { sorted, sort, toggle };
}

export function SortHeader({ label, column, sort, onSort, className }: { label: string; column: string; sort: { key: string; direction: Direction } | null; onSort: (column: string) => void; className?: string }) {
  const t = useTranslations('Common');
  const direction = sort?.key === column ? sort.direction : null;
  return <th className={className} aria-sort={direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none'}><button type="button" className="sort-header" onClick={() => onSort(column)} aria-label={`${t('sortBy')} ${label}`}><span>{label}</span><span className="sort-arrow" aria-hidden="true">{direction === 'asc' ? '↑' : direction === 'desc' ? '↓' : '↕'}</span></button></th>;
}
