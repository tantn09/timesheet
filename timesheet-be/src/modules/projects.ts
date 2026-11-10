import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { hasPermission, requireAuth, requirePermission } from '../lib/auth.js';

export default async function projectsModule(app: FastifyInstance) {
  app.get('/api/v1/projects', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const canManage = hasPermission(request.user, 'projects:manage');
    return prisma.project.findMany({
      where: canManage ? {} : { status: 'OPEN' },
      include: { customer: true },
      orderBy: { name: 'asc' },
    });
  });

  app.post<{ Body: { name: string; customerId: string; status?: 'OPEN' | 'ON_HOLD' | 'CLOSED' } }>(
    '/api/v1/projects',
    { preHandler: requirePermission('projects:manage') },
    async (request, reply) => {
      const { name, customerId, status } = request.body ?? {};
      if (!name?.trim() || !customerId) return reply.code(400).send({ error: 'Project name and customer are required' });
      if (!(await prisma.customer.findUnique({ where: { id: customerId } }))) return reply.code(400).send({ error: 'Customer not found' });
      return reply.code(201).send(await prisma.project.create({ data: { name: name.trim(), customerId, status: status ?? 'OPEN' } }));
    },
  );

  app.patch<{ Params: { id: string }; Body: { name?: string; customerId?: string; status?: 'OPEN' | 'ON_HOLD' | 'CLOSED' } }>(
    '/api/v1/projects/:id',
    { preHandler: requirePermission('projects:manage') },
    async (request, reply) => {
      const existing = await prisma.project.findUnique({ where: { id: request.params.id } });
      if (!existing) return reply.code(404).send({ error: 'Project not found' });
      const { name, customerId, status } = request.body ?? {};
      if (name !== undefined && !name.trim()) return reply.code(400).send({ error: 'Project name cannot be empty' });
      if (customerId !== undefined && !(await prisma.customer.findUnique({ where: { id: customerId } }))) {
        return reply.code(400).send({ error: 'Customer not found' });
      }
      return prisma.project.update({
        where: { id: existing.id },
        data: { ...(name !== undefined ? { name: name.trim() } : {}), ...(customerId !== undefined ? { customerId } : {}), ...(status !== undefined ? { status } : {}) },
      });
    },
  );

  app.delete<{ Params: { id: string } }>('/api/v1/projects/:id', { preHandler: requirePermission('projects:manage') }, async (request, reply) => {
    const existing = await prisma.project.findUnique({ where: { id: request.params.id }, include: { _count: { select: { entries: true } } } });
    if (!existing) return reply.code(404).send({ error: 'Project not found' });
    if (existing._count.entries > 0) {
      return reply.code(409).send({ error: 'Cannot delete a project with timesheet entries' });
    }
    await prisma.project.delete({ where: { id: existing.id } });
    return reply.code(204).send();
  });
}
