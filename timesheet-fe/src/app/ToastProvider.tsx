'use client';
import { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import { useTranslations } from 'next-intl';

type Toast = { id: number; message: string; tone: 'success' | 'error' };
type ToastApi = { success: (message: string) => void; error: (message: string) => void };
const ToastContext = createContext<ToastApi | null>(null);
let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useTranslations('Common');
  const [items, setItems] = useState<Toast[]>([]);
  const dismiss = useCallback((id: number) => setItems((current) => current.filter((item) => item.id !== id)), []);
  const add = useCallback((message: string, tone: Toast['tone']) => {
    if (!message) return;
    const id = ++nextId;
    setItems((current) => [...current.slice(-2), { id, message, tone }]);
    window.setTimeout(() => dismiss(id), 4500);
  }, [dismiss]);
  const success = useCallback((message: string) => add(message, 'success'), [add]);
  const error = useCallback((message: string) => add(message, 'error'), [add]);
  return <ToastContext.Provider value={{ success, error }}>
    {children}
    <div className="toast-stack" aria-live="polite" aria-relevant="additions">
      {items.map((item) => <div key={item.id} className={`toast toast-${item.tone}`} role={item.tone === 'error' ? 'alert' : 'status'}>
        <span className="toast-symbol" aria-hidden="true">{item.tone === 'success' ? '✓' : '!'}</span>
        <span>{item.message}</span>
        <button type="button" className="toast-close" aria-label={t('close')} onClick={() => dismiss(item.id)}>×</button>
      </div>)}
    </div>
  </ToastContext.Provider>;
}

export function useToast() {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error('useToast must be used inside ToastProvider');
  return toast;
}
