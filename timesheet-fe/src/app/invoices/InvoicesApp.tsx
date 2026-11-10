'use client';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '../ToastProvider';
import { useSyncLocale } from '../../lib/useSyncLocale';
import { formatDate } from '../../lib/formatDate';
import RecordDialog from '../RecordDialog';
import ListSearch from '../ListSearch';
import ColumnPicker from '../ColumnPicker';
import { SortHeader, useTableSort } from '../TableSort';
import { useRecordDialog } from '../useRecordDialog';

type Customer = { id: string; name: string };
type Project = { id: string; name: string; customer: Customer };
type Entry = { id: string; workDate: string; minutes: number; task: string; project: Project; invoiceLinks: { invoice: { status: string } }[] };
type InvoiceLine = { id: string; description: string; minutes: number; hourlyRateGbp: string; amountGbp: string };
type Invoice = {
  id: string; number: string | null; status: 'DRAFT' | 'ISSUED' | 'VOID'; issuedAt: string | null; dueAt: string | null;
  subtotalGbp: string; discountGbp: string; taxGbp: string; totalGbp: string; customer: Customer; lines: InvoiceLine[];
};

export default function InvoicesApp() {
  const t = useTranslations('Invoices');
  const tc = useTranslations('Common');
  useSyncLocale();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [visibleColumns, setVisibleColumns] = useState(['number', 'status', 'date', 'total']);
  const [entrySearch, setEntrySearch] = useState('');
  const [visibleEntryColumns, setVisibleEntryColumns] = useState(['date', 'project', 'hours', 'task']);
  const toast = useToast();
  const [error, setErrorState] = useState('');
  const setError = (message: string) => { setErrorState(message); if (message) toast.error(message); };
  const dialog = useRecordDialog();
  const selectedInvoice = invoices.find((invoice) => invoice.id === dialog.itemId);

  const load = useCallback(async () => {
    const [me, entryResponse, invoiceResponse] = await Promise.all([fetch('/backend/api/v1/me'), fetch('/backend/api/v1/timesheets'), fetch('/backend/api/v1/invoices')]);
    if (me.status === 401) { location.assign('/login'); return; }
    const [entryData, invoiceData] = await Promise.all([entryResponse.json(), invoiceResponse.json()]);
    if (!entryResponse.ok || !invoiceResponse.ok) throw new Error(entryData.error ?? invoiceData.error ?? tc('loadError'));
    setEntries((entryData as Entry[]).filter((e) => e.invoiceLinks.length === 0));
    setInvoices(invoiceData);
    setSelected(new Set());
  }, [tc]);
  useEffect(() => { load().catch((e) => setError(e.message)); }, [load]);


  function toggle(id: string) {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  async function createInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    if (selected.size === 0) { setError(t('selectWarning')); return; }
    const form = new FormData(event.currentTarget);
    const response = await fetch('/backend/api/v1/invoices', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ timeEntryIds: [...selected], discountGbp: Number(form.get('discountGbp') || 0), taxGbp: Number(form.get('taxGbp') || 0) }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error ?? t('createError')); return; }
    dialog.close(); await load(); toast.success(tc('created'));
  }
  async function issue(invoice: Invoice) {
    const response = await fetch(`/backend/api/v1/invoices/${invoice.id}/issue`, { method: 'POST' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error ?? t('issueError')); return; }
    await load(); toast.success(tc('updated'));
  }
  async function voidInvoice(invoice: Invoice) {
    const response = await fetch(`/backend/api/v1/invoices/${invoice.id}/void`, { method: 'POST' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error ?? t('voidError')); return; }
    await load(); toast.success(tc('updated'));
  }
  async function remove(invoice: Invoice) {
    const response = await fetch(`/backend/api/v1/invoices/${invoice.id}`, { method: 'DELETE' });
    if (!response.ok) { const result = await response.json(); setError(result.error ?? t('deleteError')); return; }
    dialog.close(); await load(); toast.success(tc('deleted'));
  }

  const matchingInvoices = invoices.filter((inv) => [inv.number ?? t('draftLabel'), inv.status, formatDate(inv.issuedAt), inv.totalGbp, inv.customer?.name ?? ''].some((v) => v.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())));
  const matchingEntries = entries.filter((e) => [formatDate(e.workDate), e.project.name, (e.minutes / 60).toFixed(2), e.task].some((v) => v.toLocaleLowerCase().includes(entrySearch.trim().toLocaleLowerCase())));
  const invoiceSort = useTableSort(matchingInvoices, { number: (inv) => inv.number, status: (inv) => inv.status, date: (inv) => inv.issuedAt, total: (inv) => Number(inv.totalGbp) });
  const entrySort = useTableSort(matchingEntries, { date: (e) => e.workDate, project: (e) => e.project.name, hours: (e) => e.minutes, task: (e) => e.task });
  return <main className="shell">
    <section className="card"><div className="list-head"><h1>{t('listTitle')}</h1><div className="list-head-actions"><button onClick={dialog.openCreate}>{tc('addNew')}</button><ColumnPicker columns={[{ key: 'number', label: t('colNumber') }, { key: 'status', label: t('colStatus') }, { key: 'date', label: t('colIssuedAt') }, { key: 'total', label: t('colTotal') }]} visible={visibleColumns} onChange={setVisibleColumns} /></div></div>
      <ListSearch value={search} onChange={setSearch} onClear={() => setSearch('')} /><div className="table-wrap"><table><thead><tr>{visibleColumns.includes('number') && <SortHeader label={t('colNumber')} column="number" sort={invoiceSort.sort} onSort={invoiceSort.toggle} />}{visibleColumns.includes('status') && <SortHeader label={t('colStatus')} column="status" sort={invoiceSort.sort} onSort={invoiceSort.toggle} />}{visibleColumns.includes('date') && <SortHeader label={t('colIssuedAt')} column="date" sort={invoiceSort.sort} onSort={invoiceSort.toggle} />}{visibleColumns.includes('total') && <SortHeader label={t('colTotal')} column="total" sort={invoiceSort.sort} onSort={invoiceSort.toggle} />}</tr></thead><tbody>{invoiceSort.sorted.map((inv) => <tr className="record-row" key={inv.id} onClick={() => dialog.openItem(inv.id)}>{visibleColumns.includes('number') && <td><button className="record-link" onClick={(event) => { event.stopPropagation(); dialog.openItem(inv.id); }}>{inv.number ?? t('draftLabel')}</button></td>}{visibleColumns.includes('status') && <td>{inv.status}</td>}{visibleColumns.includes('date') && <td>{formatDate(inv.issuedAt)}</td>}{visibleColumns.includes('total') && <td>{inv.totalGbp}</td>}</tr>)}</tbody></table></div>{matchingInvoices.length === 0 && <p className="muted">{tc('noResults')}</p>}{error && <p role="alert" className="error">{error}</p>}</section>
    <RecordDialog open={dialog.creating} title={t('pickTitle')} onClose={dialog.close}>
      <ListSearch value={entrySearch} onChange={setEntrySearch} onClear={() => setEntrySearch('')} /><ColumnPicker columns={[{ key: 'date', label: t('colDate') }, { key: 'project', label: t('colProject') }, { key: 'hours', label: t('colHours') }, { key: 'task', label: t('colTask') }]} visible={visibleEntryColumns} onChange={setVisibleEntryColumns} /><div className="table-wrap"><table><thead><tr><th></th>{visibleEntryColumns.includes('date') && <SortHeader label={t('colDate')} column="date" sort={entrySort.sort} onSort={entrySort.toggle} />}{visibleEntryColumns.includes('project') && <SortHeader label={t('colProject')} column="project" sort={entrySort.sort} onSort={entrySort.toggle} />}{visibleEntryColumns.includes('hours') && <SortHeader label={t('colHours')} column="hours" sort={entrySort.sort} onSort={entrySort.toggle} />}{visibleEntryColumns.includes('task') && <SortHeader label={t('colTask')} column="task" sort={entrySort.sort} onSort={entrySort.toggle} />}</tr></thead><tbody>{entrySort.sorted.map((e) => <tr key={e.id}><td><input type="checkbox" aria-label={e.task} checked={selected.has(e.id)} onChange={() => toggle(e.id)} /></td>{visibleEntryColumns.includes('date') && <td>{formatDate(e.workDate)}</td>}{visibleEntryColumns.includes('project') && <td>{e.project.name}</td>}{visibleEntryColumns.includes('hours') && <td>{(e.minutes / 60).toFixed(2)}</td>}{visibleEntryColumns.includes('task') && <td>{e.task}</td>}</tr>)}</tbody></table>{matchingEntries.length === 0 && <p className="muted">{tc('noResults')}</p>}</div>
      <form onSubmit={createInvoice} className="grid-form"><label>{t('discount')}<input name="discountGbp" type="number" min="0" step="0.01" defaultValue="0" /></label><label>{t('tax')}<input name="taxGbp" type="number" min="0" step="0.01" defaultValue="0" /></label><button>{t('createDraft', { count: selected.size })}</button></form>
      {error && <p role="alert" className="error">{error}</p>}
    </RecordDialog>
    <RecordDialog open={!!dialog.itemId} title={selectedInvoice?.number ?? t('draftLabel')} onClose={dialog.close}>
      {selectedInvoice ? <><dl className="detail-grid"><div><dt>{t('colStatus')}</dt><dd>{selectedInvoice.status}</dd></div><div><dt>{t('colIssuedAt')}</dt><dd>{formatDate(selectedInvoice.issuedAt)}</dd></div><div><dt>{t('colTotal')}</dt><dd>{selectedInvoice.totalGbp}</dd></div></dl><div className="dialog-actions">{selectedInvoice.status === 'DRAFT' && <><button onClick={() => issue(selectedInvoice)}>{t('issue')}</button><button className="danger" onClick={() => { if (window.confirm(tc('delete') + '?')) void remove(selectedInvoice); }}>{tc('delete')}</button></>}{selectedInvoice.status === 'ISSUED' && <><a className="secondary" href={`/backend/api/v1/invoices/${selectedInvoice.id}/pdf`} target="_blank" rel="noreferrer">{t('pdf')}</a><button className="danger" onClick={() => voidInvoice(selectedInvoice)}>{t('void')}</button></>}</div></> : <p className="error">{tc('notFound')}</p>}
    </RecordDialog>
  </main>;
}
