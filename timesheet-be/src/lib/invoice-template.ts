export type IssuerProfile = {
  name: string;
  email: string;
  phone: string;
  bankAccountHolder: string;
  bankSortCode: string;
  bankAccountNumber: string;
  bankIban: string;
};

export type InvoiceLineData = { description: string; minutes: number; hourlyRateGbp: number; amountGbp: number };
export type CustomerSnapshot = { name: string; email: string | null; address: string | null; registrationNumber: string | null; vatNumber: string | null };
export type InvoicePdfData = {
  number: string | null;
  issuedAt: string | Date | null;
  dueAt: string | Date | null;
  subtotalGbp: number;
  discountGbp: number;
  taxGbp: number;
  totalGbp: number;
  customerSnapshot: CustomerSnapshot;
  lines: InvoiceLineData[];
};

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const gbp = (value: number) => `£${value.toFixed(2)}`;
const ukDate = (value: string | Date | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;
};

export function renderInvoiceHtml(invoice: InvoicePdfData, issuer: IssuerProfile): string {
  const taxRate = invoice.subtotalGbp > 0 ? Math.round((invoice.taxGbp / invoice.subtotalGbp) * 1000) / 10 : 0;
  const customer = invoice.customerSnapshot;
  const rows = invoice.lines
    .map(
      (line) => `<tr><td>${escapeHtml(line.description)}</td><td>${gbp(line.hourlyRateGbp)}</td><td>${(line.minutes / 60).toFixed(2)}</td><td class="amount">${gbp(line.amountGbp)}</td></tr>`,
    )
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8" /><style>
    * { box-sizing: border-box; }
    body { font: 13px/1.5 Arial, Helvetica, sans-serif; color: #1a1a1a; margin: 0; }
    .page { padding: 32px 40px; }
    .bar { height: 16px; background: #1e73d6; margin: -32px -40px 32px; }
    .header { display: flex; justify-content: space-between; gap: 32px; }
    .label { color: #8a8f98; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .field { margin-top: 10px; }
    .field b { display: block; font-size: 11px; }
    h1 { font-size: 34px; margin: 0; font-weight: 400; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    thead td { background: #1e73d6; color: white; font-size: 11px; text-transform: uppercase; padding: 8px 10px; }
    tbody td { padding: 8px 10px; border-bottom: 1px solid #eee; }
    .amount { text-align: right; }
    .totals { width: 260px; margin-left: auto; margin-top: 14px; }
    .totals div { display: flex; justify-content: space-between; padding: 4px 0; color: #8a8f98; font-size: 12px; }
    .totals .total-line { border-top: 1px solid #ddd; margin-top: 8px; padding-top: 10px; color: #1a1a1a; }
    .total-amount { font-size: 26px; text-align: right; margin-top: 4px; }
    .bank { margin-top: 40px; max-width: 420px; }
    .bank table { margin-top: 8px; }
    .bank td { border: 1px solid #ccc; padding: 6px 10px; }
    .bank td:first-child { font-weight: 700; background: #fafafa; width: 45%; }
  </style></head><body><div class="page"><div class="bar"></div>
    <div class="header">
      <div>
        <h2>${escapeHtml(issuer.name)}</h2>
        <div class="field"><b>Email</b>${escapeHtml(issuer.email)}</div>
        <div class="field"><b>Phone</b>${escapeHtml(issuer.phone)}</div>
      </div>
      <div>
        <div class="label">Billed to</div>
        <div class="field"><b>Client Name</b>${escapeHtml(customer.name)}</div>
        ${customer.registrationNumber ? `<div class="field"><b>Registration number</b>${escapeHtml(customer.registrationNumber)}</div>` : ''}
        ${customer.vatNumber ? `<div class="field"><b>VAT</b>${escapeHtml(customer.vatNumber)}</div>` : ''}
        ${customer.address ? `<div class="field"><b>Address</b>${escapeHtml(customer.address)}</div>` : ''}
      </div>
    </div>
    <div style="display:flex; gap:32px; margin-top:40px;">
      <div style="min-width:140px;">
        <h1>Invoice</h1>
        <div class="field"><span class="label">Invoice number</span><div>${escapeHtml(invoice.number ?? '—')}</div></div>
        <div class="field"><span class="label">Date of issue</span><div>${ukDate(invoice.issuedAt)}</div></div>
        <div class="field"><span class="label">Due date</span><div>${ukDate(invoice.dueAt)}</div></div>
      </div>
      <div style="flex:1;">
        <table><thead><tr><td>Project</td><td>Unit cost</td><td>Qty/hr</td><td class="amount">Amount</td></tr></thead><tbody>${rows}</tbody></table>
        <div class="totals">
          <div><span>Subtotal</span><span>${gbp(invoice.subtotalGbp)}</span></div>
          <div><span>Discount</span><span>${gbp(invoice.discountGbp)}</span></div>
          <div><span>(Tax rate)</span><span>${taxRate}%</span></div>
          <div><span>Tax</span><span>${gbp(invoice.taxGbp)}</span></div>
          <div class="total-line"><span class="label">Invoice total</span></div>
          <div class="total-amount">${gbp(invoice.totalGbp)}</div>
        </div>
      </div>
    </div>
    <div class="bank">
      <div class="label">Bank Account</div>
      <table>
        <tr><td>Account Holder</td><td>${escapeHtml(issuer.bankAccountHolder)}</td></tr>
        <tr><td>Sort Code</td><td>${escapeHtml(issuer.bankSortCode)}</td></tr>
        <tr><td>Account Number</td><td>${escapeHtml(issuer.bankAccountNumber)}</td></tr>
        <tr><td>IBAN</td><td>${escapeHtml(issuer.bankIban)}</td></tr>
      </table>
    </div>
  </div></body></html>`;
}

export function issuerFromEnv(env: NodeJS.ProcessEnv): IssuerProfile {
  return {
    name: env.INVOICE_ISSUER_NAME ?? '',
    email: env.INVOICE_ISSUER_EMAIL ?? '',
    phone: env.INVOICE_ISSUER_PHONE ?? '',
    bankAccountHolder: env.INVOICE_BANK_ACCOUNT_HOLDER ?? '',
    bankSortCode: env.INVOICE_BANK_SORT_CODE ?? '',
    bankAccountNumber: env.INVOICE_BANK_ACCOUNT_NUMBER ?? '',
    bankIban: env.INVOICE_BANK_IBAN ?? '',
  };
}
