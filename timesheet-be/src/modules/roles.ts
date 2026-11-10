import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { ADMIN_ROLE, hasPermission, requireAuth, requirePermission } from '../lib/auth.js';

const roleSelect = {
  id: true,
  name: true,
  description: true,
  permissions: { select: { permission: { select: { id: true, code: true } } } },
};

function serializeRole(role: { permissions: { permission: { id: string; code: string } }[] } & Record<string, unknown>) {
  const { permissions, ...rest } = role;
  return { ...rest, permissions: permissions.map(({ permission }) => permission) };
}

export default async function rolesModule(app: FastifyInstance) {
  app.get('/api/v1/permissions', { preHandler: requirePermission('roles:manage') }, async () => {
    return prisma.permission.findMany({ orderBy: { code: 'asc' } });
  });

  app.get('/api/v1/roles', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    if (!hasPermission(request.user, 'roles:manage') && !hasPermission(request.user, 'users:manage')) {
      return reply.code(403).send({ error: 'Permission required: roles:manage or users:manage' });
    }
    const roles = await prisma.role.findMany({ select: roleSelect, orderBy: { name: 'asc' } });
    return roles.map(serializeRole);
  });

  app.post<{ Body: { name: string; description?: string; permissionIds?: string[] } }>(
    '/api/v1/roles',
    { preHandler: requirePermission('roles:manage') },
    async (request, reply) => {
      const name = request.body?.name?.trim();
      const description = request.body?.description?.trim();
      const permissionIds = request.body?.permissionIds ?? [];
      if (!name) return reply.code(400).send({ error: 'Role name is required' });
      if (await prisma.role.findUnique({ where: { name } })) return reply.code(409).send({ error: 'Role name already exists' });
      if (permissionIds.length && (await prisma.permission.count({ where: { id: { in: permissionIds } } })) !== permissionIds.length) {
        return reply.code(400).send({ error: 'One or more permissions do not exist' });
      }
      const role = await prisma.role.create({
        data: { name, description: description || null, permissions: { create: permissionIds.map((permissionId) => ({ permissionId })) } },
        select: roleSelect,
      });
      return reply.code(201).send(serializeRole(role));
    },
  );

  app.patch<{ Params: { id: string }; Body: { name?: string; description?: string | null; permissionIds?: string[] } }>(
    '/api/v1/roles/:id',
    { preHandler: requirePermission('roles:manage') },
    async (request, reply) => {
      const existing = await prisma.role.findUnique({ where: { id: request.params.id } });
      if (!existing) return reply.code(404).send({ error: 'Role not found' });
      const { name, description, permissionIds } = request.body ?? {};
      if (existing.name === ADMIN_ROLE && permissionIds) {
        return reply.code(409).send({ error: 'The admin role permissions cannot be changed' });
      }
      if (name && name.trim() !== existing.name && (await prisma.role.findUnique({ where: { name: name.trim() } }))) {
        return reply.code(409).send({ error: 'Role name already exists' });
      }
      if (permissionIds && permissionIds.length && (await prisma.permission.count({ where: { id: { in: permissionIds } } })) !== permissionIds.length) {
        return reply.code(400).send({ error: 'One or more permissions do not exist' });
      }
      const role = await prisma.$transaction(async (tx) => {
        if (permissionIds) {
          await tx.rolePermission.deleteMany({ where: { roleId: existing.id } });
          await tx.rolePermission.createMany({ data: permissionIds.map((permissionId) => ({ roleId: existing.id, permissionId })) });
        }
        return tx.role.update({
          where: { id: existing.id },
          data: { ...(name !== undefined ? { name: name.trim() } : {}), ...(description !== undefined ? { description: description?.trim() || null } : {}) },
          select: roleSelect,
        });
      });
      return serializeRole(role);
    },
  );

  app.delete<{ Params: { id: string } }>('/api/v1/roles/:id', { preHandler: requirePermission('roles:manage') }, async (request, reply) => {
    const existing = await prisma.role.findUnique({ where: { id: request.params.id }, include: { _count: { select: { users: true } } } });
    if (!existing) return reply.code(404).send({ error: 'Role not found' });
    if (existing.name === ADMIN_ROLE) return reply.code(409).send({ error: 'The admin role cannot be deleted' });
    if (existing._count.users > 0) return reply.code(409).send({ error: 'Cannot delete a role assigned to users' });
    await prisma.role.delete({ where: { id: existing.id } });
    return reply.code(204).send();
  });
}
