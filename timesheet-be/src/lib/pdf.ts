import PDFDocument from 'pdfkit';
import type { InvoicePdfData, IssuerProfile } from './invoice-template.js';

export function renderPdf(invoice: InvoicePdfData, issuer: IssuerProfile): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.fontSize(24).text(issuer.name).moveDown();
    doc.fontSize(10).text(issuer.email).text(issuer.phone).moveDown();
    doc.text(`Billed to: ${invoice.customerSnapshot.name}`);
    if (invoice.customerSnapshot.address) doc.text(invoice.customerSnapshot.address);
    doc.moveDown().fontSize(20).text(`Invoice ${invoice.number ?? ''}`);
    doc.fontSize(10).text(`Issued: ${invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleDateString('en-GB') : ''}`);
    doc.text(`Due: ${invoice.dueAt ? new Date(invoice.dueAt).toLocaleDateString('en-GB') : ''}`).moveDown();
    for (const line of invoice.lines) doc.text(`${line.description} | ${line.minutes / 60} h x GBP ${line.hourlyRateGbp.toFixed(2)} | GBP ${line.amountGbp.toFixed(2)}`);
    doc.moveDown().text(`Subtotal: GBP ${invoice.subtotalGbp.toFixed(2)}`);
    doc.text(`Discount: GBP ${invoice.discountGbp.toFixed(2)}`);
    doc.text(`Tax: GBP ${invoice.taxGbp.toFixed(2)}`);
    doc.fontSize(16).text(`Total: GBP ${invoice.totalGbp.toFixed(2)}`).moveDown();
    doc.fontSize(10).text(`Account holder: ${issuer.bankAccountHolder}`);
    doc.text(`Sort code: ${issuer.bankSortCode}`);
    doc.text(`Account number: ${issuer.bankAccountNumber}`);
    doc.text(`IBAN: ${issuer.bankIban}`);
    doc.end();
  });
}
