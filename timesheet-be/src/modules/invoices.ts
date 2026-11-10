import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { hasPermission, requireAuth } from '../lib/auth.js';
import { groupIntoLines, sumTotals } from '../lib/invoicing.js';
import { issuerFromEnv, type CustomerSnapshot } from '../lib/invoice-template.js';
import { renderPdf } from '../lib/pdf.js';

const invoiceSelect = {
  id: true,
  ownerUserId: true,
  customerId: true,
  number: true,
  status: true,
  issuedAt: true,
  dueAt: true,
  subtotalGbp: true,
  discountGbp: true,
  taxGbp: true,
  totalGbp: true,
  customerSnapshot: true,
  createdAt: true,
  customer: { select: { id: true, name: true } },
  lines: true,
};

async function loadBillableEntries(entryIds: string[], ownerUserId: string, customerId: string, excludeInvoiceId?: string) {
  const entries = await prisma.timeEntry.findMany({
    where: { id: { in: entryIds } },
    include: { project: true, invoiceLinks: true },
  });
  if (entries.length !== entryIds.length) return { error: 'One or more timesheet entries do not exist' as const };
  if (entries.some((entry) => entry.userId !== ownerUserId)) return { error: 'All entries must belong to the invoice owner' as const };
  if (entries.some((entry) => entry.invoiceLinks.some((link) => link.invoiceId !== excludeInvoiceId))) {
    return { error: 'One or more entries are already linked to an invoice' as const };
  }
  if (entries.some((entry) => entry.project.customerId !== customerId)) return { error: 'All entries must belong to projects of the selected customer' as const };

  const owner = await prisma.user.findUnique({ where: { id: ownerUserId }, select: { hourlyRateGbp: true } });
  const billable = entries.map((entry) => {
    const rate = owner?.hourlyRateGbp == null ? null : Number(owner.hourlyRateGbp);
    return { entryId: entry.id, projectId: entry.projectId, projectName: entry.project.name, minutes: entry.minutes, workDate: entry.workDate, hourlyRateGbp: rate };
  });
  const missing = billable.filter((item) => item.hourlyRateGbp === null);
  if (missing.length) {
    return { error: 'The invoice owner has no hourly rate' as const };
  }
  return { entries: billable as (typeof billable[number] & { hourlyRateGbp: number })[] };
}

