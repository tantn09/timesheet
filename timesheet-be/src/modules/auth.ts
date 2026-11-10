import type { FastifyInstance } from 'fastify';
import { randomBytes } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { hashToken, requireAuth, sessionCookie, verifyPassword } from '../lib/auth.js';

export default async function authModule(app: FastifyInstance) {
  app.post<{ Body: { username: string; password: string } }>('/api/v1/auth/login', async (request, reply) => {
    const username = request.body?.username?.trim().toLowerCase();
    const password = request.body?.password;
    if (!username || typeof password !== 'string') return reply.code(400).send({ error: 'Username and password are required' });
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || user.status !== 'ACTIVE' || !(await verifyPassword(password, user.passwordHash))) {
      return reply.code(401).send({ error: 'Invalid username or password' });
    }
    const token = randomBytes(32).toString('base64url');
    await prisma.session.create({ data: { tokenHash: hashToken(token), userId: user.id, expiresAt: new Date(Date.now() + 7 * 86400_000) } });
    reply.setCookie(sessionCookie, token, { httpOnly: true, secure: process.env.COOKIE_SECURE === 'true', sameSite: 'lax', path: '/', maxAge: 7 * 86400 });
    return { id: user.id, email: user.email, name: user.name };
  });

  app.post('/api/v1/auth/logout', async (request, reply) => {
    const token = request.cookies[sessionCookie];
    if (token) await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
    reply.clearCookie(sessionCookie, { path: '/' });
    return reply.code(204).send();
  });

  app.get('/api/v1/me', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    return request.user;
  });
}
