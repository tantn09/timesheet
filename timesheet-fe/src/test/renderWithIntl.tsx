import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/vi.json';

export function renderWithIntl(ui: ReactElement) {
  return render(<NextIntlClientProvider locale="vi" messages={messages}>{ui}</NextIntlClientProvider>);
}
