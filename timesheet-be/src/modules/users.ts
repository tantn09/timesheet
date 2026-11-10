import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { ADMIN_ROLE, countActiveAdmins, hasPermission, hashPassword, requireAuth, requirePermission } from '../lib/auth.js';

const userSelect = {
  id: true,
  username: true,
  email: true,
  name: true,
  hourlyRateGbp: true,
  status: true,
  createdAt: true,
  roles: { select: { role: { select: { id: true, name: true } } } },
};

function serializeUser(user: { roles: { role: { id: string; name: string } }[] } & Record<string, unknown>) {
  const { roles, ...rest } = user;
  return { ...rest, roles: roles.map(({ role }) => role) };
}

export default async function usersModule(app: FastifyInstance) {
  app.get('/api/v1/users', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    if (!hasPermission(request.user, 'users:manage')) {
      return reply.code(403).send({ error: 'Permission required: users:manage' });
    }
    const users = await prisma.user.findMany({ select: userSelect, orderBy: { username: 'asc' } });
    return users.map(serializeUser);
  });

  app.post<{ Body: { username: string; email: string; name: string; password: string; hourlyRateGbp: number; roleIds?: string[] } }>(
    '/api/v1/users',
    { preHandler: requirePermission('users:manage') },
    async (request, reply) => {
      const username = request.body?.username?.trim().toLowerCase();
      const email = request.body?.email?.trim().toLowerCase();
      const name = request.body?.name?.trim();
      const password = request.body?.password;
      const hourlyRateGbp = request.body?.hourlyRateGbp;
      const roleIds = request.body?.roleIds ?? [];
      if (!username || !/^[a-z0-9._-]{3,32}$/.test(username) || !email || !name || typeof password !== 'string' || password.length < 8) {
        return reply.code(400).send({ error: 'Username (3–32 letters, numbers, dots, underscores or hyphens), email, name, and password (at least 8 characters) are required' });
      }
      if (!Number.isFinite(hourlyRateGbp) || hourlyRateGbp < 0) return reply.code(400).send({ error: 'A non-negative hourly rate is required' });
      if (await prisma.user.findUnique({ where: { username } })) return reply.code(409).send({ error: 'Username already in use' });
      if (await prisma.user.findUnique({ where: { email } })) return reply.code(409).send({ error: 'Email already in use' });
      if (roleIds.length && (await prisma.role.count({ where: { id: { in: roleIds } } })) !== roleIds.length) {
        return reply.code(400).send({ error: 'One or more roles do not exist' });
      }
      const passwordHash = await hashPassword(password);
      const user = await prisma.user.create({
        data: { username, email, name, passwordHash, hourlyRateGbp, roles: { create: roleIds.map((roleId) => ({ roleId })) } },
        select: userSelect,
      });
      await prisma.userSettings.create({ data: { userId: user.id } });
      return reply.code(201).send(serializeUser(user));
    },
  );

  app.patch<{ Params: { id: string }; Body: { name?: string; status?: 'ACTIVE' | 'DISABLED'; roleIds?: string[]; password?: string; hourlyRateGbp?: number } }>(
    '/api/v1/users/:id',
    { preHandler: requirePermission('users:manage') },
    async (request, reply) => {
      const existing = await prisma.user.findUnique({ where: { id: request.params.id }, include: { roles: { include: { role: true } } } });
      if (!existing) return reply.code(404).send({ error: 'User not found' });
      const { name, status, roleIds, password, hourlyRateGbp } = request.body ?? {};
      if (hourlyRateGbp !== undefined && (!Number.isFinite(hourlyRateGbp) || hourlyRateGbp < 0)) return reply.code(400).send({ error: 'Hourly rate must be non-negative' });
      const isCurrentlyAdmin = existing.roles.some(({ role }) => role.name === ADMIN_ROLE);
      const willBeAdmin = roleIds ? roleIds.includes((await prisma.role.findUnique({ where: { name: ADMIN_ROLE } }))?.id ?? '') : isCurrentlyAdmin;
      const willBeActive = status ? status === 'ACTIVE' : existing.status === 'ACTIVE';
      if (isCurrentlyAdmin && (!willBeAdmin || !willBeActive) && (await countActiveAdmins(existing.id)) === 0) {
        return reply.code(409).send({ error: 'Cannot remove the last active admin' });
      }
      if (roleIds && roleIds.length && (await prisma.role.count({ where: { id: { in: roleIds } } })) !== roleIds.length) {
        return reply.code(400).send({ error: 'One or more roles do not exist' });
      }
      if (password !== undefined && password.length < 8) return reply.code(400).send({ error: 'Password must be at least 8 characters' });
      const user = await prisma.$transaction(async (tx) => {
        if (roleIds) {
          await tx.userRole.deleteMany({ where: { userId: existing.id } });
          await tx.userRole.createMany({ data: roleIds.map((roleId) => ({ userId: existing.id, roleId })) });
        }
        return tx.user.update({
          where: { id: existing.id },
          data: {
            ...(name !== undefined ? { name: name.trim() } : {}),
            ...(status !== undefined ? { status } : {}),
            ...(hourlyRateGbp !== undefined ? { hourlyRateGbp } : {}),
            ...(password !== undefined ? { passwordHash: await hashPassword(password) } : {}),
          },
          select: userSelect,
        });
      });
      return serializeUser(user);
    },
  );

  app.delete<{ Params: { id: string } }>('/api/v1/users/:id', { preHandler: requirePermission('users:manage') }, async (request, reply) => {
    if (request.params.id === request.user?.id) return reply.code(409).send({ error: 'Cannot delete your own account' });
    const existing = await prisma.user.findUnique({ where: { id: request.params.id }, include: { roles: { include: { role: true } } } });
    if (!existing) return reply.code(404).send({ error: 'User not found' });
    const isAdmin = existing.roles.some(({ role }) => role.name === ADMIN_ROLE);
    if (isAdmin && (await countActiveAdmins(existing.id)) === 0) return reply.code(409).send({ error: 'Cannot remove the last active admin' });
    await prisma.user.delete({ where: { id: existing.id } });
    return reply.code(204).send();
  });
}
