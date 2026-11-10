'use client';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '../ToastProvider';
import { useSyncLocale } from '../../lib/useSyncLocale';
import { summarize } from '../../lib/timesheetSummary';
import RecordDialog from '../RecordDialog';
import { useRecordDialog } from '../useRecordDialog';
import SelectField from '../SelectField';
import DateField from '../DateField';
import { formatExcelDate } from '../../lib/formatDate';
import ListSearch from '../ListSearch';
import ColumnPicker from '../ColumnPicker';
import { SortHeader, useTableSort } from '../TableSort';

type Project = { id: string; name: string; customer: { name: string } };
type Entry = { id: string; workDate: string; minutes: number; task: string; jiraSowId?: string | null; comment?: string | null; project: Project; user: { name: string } };

export default function TimesheetApp() {
  const t = useTranslations('Timesheets');
  const tc = useTranslations('Common');
  useSyncLocale();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [visibleColumns, setVisibleColumns] = useState(['name', 'project', 'date', 'hours', 'days', 'task', 'jira', 'comments']);
  const [visibleSummaryColumns, setVisibleSummaryColumns] = useState(['name', 'project', 'hours', 'days']);
  const [search, setSearch] = useState('');
  const toast = useToast();
  const [error, setErrorState] = useState('');
  const setError = (message: string) => { setErrorState(message); if (message) toast.error(message); };
  const dialog = useRecordDialog();
  const selected = entries.find((entry) => entry.id === dialog.itemId);
  const load = useCallback(async () => {
    const [me, entryResponse, projectResponse] = await Promise.all([
      fetch('/backend/api/v1/me'), fetch('/backend/api/v1/timesheets'), fetch('/backend/api/v1/projects'),
    ]);
    if (me.status === 401) { location.assign('/login'); return; }
    const [entryData, projectData] = await Promise.all([entryResponse.json(), projectResponse.json()]);
    if (!entryResponse.ok || !projectResponse.ok) throw new Error(entryData.error ?? projectData.error ?? tc('loadError'));
    setEntries(entryData); setProjects(projectData);
  }, [tc]);
  useEffect(() => { load().catch(e => setError(e.message)); }, [load]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch('/backend/api/v1/timesheets', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ projectId: form.get('projectId'), workDate: form.get('workDate'), hours: Number(form.get('hours')), task: form.get('task'), jiraSowId: form.get('jiraSowId'), comment: form.get('comment') }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error ?? t('saveError')); return; }
    formElement.reset(); dialog.close(); await load(); toast.success(tc('created'));
  }
  async function remove(id: string) {
    const response = await fetch(`/backend/api/v1/timesheets/${id}`, { method: 'DELETE' });
    if (!response.ok) { const result = await response.json(); setError(result.error ?? tc('deleteError')); return; }
    dialog.close(); await load(); toast.success(tc('deleted'));
  }
  const dateValue = new Date().toISOString().slice(0, 10);
  const filteredEntries = useMemo(() => entries.filter((entry) => [entry.user.name, entry.project.name, formatExcelDate(entry.workDate), (entry.minutes / 60).toFixed(2), entry.task, entry.jiraSowId ?? '', entry.comment ?? ''].some((value) => value.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))), [entries, search]);
  const entrySort = useTableSort(filteredEntries, { name: (e) => e.user.name, project: (e) => e.project.name, date: (e) => e.workDate, hours: (e) => e.minutes, days: (e) => e.minutes, task: (e) => e.task, jira: (e) => e.jiraSowId, comments: (e) => e.comment });
  const summary = useMemo(() => summarize(filteredEntries), [filteredEntries]);
  const summarySort = useTableSort(summary, { name: (s) => s.user, project: (s) => s.project, hours: (s) => s.minutes, days: (s) => s.minutes });
  return <main className="shell">
    <section className="card"><div className="list-head"><h1>{t('title')}</h1><div className="list-head-actions"><button onClick={dialog.openCreate}>{tc('addNew')}</button><ColumnPicker columns={[{ key: 'name', label: t('colName') }, { key: 'project', label: t('colProject') }, { key: 'date', label: t('colDate') }, { key: 'hours', label: t('colHours') }, { key: 'days', label: t('colDays') }, { key: 'task', label: t('colTask') }, { key: 'jira', label: t('colJiraSowId') }, { key: 'comments', label: t('colComments') }]} visible={visibleColumns} onChange={setVisibleColumns} /></div></div>
      <ListSearch value={search} onChange={setSearch} onClear={() => setSearch('')} />
      <div className="table-wrap"><table className="timesheet-table"><thead><tr>{visibleColumns.includes('name') && <SortHeader label={t('colName')} column="name" sort={entrySort.sort} onSort={entrySort.toggle} />}{visibleColumns.includes('project') && <SortHeader label={t('colProject')} column="project" sort={entrySort.sort} onSort={entrySort.toggle} />}{visibleColumns.includes('date') && <SortHeader label={t('colDate')} column="date" sort={entrySort.sort} onSort={entrySort.toggle} className="date-nowrap" />}{visibleColumns.includes('hours') && <SortHeader label={t('colHours')} column="hours" sort={entrySort.sort} onSort={entrySort.toggle} />}{visibleColumns.includes('days') && <SortHeader label={t('colDays')} column="days" sort={entrySort.sort} onSort={entrySort.toggle} />}{visibleColumns.includes('task') && <SortHeader label={t('colTask')} column="task" sort={entrySort.sort} onSort={entrySort.toggle} />}{visibleColumns.includes('jira') && <SortHeader label={t('colJiraSowId')} column="jira" sort={entrySort.sort} onSort={entrySort.toggle} />}{visibleColumns.includes('comments') && <SortHeader label={t('colComments')} column="comments" sort={entrySort.sort} onSort={entrySort.toggle} />}</tr></thead><tbody>{entrySort.sorted.map((e) => <tr className="record-row" key={e.id} onClick={() => dialog.openItem(e.id)}>{visibleColumns.includes('name') && <td><button className="record-link" onClick={(event) => { event.stopPropagation(); dialog.openItem(e.id); }}>{e.user.name}</button></td>}{visibleColumns.includes('project') && <td>{e.project.name}</td>}{visibleColumns.includes('date') && <td className="date-nowrap">{formatExcelDate(e.workDate)}</td>}{visibleColumns.includes('hours') && <td>{(e.minutes / 60).toFixed(2)}</td>}{visibleColumns.includes('days') && <td>{(e.minutes / 480).toFixed(3)}</td>}{visibleColumns.includes('task') && <td>{e.task}</td>}{visibleColumns.includes('jira') && <td>{e.jiraSowId || '\u2014'}</td>}{visibleColumns.includes('comments') && <td>{e.comment || '\u2014'}</td>}</tr>)}</tbody></table></div>
      {filteredEntries.length === 0 && <p className="muted">{tc('noResults')}</p>}{error && <p role="alert" className="error">{error}</p>}
    </section>
    <RecordDialog open={dialog.creating} title={`${tc('addNew')} ${t('title')}`} onClose={dialog.close}><form onSubmit={submit} className="grid-form">
      <label>{t('project')}<SelectField name="projectId" required placeholder={t('selectProject')} options={projects.map(p => ({ value: p.id, label: p.name }))} /></label>
      <label>{t('date')}<DateField name="workDate" defaultValue={dateValue} /></label>
      <label>{t('hours')}<input name="hours" type="number" min="0.02" max="24" step="0.01" required /></label>
      <label>{t('task')}<input name="task" required placeholder={t('taskPlaceholder')} /></label>
      <label>{t('jiraSowId')}<input name="jiraSowId" /></label>
      <label>{t('comments')}<input name="comment" /></label>
      <button>{t('submit')}</button>
    </form>{error && <p role="alert" className="error">{error}</p>}</RecordDialog>
    <RecordDialog open={!!dialog.itemId} title={selected?.task ?? t('title')} onClose={dialog.close}>{selected ? <><dl className="detail-grid"><div><dt>{t('colName')}</dt><dd>{selected.user.name}</dd></div><div><dt>{t('colDate')}</dt><dd>{formatExcelDate(selected.workDate)}</dd></div><div><dt>{t('colProject')}</dt><dd>{selected.project.name}</dd></div><div><dt>{t('colHours')}</dt><dd>{(selected.minutes/60).toFixed(2)}</dd></div><div><dt>{t('colJiraSowId')}</dt><dd>{selected.jiraSowId}</dd></div><div><dt>{t('colComments')}</dt><dd>{selected.comment}</dd></div></dl><div className="dialog-actions"><button className="danger" onClick={() => { if (window.confirm(tc('delete') + '?')) void remove(selected.id); }}>{tc('delete')}</button></div></> : <p className="error">{tc('notFound')}</p>}</RecordDialog>
    <section className="card"><h2>{t('summaryTitle')}</h2><ColumnPicker columns={[{ key: 'name', label: t('colName') }, { key: 'project', label: t('colProject') }, { key: 'hours', label: t('colHours') }, { key: 'days', label: t('colDays') }]} visible={visibleSummaryColumns} onChange={setVisibleSummaryColumns} /><div className="table-wrap"><table><thead><tr>{visibleSummaryColumns.includes('name') && <SortHeader label={t('colName')} column="name" sort={summarySort.sort} onSort={summarySort.toggle} />}{visibleSummaryColumns.includes('project') && <SortHeader label={t('colProject')} column="project" sort={summarySort.sort} onSort={summarySort.toggle} />}{visibleSummaryColumns.includes('hours') && <SortHeader label={t('colHours')} column="hours" sort={summarySort.sort} onSort={summarySort.toggle} />}{visibleSummaryColumns.includes('days') && <SortHeader label={t('colDays')} column="days" sort={summarySort.sort} onSort={summarySort.toggle} />}</tr></thead><tbody>{summarySort.sorted.map((s) => <tr key={`${s.user}::${s.project}`}>{visibleSummaryColumns.includes('name') && <td>{s.user}</td>}{visibleSummaryColumns.includes('project') && <td>{s.project}</td>}{visibleSummaryColumns.includes('hours') && <td>{(s.minutes / 60).toFixed(2)}</td>}{visibleSummaryColumns.includes('days') && <td>{(s.minutes / 480).toFixed(2)}</td>}</tr>)}</tbody></table></div></section>
  </main>;
}
