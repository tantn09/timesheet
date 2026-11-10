'use client';
import { ReactNode, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSyncLocale } from '../../lib/useSyncLocale';
import GlobalLoading from '../GlobalLoading';

type Me = { id: string; email: string; name: string; roles: string[]; permissions: string[] };

export default function AdminShell({ requiredPermission, children }: { requiredPermission: string; children: ReactNode }) {
  const tc = useTranslations('Common');
  useSyncLocale();
  const [me, setMe] = useState<Me | null | 'loading'>('loading');
  useEffect(() => {
    fetch('/backend/api/v1/me').then(async (response) => {
      if (response.status === 401) { location.assign('/login'); return; }
      setMe(await response.json());
    });
  }, []);
  if (me === 'loading') return <GlobalLoading />;
  if (!me) return null;
  return <main className="shell">
    {me.permissions.includes(requiredPermission) ? children : <section className="card"><p className="error">{tc('noPermission')}</p></section>}
  </main>;
}