export default async function invoicesModule(app: FastifyInstance) {
  app.get('/api/v1/invoices', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const canReadAny = hasPermission(request.user, 'invoices:read:any');
    return prisma.invoice.findMany({
      where: canReadAny ? {} : { ownerUserId: request.user!.id },
      select: invoiceSelect,
      orderBy: [{ createdAt: 'desc' }],
    });
  });

  app.get<{ Params: { id: string } }>('/api/v1/invoices/:id', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const invoice = await prisma.invoice.findUnique({
      where: { id: request.params.id },
      select: { ...invoiceSelect, timeEntries: { select: { timeEntry: true } } },
    });
    if (!invoice) return reply.code(404).send({ error: 'Invoice not found' });
    if (invoice.ownerUserId !== request.user!.id && !hasPermission(request.user, 'invoices:read:any')) return reply.code(403).send({ error: 'Forbidden' });
    return invoice;
  });

  app.post<{ Body: { customerId?: string; timeEntryIds: string[]; ownerUserId?: string; discountGbp?: number; taxGbp?: number } }>(
    '/api/v1/invoices',
    async (request, reply) => {
      if (!requireAuth(request, reply)) return;
      const { customerId, timeEntryIds, ownerUserId, discountGbp, taxGbp } = request.body ?? {};
      if (!Array.isArray(timeEntryIds) || timeEntryIds.length === 0) {
        return reply.code(400).send({ error: 'At least one timeEntryId is required' });
      }
      const owner = ownerUserId ?? request.user!.id;
      if (owner !== request.user!.id && !hasPermission(request.user, 'invoices:manage:any')) {
        return reply.code(403).send({ error: 'Permission required to create an invoice for another user' });
      }
      const companies = await prisma.customer.findMany({ take: 2 });
      if (companies.length !== 1) return reply.code(409).send({ error: 'Set up one Company Info record before creating invoices' });
      const customer = companies[0];
      if (customerId && customerId !== customer.id) return reply.code(400).send({ error: 'Invalid company' });
      const result = await loadBillableEntries(timeEntryIds, owner, customer.id);
      if ('error' in result) return reply.code(400).send({ error: result.error });
      const lines = groupIntoLines(result.entries.map((e) => ({ projectId: e.projectId, projectName: e.projectName, minutes: e.minutes, hourlyRateGbp: e.hourlyRateGbp })));
      const discount = discountGbp ?? 0;
      const tax = taxGbp ?? 0;
      const { subtotalGbp, totalGbp } = sumTotals(lines, discount, tax);
      const invoice = await prisma.$transaction(async (tx) => {
        const created = await tx.invoice.create({
          data: {
            ownerUserId: owner,
            customerId: customer.id,
            subtotalGbp,
            discountGbp: discount,
            taxGbp: tax,
            totalGbp,
            customerSnapshot: {
              name: customer.name,
              email: customer.email,
              address: customer.address,
              registrationNumber: customer.registrationNumber,
              vatNumber: customer.vatNumber,
            } as Prisma.InputJsonValue,
            lines: { create: lines },
            timeEntries: { create: result.entries.map((e) => ({ timeEntryId: e.entryId })) },
          },
          select: invoiceSelect,
        });
        return created;
      });
      return reply.code(201).send(invoice);
    },
  );

  app.patch<{ Params: { id: string }; Body: { timeEntryIds?: string[]; discountGbp?: number; taxGbp?: number } }>(
    '/api/v1/invoices/:id',
    async (request, reply) => {
      if (!requireAuth(request, reply)) return;
      const existing = await prisma.invoice.findUnique({ where: { id: request.params.id }, include: { lines: true } });
      if (!existing) return reply.code(404).send({ error: 'Invoice not found' });
      if (existing.ownerUserId !== request.user!.id && !hasPermission(request.user, 'invoices:manage:any')) return reply.code(403).send({ error: 'Forbidden' });
      if (existing.status !== 'DRAFT') return reply.code(409).send({ error: 'Only draft invoices can be edited' });
      const { timeEntryIds, discountGbp, taxGbp } = request.body ?? {};

      let lines = existing.lines.map((l) => ({ description: l.description, minutes: l.minutes, hourlyRateGbp: Number(l.hourlyRateGbp), amountGbp: Number(l.amountGbp) }));
      let entryIdsToLink: string[] | null = null;
      if (timeEntryIds) {
        if (timeEntryIds.length === 0) return reply.code(400).send({ error: 'At least one timeEntryId is required' });
        const result = await loadBillableEntries(timeEntryIds, existing.ownerUserId, existing.customerId, existing.id);
        if ('error' in result) return reply.code(400).send({ error: result.error });
        lines = groupIntoLines(result.entries.map((e) => ({ projectId: e.projectId, projectName: e.projectName, minutes: e.minutes, hourlyRateGbp: e.hourlyRateGbp })));
        entryIdsToLink = result.entries.map((e) => e.entryId);
      }
      const discount = discountGbp ?? Number(existing.discountGbp);
      const tax = taxGbp ?? Number(existing.taxGbp);
      const { subtotalGbp, totalGbp } = sumTotals(lines, discount, tax);
      const updated = await prisma.$transaction(async (tx) => {
        if (entryIdsToLink) {
          await tx.invoiceLine.deleteMany({ where: { invoiceId: existing.id } });
          await tx.invoiceTimeEntry.deleteMany({ where: { invoiceId: existing.id } });
          await tx.invoiceTimeEntry.createMany({ data: entryIdsToLink.map((timeEntryId) => ({ invoiceId: existing.id, timeEntryId })) });
          await tx.invoiceLine.createMany({ data: lines.map((line) => ({ ...line, invoiceId: existing.id })) });
        }
        return tx.invoice.update({ where: { id: existing.id }, data: { discountGbp: discount, taxGbp: tax, subtotalGbp, totalGbp }, select: invoiceSelect });
      });
      return updated;
    },
  );

  app.delete<{ Params: { id: string } }>('/api/v1/invoices/:id', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const existing = await prisma.invoice.findUnique({ where: { id: request.params.id } });
    if (!existing) return reply.code(404).send({ error: 'Invoice not found' });
    if (existing.ownerUserId !== request.user!.id && !hasPermission(request.user, 'invoices:manage:any')) return reply.code(403).send({ error: 'Forbidden' });
    if (existing.status !== 'DRAFT') return reply.code(409).send({ error: 'Only draft invoices can be deleted' });
    await prisma.invoice.delete({ where: { id: existing.id } });
    return reply.code(204).send();
  });

  app.post<{ Params: { id: string }; Body: { dueInDays?: number } }>('/api/v1/invoices/:id/issue', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const existing = await prisma.invoice.findUnique({ where: { id: request.params.id } });
    if (!existing) return reply.code(404).send({ error: 'Invoice not found' });
    if (existing.ownerUserId !== request.user!.id && !hasPermission(request.user, 'invoices:manage:any')) return reply.code(403).send({ error: 'Forbidden' });
    if (existing.status !== 'DRAFT') return reply.code(409).send({ error: 'Only draft invoices can be issued' });
    const issuedAt = new Date();
    const dueAt = new Date(issuedAt.getTime() + (request.body?.dueInDays ?? 30) * 86400_000);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const sequence = (await prisma.invoice.count({ where: { status: 'ISSUED' } })) + 1 + attempt;
      const number = `INV-${issuedAt.getUTCFullYear()}-${String(sequence).padStart(4, '0')}`;
      try {
        return await prisma.invoice.update({ where: { id: existing.id }, data: { status: 'ISSUED', number, issuedAt, dueAt }, select: invoiceSelect });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') continue;
        throw error;
      }
    }
    return reply.code(409).send({ error: 'Could not assign a unique invoice number, please retry' });
  });

  app.post<{ Params: { id: string } }>('/api/v1/invoices/:id/void', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const existing = await prisma.invoice.findUnique({ where: { id: request.params.id } });
    if (!existing) return reply.code(404).send({ error: 'Invoice not found' });
    if (existing.ownerUserId !== request.user!.id && !hasPermission(request.user, 'invoices:manage:any')) return reply.code(403).send({ error: 'Forbidden' });
    if (existing.status !== 'ISSUED') return reply.code(409).send({ error: 'Only issued invoices can be voided' });
    return prisma.$transaction(async (tx) => {
      await tx.invoiceTimeEntry.deleteMany({ where: { invoiceId: existing.id } });
      return tx.invoice.update({ where: { id: existing.id }, data: { status: 'VOID' }, select: invoiceSelect });
    });
  });

  app.get<{ Params: { id: string } }>('/api/v1/invoices/:id/pdf', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const invoice = await prisma.invoice.findUnique({ where: { id: request.params.id }, include: { lines: true } });
    if (!invoice) return reply.code(404).send({ error: 'Invoice not found' });
    if (invoice.ownerUserId !== request.user!.id && !hasPermission(request.user, 'invoices:read:any')) return reply.code(403).send({ error: 'Forbidden' });
    const pdfData = {
        number: invoice.number,
        issuedAt: invoice.issuedAt,
        dueAt: invoice.dueAt,
        subtotalGbp: Number(invoice.subtotalGbp),
        discountGbp: Number(invoice.discountGbp),
        taxGbp: Number(invoice.taxGbp),
        totalGbp: Number(invoice.totalGbp),
        customerSnapshot: invoice.customerSnapshot as unknown as CustomerSnapshot,
        lines: invoice.lines.map((line) => ({ description: line.description, minutes: line.minutes, hourlyRateGbp: Number(line.hourlyRateGbp), amountGbp: Number(line.amountGbp) })),
    };
    const pdf = await renderPdf(pdfData, issuerFromEnv(process.env));
    reply.header('content-type', 'application/pdf');
    reply.header('content-disposition', `inline; filename="invoice-${invoice.number ?? invoice.id}.pdf"`);
    return reply.send(pdf);
  });
}
