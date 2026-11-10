import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithIntl } from '../../test/renderWithIntl';
import LoginForm from './LoginForm';

describe('LoginForm', () => {
  const assignMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    Object.defineProperty(window, 'location', { value: { assign: assignMock }, writable: true });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    assignMock.mockClear();
  });

  it('renders the Vietnamese labels', () => {
    renderWithIntl(<LoginForm />);
    expect(screen.getByText('Tên đăng nhập')).toBeInTheDocument();
    expect(screen.getByText('Mật khẩu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeInTheDocument();
  });

  it('shows the server error message when login fails', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, json: async () => ({ error: 'Sai tên đăng nhập hoặc mật khẩu' }) });
    renderWithIntl(<LoginForm />);
    fireEvent.change(screen.getByLabelText('Tên đăng nhập'), { target: { value: 'alice' } });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Sai tên đăng nhập hoặc mật khẩu'));
    expect(assignMock).not.toHaveBeenCalled();
  });

  it('redirects to /timesheets on successful login', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => ({ id: '1', username: 'alice', email: 'a@b.com', name: 'A' }) });
    renderWithIntl(<LoginForm />);
    fireEvent.change(screen.getByLabelText('Tên đăng nhập'), { target: { value: 'alice' } });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    await waitFor(() => expect(assignMock).toHaveBeenCalledWith('/timesheets'));
  });
});
