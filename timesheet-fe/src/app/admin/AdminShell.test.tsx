import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithIntl } from '../../test/renderWithIntl';
import AdminShell from './AdminShell';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

function mockMe(permissions: string[]) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: '1', email: 'a@b.com', name: 'A', roles: [], permissions }) }));
}

describe('AdminShell', () => {
  beforeEach(() => { Object.defineProperty(window, 'location', { value: { assign: vi.fn() }, writable: true }); });
  afterEach(() => vi.unstubAllGlobals());

  it('only shows nav links the user has permission for', async () => {
    mockMe(['users:manage']);
    renderWithIntl(<AdminShell requiredPermission="users:manage"><div>content</div></AdminShell>);
    await waitFor(() => expect(screen.getByText('Users')).toBeInTheDocument());
    expect(screen.queryByText('Roles')).not.toBeInTheDocument();
    expect(screen.queryByText('Khách hàng')).not.toBeInTheDocument();
  });

  it('renders children when the user has the required permission', async () => {
    mockMe(['users:manage']);
    renderWithIntl(<AdminShell requiredPermission="users:manage"><div>secret content</div></AdminShell>);
    await waitFor(() => expect(screen.getByText('secret content')).toBeInTheDocument());
  });

  it('shows a permission error instead of children when the user lacks the permission', async () => {
    mockMe(['roles:manage']);
    renderWithIntl(<AdminShell requiredPermission="users:manage"><div>secret content</div></AdminShell>);
    await waitFor(() => expect(screen.getByText('Bạn không có quyền truy cập trang này.')).toBeInTheDocument());
    expect(screen.queryByText('secret content')).not.toBeInTheDocument();
  });
});
