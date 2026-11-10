import type { FastifyReply, FastifyRequest } from 'fastify';
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { prisma } from './prisma.js';

const scrypt = promisify(scryptCallback);

export const sessionCookie = 'timesheet_session';
export const hashToken = (value: string) => createHash('sha256').update(value).digest('hex');

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, key] = stored.split(':');
  if (!salt || !key) return false;
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(key, 'hex');
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

export type UserSession = { id: string; email: string; name: string; roles: string[]; permissions: string[] };

declare module 'fastify' {
  interface FastifyRequest {
    user: UserSession | null;
  }
}

export async function loadSessionUser(request: FastifyRequest): Promise<UserSession | null> {
  const token = request.cookies[sessionCookie];
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } } },
  });
  if (!session || session.expiresAt <= new Date() || session.user.status !== 'ACTIVE') return null;
  const permissions = new Set<string>();
  const roles: string[] = [];
  for (const { role } of session.user.roles) {
    roles.push(role.name);
    for (const { permission } of role.permissions) permissions.add(permission.code);
  }
  return { id: session.user.id, email: session.user.email, name: session.user.name, roles, permissions: [...permissions] };
}

export function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    reply.code(401).send({ error: 'Authentication required' });
    return false;
  }
  return true;
}

export function hasPermission(user: UserSession | null, code: string) {
  return user?.permissions.includes(code) ?? false;
}

export function requirePermission(code: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireAuth(request, reply)) return;
    if (!hasPermission(request.user, code)) {
      reply.code(403).send({ error: `Permission required: ${code}` });
    }
  };
}

export const ADMIN_ROLE = 'admin';

export async function countActiveAdmins(excludeUserId?: string) {
  return prisma.user.count({
    where: {
      status: 'ACTIVE',
      roles: { some: { role: { name: ADMIN_ROLE } } },
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
  });
}
