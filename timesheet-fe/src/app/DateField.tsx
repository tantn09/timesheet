'use client';
import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { formatExcelDate } from '../lib/formatDate';

export default function DateField({ name, defaultValue }: { name: string; defaultValue: string }) {
  const locale = useLocale();
  const [value, setValue] = useState(defaultValue);
  const [month, setMonth] = useState(() => new Date(`${defaultValue}T12:00:00Z`));
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  const formatter = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
  const display = value ? formatExcelDate(value) : '';
  useEffect(() => {
    function outside(event: PointerEvent) { if (!root.current?.contains(event.target as Node)) setOpen(false); }
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, []);
  useEffect(() => {
    const form = root.current?.closest('form');
    if (!form) return;
    function reset() { setValue(defaultValue); setMonth(new Date(`${defaultValue}T12:00:00Z`)); setOpen(false); }
    form.addEventListener('reset', reset);
    return () => form.removeEventListener('reset', reset);
  }, [defaultValue]);
  function move(delta: number) { setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1)); }
  function choose(day: number) { const next = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; setValue(next); setOpen(false); }
  return <div className="date-field" ref={root} onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false); }}>
    <input type="hidden" name={name} value={value} />
    <button type="button" className="date-trigger" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(!open)}><span>{display}</span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></svg></button>
    {open && <div className="calendar-menu" role="dialog" aria-label={formatter.format(month)}><div className="calendar-head"><button type="button" className="calendar-nav" onClick={() => move(-1)} aria-label="Previous month">‹</button><strong>{formatter.format(month)}</strong><button type="button" className="calendar-nav" onClick={() => move(1)} aria-label="Next month">›</button></div><div className="calendar-grid">{Array.from({ length: 7 }, (_, index) => <span className="calendar-weekday" key={index}>{new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(2024, 0, 1 + index))}</span>)}{Array.from({ length: offset }, (_, index) => <span key={`blank-${index}`} />)}{Array.from({ length: days }, (_, index) => { const day = index + 1; const date = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; return <button key={day} type="button" className={value === date ? 'selected' : ''} aria-label={date} aria-pressed={value === date} onClick={() => choose(day)}>{day}</button>; })}</div></div>}
  </div>;
}
