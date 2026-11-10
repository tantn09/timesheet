import { describe, expect, it } from 'vitest';
import { renderPdf } from './pdf.js';
import { type InvoicePdfData, type IssuerProfile } from './invoice-template.js';

describe('renderPdf', () => {
  it('renders an invoice into a non-empty PDF buffer', async () => {
    const issuer: IssuerProfile = {
      name: 'Tan Tran', email: 'tan.tran@example.com', phone: '123456789',
      bankAccountHolder: 'Tan Tran', bankSortCode: '00-00-00', bankAccountNumber: '00000000', bankIban: 'GB00 TEST 0000 0000 0000 00',
    };
    const invoice: InvoicePdfData = {
      number: 'INV-2026-0001', issuedAt: '2026-10-31', dueAt: '2026-11-30',
      subtotalGbp: 100, discountGbp: 0, taxGbp: 0, totalGbp: 100,
      customerSnapshot: { name: 'Acme Ltd', email: null, address: null, registrationNumber: null, vatNumber: null },
      lines: [{ description: 'Project A', minutes: 120, hourlyRateGbp: 50, amountGbp: 100 }],
    };
    const pdf = await renderPdf(invoice, issuer);
    expect(pdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(1000);
  }, 20_000);
});
