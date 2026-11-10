'use client';
import { ReactNode, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

export default function RecordDialog({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const t = useTranslations('Common');
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return <dialog ref={ref} className="record-dialog" aria-label={title} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === ref.current) onClose(); }}>
    <div className="dialog-head"><h2>{title}</h2><button type="button" className="secondary dialog-close" onClick={onClose} aria-label={t('close')}>×</button></div>
    <div className="dialog-body">{children}</div>
  </dialog>;
}
