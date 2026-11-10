import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { hasPermission, requireAuth, requirePermission } from '../lib/auth.js';

export default async function customersModule(app: FastifyInstance) {
  app.get('/api/v1/company', { preHandler: requirePermission('customers:manage') }, async (_request, reply) => {
    const companies = await prisma.customer.findMany({ take: 2, orderBy: { createdAt: 'asc' } });
    if (companies.length > 1) return reply.code(409).send({ error: 'Multiple companies exist; consolidate them before editing Company Info' });
    return companies[0] ?? null;
  });

  app.put<{ Body: { name: string; email?: string; address?: string; registrationNumber?: string; vatNumber?: string } }>(
    '/api/v1/company', { preHandler: requirePermission('customers:manage') }, async (request, reply) => {
      const { name, email, address, registrationNumber, vatNumber } = request.body ?? {};
      if (!name?.trim()) return reply.code(400).send({ error: 'Company name is required' });
      const companies = await prisma.customer.findMany({ take: 2, orderBy: { createdAt: 'asc' } });
      if (companies.length > 1) return reply.code(409).send({ error: 'Multiple companies exist; consolidate them before editing Company Info' });
      const data = { name: name.trim(), email: email?.trim() || null, address: address?.trim() || null, registrationNumber: registrationNumber?.trim() || null, vatNumber: vatNumber?.trim() || null };
      return companies[0] ? prisma.customer.update({ where: { id: companies[0].id }, data }) : prisma.customer.create({ data });
    },
  );
  app.get('/api/v1/customers', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    if (!hasPermission(request.user, 'customers:manage') && !hasPermission(request.user, 'projects:manage')) {
      return reply.code(403).send({ error: 'Permission required: customers:manage or projects:manage' });
    }
    return prisma.customer.findMany({ orderBy: { name: 'asc' } });
  });

  app.post<{ Body: { name: string; email?: string; address?: string; registrationNumber?: string; vatNumber?: string } }>(
    '/api/v1/customers',
    { preHandler: requirePermission('customers:manage') },
    async (request, reply) => {
      const { name, email, address, registrationNumber, vatNumber } = request.body ?? {};
      if (!name?.trim()) return reply.code(400).send({ error: 'Customer name is required' });
      if (await prisma.customer.count()) return reply.code(409).send({ error: 'Only one company is supported' });
      return reply.code(201).send(
        await prisma.customer.create({
          data: { name: name.trim(), email: email?.trim() || null, address: address?.trim() || null, registrationNumber: registrationNumber?.trim() || null, vatNumber: vatNumber?.trim() || null },
        }),
      );
    },
  );

  app.patch<{ Params: { id: string }; Body: { name?: string; email?: string | null; address?: string | null; registrationNumber?: string | null; vatNumber?: string | null } }>(
    '/api/v1/customers/:id',
    { preHandler: requirePermission('customers:manage') },
    async (request, reply) => {
      const existing = await prisma.customer.findUnique({ where: { id: request.params.id } });
      if (!existing) return reply.code(404).send({ error: 'Customer not found' });
      const { name, email, address, registrationNumber, vatNumber } = request.body ?? {};
      if (name !== undefined && !name.trim()) return reply.code(400).send({ error: 'Customer name cannot be empty' });
      return prisma.customer.update({
        where: { id: existing.id },
        data: {
          ...(name !== undefined ? { name: name.trim() } : {}),
          ...(email !== undefined ? { email: email?.trim() || null } : {}),
          ...(address !== undefined ? { address: address?.trim() || null } : {}),
          ...(registrationNumber !== undefined ? { registrationNumber: registrationNumber?.trim() || null } : {}),
          ...(vatNumber !== undefined ? { vatNumber: vatNumber?.trim() || null } : {}),
        },
      });
    },
  );

  app.delete<{ Params: { id: string } }>('/api/v1/customers/:id', { preHandler: requirePermission('customers:manage') }, async (request, reply) => {
    const existing = await prisma.customer.findUnique({ where: { id: request.params.id }, include: { _count: { select: { projects: true, invoices: true } } } });
    if (!existing) return reply.code(404).send({ error: 'Customer not found' });
    if (existing._count.projects > 0 || existing._count.invoices > 0) {
      return reply.code(409).send({ error: 'Cannot delete a customer with projects or invoices' });
    }
    await prisma.customer.delete({ where: { id: existing.id } });
    return reply.code(204).send();
  });
}
