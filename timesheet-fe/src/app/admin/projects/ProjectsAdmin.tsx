'use client';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '../../ToastProvider';
import RecordDialog from '../../RecordDialog';
import { useRecordDialog } from '../../useRecordDialog';
import SelectField from '../../SelectField';
import Link from 'next/link';
import ListSearch from '../../ListSearch';
import ColumnPicker from '../../ColumnPicker';
import { SortHeader, useTableSort } from '../../TableSort';

type Customer = { id: string; name: string };
type Status = 'OPEN' | 'ON_HOLD' | 'CLOSED';
type Project = { id: string; name: string; status: Status; customerId: string; customer: Customer };

export default function ProjectsAdmin() {
  const t = useTranslations('AdminProjects');
  const tc = useTranslations('Common');
  const [projects, setProjects] = useState<Project[]>([]);
  const [company, setCompany] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [visibleColumns, setVisibleColumns] = useState(['name', 'status']);
  const toast = useToast();
  const [error, setErrorState] = useState('');
  const setError = (message: string) => { setErrorState(message); if (message) toast.error(message); };
  const dialog = useRecordDialog();
  const selected = projects.find((project) => project.id === dialog.itemId);

  const load = useCallback(async () => {
    const [projectResponse, customerResponse] = await Promise.all([fetch('/backend/api/v1/projects'), fetch('/backend/api/v1/company')]);
    const [projectData, customerData] = await Promise.all([projectResponse.json(), customerResponse.json()]);
    if (!projectResponse.ok || !customerResponse.ok) throw new Error(projectData.error ?? customerData.error ?? tc('loadError'));
    setProjects(projectData); setCompany(customerData); setLoading(false);
  }, [tc]);
  useEffect(() => { load().catch((e) => { setError(e.message); setLoading(false); }); }, [load]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    if (creating || !company) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setCreating(true);
    try {
      const response = await fetch('/backend/api/v1/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: form.get('name'), customerId: company?.id }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { setError(result.error ?? t('createError')); return; }
      formElement.reset(); dialog.close(); toast.success(tc('created'));
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('createError'));
    } finally {
      setCreating(false);
    }
  }
  async function setStatus(project: Project, status: Status) {
    const response = await fetch(`/backend/api/v1/projects/${project.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error ?? t('updateError')); return; }
    await load(); toast.success(tc('updated'));
  }
  async function rename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected) return;
    const name = String(new FormData(event.currentTarget).get('name') ?? '').trim();
    const response = await fetch(`/backend/api/v1/projects/${selected.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }) });
    if (!response.ok) { const result = await response.json(); setError(result.error ?? t('updateError')); return; }
    await load(); toast.success(tc('updated'));
  }
  async function remove(project: Project) {
    const response = await fetch(`/backend/api/v1/projects/${project.id}`, { method: 'DELETE' });
    if (!response.ok) { const result = await response.json(); setError(result.error ?? tc('deleteError')); return; }
    dialog.close(); await load(); toast.success(tc('deleted'));
  }

  const matchingProjects = projects.filter((project) => [project.name, project.status, project.customer?.name ?? ''].some((v) => v.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())));
  const projectSort = useTableSort(matchingProjects, { name: (p) => p.name, status: (p) => p.status });
  return <>
    <section className="card"><div className="list-head"><h1>{t('title')}</h1><div className="list-head-actions"><button onClick={dialog.openCreate} disabled={loading || !company}>{tc('addNew')}</button><ColumnPicker columns={[{ key: 'name', label: t('colProject') }, { key: 'status', label: t('colStatus') }]} visible={visibleColumns} onChange={setVisibleColumns} /></div></div>{!loading && !company && <p className="setup-notice">{t('companyRequired')} <Link href="/admin/company">{t('setupCompany')}</Link></p>}<ListSearch value={search} onChange={setSearch} onClear={() => setSearch('')} /><div className="table-wrap"><table><thead><tr>{visibleColumns.includes('name') && <SortHeader label={t('colProject')} column="name" sort={projectSort.sort} onSort={projectSort.toggle} />}{visibleColumns.includes('status') && <SortHeader label={t('colStatus')} column="status" sort={projectSort.sort} onSort={projectSort.toggle} />}</tr></thead><tbody>{projectSort.sorted.map((p) => <tr className="record-row" key={p.id} onClick={() => dialog.openItem(p.id)}>{visibleColumns.includes('name') && <td><button className="record-link" onClick={(event) => { event.stopPropagation(); dialog.openItem(p.id); }}>{p.name}</button></td>}{visibleColumns.includes('status') && <td>{p.status}</td>}</tr>)}</tbody></table></div>{matchingProjects.length === 0 && <p className="muted">{tc('noResults')}</p>}{error && <p role="alert" className="error">{error}</p>}</section>
    <RecordDialog open={dialog.creating} title={`${tc('addNew')} ${t('title')}`} onClose={dialog.close}>
      {company && <div className="project-company"><strong>{company.name}</strong></div>}
      {!company && <p className="setup-notice">{t('companyRequired')} <Link href="/admin/company">{t('setupCompany')}</Link></p>}
      <form onSubmit={create} className="project-create-form">
        <label>{t('name')}<input name="name" autoFocus required maxLength={120} disabled={creating} /></label>
        <div className="dialog-actions"><button type="button" className="secondary" onClick={dialog.close} disabled={creating}>{tc('close')}</button><button disabled={!company || creating}>{creating ? tc('loading') : t('create')}</button></div>
      </form>
      {error && <p role="alert" className="error">{error}</p>}
    </RecordDialog>
    <RecordDialog open={!!dialog.itemId} title={selected?.name ?? t('title')} onClose={dialog.close}>
      {selected ? <><form key={selected.id} onSubmit={rename} className="grid-form"><label>{t('name')}<input name="name" defaultValue={selected.name} required /></label><button>{tc('save')}</button></form><label>{t('colStatus')}<SelectField value={selected.status} options={[{ value: 'OPEN', label: 'OPEN' }, { value: 'ON_HOLD', label: 'ON_HOLD' }, { value: 'CLOSED', label: 'CLOSED' }]} onValueChange={(next) => setStatus(selected, next as Status)} /></label><div className="dialog-actions"><button className="danger" onClick={() => { if (window.confirm(tc('delete') + '?')) void remove(selected); }}>{tc('delete')}</button></div></> : <p className="error">{tc('notFound')}</p>}
    </RecordDialog>
  </>;
}
