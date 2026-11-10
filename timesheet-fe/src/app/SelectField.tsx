'use client';
import { useEffect, useRef, useState } from 'react';

type Option = { value: string; label: string };
type Props = { name?: string; options: Option[]; value?: string; defaultValue?: string; placeholder?: string; required?: boolean; onValueChange?: (value: string) => void };

export default function SelectField({ name, options, value, defaultValue = '', placeholder, required, onValueChange }: Props) {
  const [localValue, setLocalValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const current = value ?? localValue;
  const selected = options.find((option) => option.value === current);
  useEffect(() => {
    function outside(event: PointerEvent) { if (!root.current?.contains(event.target as Node)) setOpen(false); }
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, []);
  useEffect(() => {
    const form = root.current?.closest('form');
    if (!form) return;
    function reset() { setLocalValue(defaultValue); setOpen(false); }
    form.addEventListener('reset', reset);
    return () => form.removeEventListener('reset', reset);
  }, [defaultValue]);
  function choose(next: string) { setLocalValue(next); onValueChange?.(next); setOpen(false); trigger.current?.focus(); }
  function keyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); return; }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const index = options.findIndex((option) => option.value === current);
    const next = event.key === 'ArrowDown' ? (index + 1) % options.length : (index - 1 + options.length) % options.length;
    if (options[next]) { if (!open) setOpen(true); else choose(options[next].value); }
  }
  return <div className="select-field" ref={root} onKeyDown={keyDown}>
    {name && <input type="hidden" name={name} value={current} />}
    <button ref={trigger} type="button" className="select-trigger" aria-haspopup="listbox" aria-expanded={open} aria-required={required} onClick={() => setOpen(!open)}><span className={selected ? '' : 'select-placeholder'}>{selected?.label ?? placeholder ?? 'Select'}</span><span className="select-chevron" aria-hidden="true" /></button>
    {open && <div className="select-menu" role="listbox">{options.map((option) => <button type="button" role="option" aria-selected={option.value === current} className={option.value === current ? 'selected' : ''} key={option.value} onClick={() => choose(option.value)}>{option.label}{option.value === current && <span aria-hidden="true">✓</span>}</button>)}</div>}
  </div>;
}
