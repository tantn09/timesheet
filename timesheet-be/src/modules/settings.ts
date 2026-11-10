import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../lib/auth.js';

const THEMES = ['light', 'dark', 'system'] as const;
const LANGUAGES = ['vi', 'en'] as const;

export default async function settingsModule(app: FastifyInstance) {
  app.get('/api/v1/settings', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const settings = await prisma.userSettings.upsert({
      where: { userId: request.user!.id },
      update: {},
      create: { userId: request.user!.id },
    });
    return { theme: settings.theme, language: settings.language };
  });

  app.patch<{ Body: { theme?: string; language?: string } }>('/api/v1/settings', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const { theme, language } = request.body ?? {};
    if (theme !== undefined && !THEMES.includes(theme as (typeof THEMES)[number])) {
      return reply.code(400).send({ error: `theme must be one of ${THEMES.join(', ')}` });
    }
    if (language !== undefined && !LANGUAGES.includes(language as (typeof LANGUAGES)[number])) {
      return reply.code(400).send({ error: `language must be one of ${LANGUAGES.join(', ')}` });
    }
    const settings = await prisma.userSettings.upsert({
      where: { userId: request.user!.id },
      update: { ...(theme !== undefined ? { theme } : {}), ...(language !== undefined ? { language } : {}) },
      create: { userId: request.user!.id, theme: theme ?? 'system', language: language ?? 'en' },
    });
    return { theme: settings.theme, language: settings.language };
  });
}
