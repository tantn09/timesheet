'use client';
import { FormEvent, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '../../ToastProvider';

type Company = { name: string; email: string | null; address: string | null; registrationNumber: string | null; vatNumber: string | null };

export default function CompanyInfo() {
  const t = useTranslations('AdminCustomers');
  const tc = useTranslations('Common');
  const [company, setCompany] = useState<Company | null>(null);
  const toast = useToast();
  const [error, setErrorState] = useState('');
  const setError = (message: string) => { setErrorState(message); if (message) toast.error(message); };
  useEffect(() => {
    fetch('/backend/api/v1/company').then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setCompany(data);
    }).catch(reason => setError(reason.message));
  }, []);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    const form = new FormData(event.currentTarget);
    const response = await fetch('/backend/api/v1/company', {
      method: 'PUT', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(['name', 'email', 'address', 'registrationNumber', 'vatNumber'].map(key => [key, form.get(key)]))),
    });
    const data = await response.json();
    if (!response.ok) { setError(data.error ?? 'Could not save company info'); return; }
    setCompany(data); toast.success(tc('saved'));
  }
  return <section className="card"><h1>{t('title')}</h1>
    <form key={company?.name ?? 'new'} onSubmit={save} className="grid-form">
      <label>{t('name')}<input name="name" defaultValue={company?.name ?? ''} required /></label>
      <label>{t('email')}<input name="email" type="email" defaultValue={company?.email ?? ''} /></label>
      <label>{t('address')}<input name="address" defaultValue={company?.address ?? ''} /></label>
      <label>{t('registrationNumber')}<input name="registrationNumber" defaultValue={company?.registrationNumber ?? ''} /></label>
      <label>{t('vatNumber')}<input name="vatNumber" defaultValue={company?.vatNumber ?? ''} /></label>
      <button>{t('save')}</button>
    </form>
    {error && <p role="alert" className="error">{error}</p>}
  </section>;
}
