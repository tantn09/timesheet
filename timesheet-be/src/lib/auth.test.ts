import { describe, expect, it } from 'vitest';
import { hashPassword, hasPermission, verifyPassword } from './auth.js';

describe('password hashing', () => {
  it('verifies a password against its own hash', async () => {
    const hash = await hashPassword('correct horse battery staple');
    await expect(verifyPassword('correct horse battery staple', hash)).resolves.toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('correct horse battery staple');
    await expect(verifyPassword('wrong password', hash)).resolves.toBe(false);
  });

  it('rejects a malformed stored hash', async () => {
    await expect(verifyPassword('anything', 'not-a-valid-hash')).resolves.toBe(false);
  });
});

describe('hasPermission', () => {
  const user = { id: '1', email: 'a@b.com', name: 'A', roles: ['admin'], permissions: ['users:manage'] };

  it('is true when the permission code is present', () => {
    expect(hasPermission(user, 'users:manage')).toBe(true);
  });

  it('is false when the permission code is absent', () => {
    expect(hasPermission(user, 'roles:manage')).toBe(false);
  });

  it('is false for a null user', () => {
    expect(hasPermission(null, 'users:manage')).toBe(false);
  });
});
