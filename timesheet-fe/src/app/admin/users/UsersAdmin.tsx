'use client';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '../../ToastProvider';
import RecordDialog from '../../RecordDialog';
import ListSearch from '../../ListSearch';
import ColumnPicker from '../../ColumnPicker';
import { SortHeader, useTableSort } from '../../TableSort';
import { useRecordDialog } from '../../useRecordDialog';

type Role = { id: string; name: string };
type User = { id: string; username: string; email: string; name: string; hourlyRateGbp: string | null; status: 'ACTIVE' | 'DISABLED'; roles: Role[] };

export default function UsersAdmin() {
  const t = useTranslations('AdminUsers');
  const tc = useTranslations('Common');
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState('');
  const [visibleColumns, setVisibleColumns] = useState(['username', 'email', 'name', 'rate', 'status']);
  const toast = useToast();
  const [error, setErrorState] = useState('');
  const setError = (message: string) => { setErrorState(message); if (message) toast.error(message); };
  const dialog = useRecordDialog();
  const selected = users.find((user) => user.id === dialog.itemId);

  const load = useCallback(async () => {
    const [userResponse, roleResponse] = await Promise.all([fetch('/backend/api/v1/users'), fetch('/backend/api/v1/roles')]);
    const [userData, roleData] = await Promise.all([userResponse.json(), roleResponse.json()]);
    if (!userResponse.ok || !roleResponse.ok) throw new Error(userData.error ?? roleData.error ?? tc('loadError'));
    setUsers(userData); setRoles(roleData);
  }, [tc]);
  useEffect(() => { load().catch((e) => setError(e.message)); }, [load]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const roleIds = form.getAll('roleIds');
    const response = await fetch('/backend/api/v1/users', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: form.get('username'), email: form.get('email'), name: form.get('name'), password: form.get('password'), hourlyRateGbp: Number(form.get('hourlyRateGbp')), roleIds }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error ?? t('createError')); return; }
    formElement.reset(); dialog.close(); await load(); toast.success(tc('created'));
  }
  async function toggleStatus(user: User) {
    const response = await fetch(`/backend/api/v1/users/${user.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error ?? t('updateError')); return; }
    await load(); toast.success(tc('updated'));
  }
  async function updateRoles(user: User, roleIds: string[]) {
    const response = await fetch(`/backend/api/v1/users/${user.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ roleIds }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error ?? t('roleUpdateError')); return; }
    await load(); toast.success(tc('updated'));
  }
  async function updateRate(user: User, hourlyRateGbp: number) {
    const response = await fetch(`/backend/api/v1/users/${user.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ hourlyRateGbp }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error ?? t('updateError')); return; }
    await load(); toast.success(tc('updated'));
  }
  async function updateDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') ?? '');
    const response = await fetch(`/backend/api/v1/users/${selected.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: form.get('name'), hourlyRateGbp: Number(form.get('hourlyRateGbp')), ...(password ? { password } : {}) }) });
    if (!response.ok) { const result = await response.json(); setError(result.error ?? t('updateError')); return; }
    await load(); toast.success(tc('updated'));
  }
  async function remove(user: User) {
    const response = await fetch(`/backend/api/v1/users/${user.id}`, { method: 'DELETE' });
    if (!response.ok) { const result = await response.json(); setError(result.error ?? tc('deleteError')); return; }
    dialog.close(); await load(); toast.success(tc('deleted'));
  }

  const matchingUsers = users.filter((u) => [u.username, u.email, u.name, u.hourlyRateGbp ?? '', u.status, ...u.roles.map((r) => r.name)].some((v) => v.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())));
  const userSort = useTableSort(matchingUsers, { username: (u) => u.username, email: (u) => u.email, name: (u) => u.name, rate: (u) => u.hourlyRateGbp == null ? null : Number(u.hourlyRateGbp), status: (u) => u.status });
  return <>
    <section className="card"><div className="list-head"><h1>{t('title')}</h1><div className="list-head-actions"><button onClick={dialog.openCreate}>{tc('addNew')}</button><ColumnPicker columns={[{ key: 'username', label: t('colUsername') }, { key: 'email', label: t('colEmail') }, { key: 'name', label: t('colName') }, { key: 'rate', label: t('rate') }, { key: 'status', label: t('colStatus') }]} visible={visibleColumns} onChange={setVisibleColumns} /></div></div>
      <ListSearch value={search} onChange={setSearch} onClear={() => setSearch('')} /><div className="table-wrap"><table><thead><tr>{visibleColumns.includes('username') && <SortHeader label={t('colUsername')} column="username" sort={userSort.sort} onSort={userSort.toggle} />}{visibleColumns.includes('email') && <SortHeader label={t('colEmail')} column="email" sort={userSort.sort} onSort={userSort.toggle} />}{visibleColumns.includes('name') && <SortHeader label={t('colName')} column="name" sort={userSort.sort} onSort={userSort.toggle} />}{visibleColumns.includes('rate') && <SortHeader label={t('rate')} column="rate" sort={userSort.sort} onSort={userSort.toggle} />}{visibleColumns.includes('status') && <SortHeader label={t('colStatus')} column="status" sort={userSort.sort} onSort={userSort.toggle} />}</tr></thead><tbody>{userSort.sorted.map((u) => <tr className="record-row" key={u.id} onClick={() => dialog.openItem(u.id)}>{visibleColumns.includes('username') && <td><button className="record-link" onClick={(event) => { event.stopPropagation(); dialog.openItem(u.id); }}>{u.username}</button></td>}{visibleColumns.includes('email') && <td>{u.email}</td>}{visibleColumns.includes('name') && <td>{u.name}</td>}{visibleColumns.includes('rate') && <td>{u.hourlyRateGbp ?? '?'}</td>}{visibleColumns.includes('status') && <td>{u.status}</td>}</tr>)}</tbody></table></div>{matchingUsers.length === 0 && <p className="muted">{tc('noResults')}</p>}{error && <p role="alert" className="error">{error}</p>}</section>
    <RecordDialog open={dialog.creating} title={`${tc('addNew')} ${t('title')}`} onClose={dialog.close}><form onSubmit={create} className="grid-form">
        <label>{t('username')}<input name="username" required minLength={3} maxLength={32} pattern="[a-zA-Z0-9._-]+" /></label>
        <label>{t('email')}<input name="email" type="email" required /></label>
        <label>{t('name')}<input name="name" required /></label>
        <label>{t('password')}<input name="password" type="password" minLength={8} required /></label>
        <label>{t('rate')}<input name="hourlyRateGbp" type="number" min="0" step="0.01" required /></label>
        <label>{t('roles')}<select name="roleIds" multiple>{roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
        <button>{t('create')}</button>
      </form>{error && <p role="alert" className="error">{error}</p>}</RecordDialog>
    <RecordDialog open={!!dialog.itemId} title={selected?.name ?? t('title')} onClose={dialog.close}>
      {selected ? <><dl className="detail-grid"><div><dt>{t('colUsername')}</dt><dd>{selected.username}</dd></div><div><dt>{t('colEmail')}</dt><dd>{selected.email}</dd></div></dl><form key={selected.id} onSubmit={updateDetails} className="grid-form"><label>{t('name')}<input name="name" defaultValue={selected.name} required /></label><label>{t('rate')}<input name="hourlyRateGbp" type="number" min="0" step="0.01" defaultValue={selected.hourlyRateGbp ?? ''} required /></label><label>{t('password')}<input name="password" type="password" minLength={8} autoComplete="new-password" /></label><button>{tc('save')}</button></form><label>{t('colRoles')}<select multiple value={selected.roles.map((r) => r.id)} onChange={(e) => updateRoles(selected, [...e.currentTarget.selectedOptions].map((o) => o.value))}>{roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label><div className="dialog-actions"><button className="secondary" onClick={() => toggleStatus(selected)}>{selected.status === 'ACTIVE' ? t('lock') : t('unlock')}</button><button className="danger" onClick={() => { if (window.confirm(tc('delete') + '?')) void remove(selected); }}>{tc('delete')}</button></div></> : <p className="error">{tc('notFound')}</p>}
    </RecordDialog>
  </>;
}
