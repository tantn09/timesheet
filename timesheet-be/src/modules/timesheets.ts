import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { hasPermission, requireAuth } from '../lib/auth.js';

export default async function timesheetsModule(app: FastifyInstance) {
  app.get('/api/v1/timesheets', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const canReadAny = hasPermission(request.user, 'timesheets:read:any');
    return prisma.timeEntry.findMany({
      where: canReadAny ? {} : { userId: request.user!.id },
      include: {
        user: { select: { id: true, name: true } },
        project: { include: { customer: { select: { id: true, name: true } } } },
        invoiceLinks: { select: { invoice: { select: { status: true } } } },
      },
      orderBy: [{ workDate: 'desc' }, { createdAt: 'desc' }],
      take: 500,
    });
  });

  app.post<{ Body: { projectId: string; workDate: string; hours: number; task: string; jiraSowId?: string; comment?: string } }>(
    '/api/v1/timesheets',
    async (request, reply) => {
      if (!requireAuth(request, reply)) return;
      const { projectId, workDate, hours, task, jiraSowId, comment } = request.body ?? {};
      if (!projectId || !/^\d{4}-\d{2}-\d{2}$/.test(workDate ?? '') || !Number.isFinite(hours) || hours <= 0 || hours > 24 || !task?.trim()) {
        return reply.code(400).send({ error: 'Project, valid date, hours (0–24), and task are required' });
      }
      const project = await prisma.project.findFirst({ where: { id: projectId, status: 'OPEN' } });
      if (!project) return reply.code(400).send({ error: 'Open project not found' });
      const minutes = Math.round(hours * 60);
      if (minutes < 1) return reply.code(400).send({ error: 'Hours must be at least one minute' });
      const entry = await prisma.timeEntry.create({
        data: { userId: request.user!.id, projectId, workDate: new Date(`${workDate}T00:00:00.000Z`), minutes, task: task.trim(), jiraSowId: jiraSowId?.trim() || null, comment: comment?.trim() || null },
      });
      return reply.code(201).send(entry);
    },
  );

  app.patch<{ Params: { id: string }; Body: { projectId?: string; workDate?: string; hours?: number; task?: string; jiraSowId?: string | null; comment?: string | null } }>(
    '/api/v1/timesheets/:id',
    async (request, reply) => {
      if (!requireAuth(request, reply)) return;
      const entry = await prisma.timeEntry.findUnique({ where: { id: request.params.id }, include: { invoiceLinks: { include: { invoice: true } } } });
      if (!entry) return reply.code(404).send({ error: 'Timesheet entry not found' });
      if (entry.userId !== request.user!.id && !hasPermission(request.user, 'timesheets:write:any')) return reply.code(403).send({ error: 'Forbidden' });
      if (entry.invoiceLinks.some(({ invoice }) => invoice.status === 'ISSUED')) return reply.code(409).send({ error: 'Issued invoice entries are locked' });
      const { projectId, workDate, hours, task, jiraSowId, comment } = request.body ?? {};
      if (hours !== undefined && (!Number.isFinite(hours) || hours <= 0 || hours > 24)) return reply.code(400).send({ error: 'Hours must be between 0 and 24' });
      const updated = await prisma.timeEntry.update({
        where: { id: entry.id },
        data: {
          ...(projectId ? { projectId } : {}),
          ...(workDate ? { workDate: new Date(`${workDate}T00:00:00.000Z`) } : {}),
          ...(hours !== undefined ? { minutes: Math.round(hours * 60) } : {}),
          ...(task !== undefined ? { task: task.trim() } : {}),
          ...(jiraSowId !== undefined ? { jiraSowId: jiraSowId?.trim() || null } : {}),
          ...(comment !== undefined ? { comment: comment?.trim() || null } : {}),
        },
      });
      return updated;
    },
  );

  app.delete<{ Params: { id: string } }>('/api/v1/timesheets/:id', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const entry = await prisma.timeEntry.findUnique({ where: { id: request.params.id }, include: { invoiceLinks: { include: { invoice: true } } } });
    if (!entry) return reply.code(404).send({ error: 'Timesheet entry not found' });
    if (entry.userId !== request.user!.id && !hasPermission(request.user, 'timesheets:write:any')) return reply.code(403).send({ error: 'Forbidden' });
    if (entry.invoiceLinks.length) return reply.code(409).send({ error: 'Remove this entry from its draft invoice before deleting it' });
    await prisma.timeEntry.delete({ where: { id: entry.id } });
    return reply.code(204).send();
  });
}
