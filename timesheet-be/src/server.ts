import Fastify from 'fastify';
import { Prisma } from '@prisma/client';
import cookie from '@fastify/cookie';
import { prisma } from './lib/prisma.js';
import { loadSessionUser } from './lib/auth.js';
import authModule from './modules/auth.js';
import usersModule from './modules/users.js';
import rolesModule from './modules/roles.js';
import customersModule from './modules/customers.js';
import projectsModule from './modules/projects.js';
import timesheetsModule from './modules/timesheets.js';
import invoicesModule from './modules/invoices.js';
import settingsModule from './modules/settings.js';

const app = Fastify({ logger: true, bodyLimit: 1_000_000 });

await app.register(cookie);
app.decorateRequest('user', null);
app.addHook('preHandler', async (request) => {
  request.user = await loadSessionUser(request);
});
app.setErrorHandler((error, request, reply) => {
  request.log.error({ err: error, requestId: request.id, method: request.method, url: request.url }, 'Request failed');
  let status = typeof error.statusCode === 'number' && error.statusCode >= 400 && error.statusCode < 500 ? error.statusCode : 500;
  let message = status === 500 ? 'Internal server error' : error.message;
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') { status = 409; message = 'This value is already in use'; }
    if (error.code === 'P2003' || error.code === 'P2014') { status = 409; message = 'This record is referenced by other data'; }
    if (error.code === 'P2025') { status = 404; message = 'Record not found'; }
  }
  reply.code(status).send({ error: message });
});

await app.register(authModule);
await app.register(usersModule);
await app.register(rolesModule);
await app.register(customersModule);
await app.register(projectsModule);
await app.register(timesheetsModule);
await app.register(invoicesModule);
await app.register(settingsModule);

app.get('/health', async () => {
  await prisma.$queryRaw`SELECT 1`;
  return { status: 'ok' };
});
app.get('/api/v1', async () => ({ name: 'Timesheet API', version: 1 }));

app.addHook('onClose', async () => prisma.$disconnect());

const port = Number(process.env.API_PORT ?? 4000);
try {
  await app.listen({ port, host: '0.0.0.0' });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
