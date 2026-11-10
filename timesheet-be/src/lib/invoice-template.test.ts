import { describe, expect, it } from 'vitest';
import { renderInvoiceHtml, type InvoicePdfData, type IssuerProfile } from './invoice-template.js';

const issuer: IssuerProfile = {
  name: 'Tan Tran',
  email: 'tan.tran@example.com',
  phone: '123456789',
  bankAccountHolder: 'Tan Tran',
  bankSortCode: '00-00-00',
  bankAccountNumber: '00000000',
  bankIban: 'GB00 TEST 0000 0000 0000 00',
};

const invoice: InvoicePdfData = {
  number: 'INV-2026-0013',
  issuedAt: '2026-10-31T00:00:00.000Z',
  dueAt: '2026-11-30T00:00:00.000Z',
  subtotalGbp: 802.5,
  discountGbp: 0,
  taxGbp: 0,
  totalGbp: 802.5,
  customerSnapshot: { name: 'Chongster Limited', email: null, address: null, registrationNumber: '15744179', vatNumber: '470874859' },
  lines: [
    { description: 'HUBWORX', minutes: 1920, hourlyRateGbp: 15, amountGbp: 480 },
    { description: 'REFIT', minutes: 1290, hourlyRateGbp: 15, amountGbp: 322.5 },
  ],
};

describe('renderInvoiceHtml', () => {
  it('includes the invoice number, dates in UK format, and totals', () => {
    const html = renderInvoiceHtml(invoice, issuer);
    expect(html).toContain('INV-2026-0013');
    expect(html).toContain('31/10/2026');
    expect(html).toContain('30/11/2026');
    expect(html).toContain('£802.50');
  });

  it('renders one row per line with hours derived from minutes', () => {
    const html = renderInvoiceHtml(invoice, issuer);
    expect(html).toContain('HUBWORX');
    expect(html).toContain('32.00');
    expect(html).toContain('REFIT');
    expect(html).toContain('21.50');
  });

  it('escapes HTML in customer and issuer fields', () => {
    const html = renderInvoiceHtml(
      { ...invoice, customerSnapshot: { ...invoice.customerSnapshot, name: '<script>alert(1)</script>' } },
      issuer,
    );
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
