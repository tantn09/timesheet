'use client';
import { ReactNode, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import GlobalLoading from './GlobalLoading';

type User = { username: string; name: string; permissions: string[] };
const links = [
  ['/timesheets', 'navTimesheet', 'timesheets:read:any'],
  ['/invoices', 'navInvoice', 'invoices:read:any'],
  ['/admin/users', 'users', 'users:manage'],
  ['/admin/roles', 'roles', 'roles:manage'],
  ['/admin/company', 'customers', 'customers:manage'],
  ['/admin/projects', 'projects', 'projects:manage'],
] as const;
const visible = (permission: string, permissions: string[]) => !permission || permissions.includes(permission);

export default function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations('AppFrame');
  const tc = useTranslations('Common');
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (pathname === '/login') { setReady(true); return; }
    fetch('/backend/api/v1/me').then(async r => {
      if (!r.ok) { location.assign('/login'); return; }
      setUser(await r.json()); setReady(true);
    }).catch(() => location.assign('/login'));
  }, [pathname]);
  if (pathname === '/login') return children;
  if (!ready || !user) return <GlobalLoading />;
  async function logout() { await fetch('/backend/api/v1/auth/logout', { method: 'POST' }); location.assign('/login'); }
  return <div className="app-frame">
    <aside className="sidebar">
      <Link className="brand" href="/timesheets"><span className="brand-mark" aria-hidden="true">T</span><span>Timesheet<small>Workspace</small></span></Link>
      <nav aria-label={t('navigation')}>
        <div className="nav-group"><span className="nav-group-label">{t('workspace')}</span>
          {links.slice(0, 2).filter(([, , permission]) => visible(permission, user.permissions)).map(([href, label]) =>
            <Link className={pathname === href ? 'active' : ''} aria-current={pathname === href ? 'page' : undefined} key={href} href={href}><span className="nav-dot" aria-hidden="true" />{t(label)}</Link>)}
        </div>
        {links.slice(2).some(([, , permission]) => visible(permission, user.permissions)) && <div className="nav-group"><span className="nav-group-label">{t('management')}</span>
          {links.slice(2).filter(([, , permission]) => visible(permission, user.permissions)).map(([href, label]) =>
            <Link className={pathname === href ? 'active' : ''} aria-current={pathname === href ? 'page' : undefined} key={href} href={href}><span className="nav-dot" aria-hidden="true" />{t(label)}</Link>)}
        </div>}
        <div className="nav-group"><Link className={pathname === '/settings' ? 'active' : ''} aria-current={pathname === '/settings' ? 'page' : undefined} href="/settings"><span className="nav-dot" aria-hidden="true" />{t('navSettings')}</Link></div>
      </nav>
      <div className="sidebar-user"><span className="user-avatar" aria-hidden="true">{user.name.trim().charAt(0).toUpperCase()}</span><div className="user-details"><strong>{user.name}</strong><span>@{user.username}</span></div><button className="secondary" onClick={logout}>{tc('logout')}</button></div>
    </aside>
    <main className="app-content">{children}</main>
  </div>;
}
