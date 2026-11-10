import { PrismaClient } from '@prisma/client';
import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';

const prisma = new PrismaClient();
const scrypt = promisify(scryptCallback);

async function main() {
  const permissionCodes = [
    'users:manage', 'roles:manage', 'customers:manage', 'projects:manage',
    'rates:manage', 'timesheets:read:any', 'timesheets:write:any', 'invoices:read:any', 'invoices:manage:any',
  ];
  const permissions = await Promise.all(permissionCodes.map(code => prisma.permission.upsert({ where: { code }, update: {}, create: { code } })));
  const admin = await prisma.role.upsert({ where: { name: 'admin' }, update: {}, create: { name: 'admin' } });
  const user = await prisma.role.upsert({ where: { name: 'user' }, update: {}, create: { name: 'user' } });
  await Promise.all(permissions.map(permission => prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: admin.id, permissionId: permission.id } }, update: {}, create: { roleId: admin.id, permissionId: permission.id } })));
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const username = (process.env.ADMIN_USERNAME ?? email?.split('@')[0])?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? 'Administrator';
  if (username && email && password) {
    const salt = randomBytes(16).toString('hex');
    const key = await scrypt(password, salt, 64) as Buffer;
    const account = await prisma.user.upsert({ where: { username }, update: {}, create: { username, email, name, passwordHash: `${salt}:${key.toString('hex')}` } });
    await prisma.userRole.upsert({ where: { userId_roleId: { userId: account.id, roleId: admin.id } }, update: {}, create: { userId: account.id, roleId: admin.id } });
    await prisma.userSettings.upsert({ where: { userId: account.id }, update: {}, create: { userId: account.id } });
    console.info(`Admin account ready: ${username}`);
  } else {
    console.info('Set ADMIN_USERNAME, ADMIN_EMAIL, and ADMIN_PASSWORD to create the initial admin account.');
  }
  void user;
}

main().finally(() => prisma.$disconnect());
