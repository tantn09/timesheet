'use client';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '../../ToastProvider';
import RecordDialog from '../../RecordDialog';
import ListSearch from '../../ListSearch';
import ColumnPicker from '../../ColumnPicker';
import { SortHeader, useTableSort } from '../../TableSort';
import { useRecordDialog } from '../../useRecordDialog';

type Permission = { id: string; code: string };
type Role = { id: string; name: string; description: string | null; permissions: Permission[] };

export default function RolesAdmin() {
  const t = useTranslations('AdminRoles');
  const tc = useTranslations('Common');
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [search, setSearch] = useState('');
  const [visibleColumns, setVisibleColumns] = useState(['name', 'description']);
  const toast = useToast();
  const [error, setErrorState] = useState('');
  const setError = (message: string) => { setErrorState(message); if (message) toast.error(message); };
  const dialog = useRecordDialog();
  const selected = roles.find((role) => role.id === dialog.itemId);

  const load = useCallback(async () => {
    const [roleResponse, permissionResponse] = await Promise.all([fetch('/backend/api/v1/roles'), fetch('/backend/api/v1/permissions')]);
    const [roleData, permissionData] = await Promise.all([roleResponse.json(), permissionResponse.json()]);
    if (!roleResponse.ok || !permissionResponse.ok) throw new Error(roleData.error ?? permissionData.error ?? tc('loadError'));
    setRoles(roleData); setPermissions(permissionData);
  }, [tc]);
  useEffect(() => { load().catch((e) => setError(e.message)); }, [load]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const permissionIds = form.getAll('permissionIds');
    const response = await fetch('/backend/api/v1/roles', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: form.get('name'), description: form.get('description'), permissionIds }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error ?? t('createError')); return; }
    formElement.reset(); dialog.close(); await load(); toast.success(tc('created'));
  }
  async function updatePermissions(role: Role, permissionIds: string[]) {
    const response = await fetch(`/backend/api/v1/roles/${role.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ permissionIds }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error ?? t('updateError')); return; }
    await load(); toast.success(tc('updated'));
  }
  async function updateDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected || selected.name === 'admin') return;
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/backend/api/v1/roles/${selected.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: form.get('name'), description: form.get('description') }) });
    if (!response.ok) { const result = await response.json(); setError(result.error ?? t('updateError')); return; }
    await load(); toast.success(tc('updated'));
  }
  async function remove(role: Role) {
    const response = await fetch(`/backend/api/v1/roles/${role.id}`, { method: 'DELETE' });
    if (!response.ok) { const result = await response.json(); setError(result.error ?? tc('deleteError')); return; }
    dialog.close(); await load(); toast.success(tc('deleted'));
  }

  const matchingRoles = roles.filter((role) => [role.name, role.description ?? '', ...role.permissions.map((p) => p.code)].some((v) => v.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())));
  const roleSort = useTableSort(matchingRoles, { name: (r) => r.name, description: (r) => r.description });
  return <>
    <section className="card"><div className="list-head"><h1>{t('title')}</h1><div className="list-head-actions"><button onClick={dialog.openCreate}>{tc('addNew')}</button><ColumnPicker columns={[{ key: 'name', label: t('colRole') }, { key: 'description', label: t('colDescription') }]} visible={visibleColumns} onChange={setVisibleColumns} /></div></div>
      <ListSearch value={search} onChange={setSearch} onClear={() => setSearch('')} /><div className="table-wrap"><table><thead><tr>{visibleColumns.includes('name') && <SortHeader label={t('colRole')} column="name" sort={roleSort.sort} onSort={roleSort.toggle} />}{visibleColumns.includes('description') && <SortHeader label={t('colDescription')} column="description" sort={roleSort.sort} onSort={roleSort.toggle} />}</tr></thead><tbody>{roleSort.sorted.map((role) => <tr className="record-row" key={role.id} onClick={() => dialog.openItem(role.id)}>{visibleColumns.includes('name') && <td><button className="record-link" onClick={(event) => { event.stopPropagation(); dialog.openItem(role.id); }}>{role.name}</button></td>}{visibleColumns.includes('description') && <td>{role.description}</td>}</tr>)}</tbody></table></div>{matchingRoles.length === 0 && <p className="muted">{tc('noResults')}</p>}{error && <p role="alert" className="error">{error}</p>}</section>
    <RecordDialog open={dialog.creating} title={`${tc('addNew')} ${t('title')}`} onClose={dialog.close}><form onSubmit={create} className="grid-form">
        <label>{t('name')}<input name="name" required /></label>
        <label>{t('description')}<input name="description" /></label>
        <label>{t('permissions')}<select name="permissionIds" multiple>{permissions.map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}</select></label>
        <button>{t('create')}</button>
      </form>{error && <p role="alert" className="error">{error}</p>}</RecordDialog>
    <RecordDialog open={!!dialog.itemId} title={selected?.name ?? t('title')} onClose={dialog.close}>
      {selected ? <>{selected.name !== 'admin' && <form key={selected.id} onSubmit={updateDetails} className="grid-form"><label>{t('name')}<input name="name" defaultValue={selected.name} required /></label><label>{t('description')}<input name="description" defaultValue={selected.description ?? ''} /></label><button>{tc('save')}</button></form>}<label>{t('permissions')}{selected.name === 'admin' ? <p>{t('allPermissions')}</p> : <select multiple value={selected.permissions.map((p) => p.id)} onChange={(e) => updatePermissions(selected, [...e.currentTarget.selectedOptions].map((o) => o.value))}>{permissions.map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}</select>}</label>{selected.name !== 'admin' && <div className="dialog-actions"><button className="danger" onClick={() => { if (window.confirm(tc('delete') + '?')) void remove(selected); }}>{tc('delete')}</button></div>}</> : <p className="error">{tc('notFound')}</p>}
    </RecordDialog>
  </>;
}
