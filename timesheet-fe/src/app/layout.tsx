import './globals.css';
import type { Metadata } from 'next';
import { ThemeProvider } from 'next-themes';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import AppFrame from './AppFrame';
import { ToastProvider } from './ToastProvider';

export const metadata: Metadata = { title: 'Timesheet', description: 'Personal timesheet and invoices' };
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);
  return <html lang={locale} suppressHydrationWarning>
    <body>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem><ToastProvider><AppFrame>{children}</AppFrame></ToastProvider></ThemeProvider>
      </NextIntlClientProvider>
    </body>
  </html>;
}
