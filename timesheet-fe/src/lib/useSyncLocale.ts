'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isLocale, LOCALE_COOKIE } from '../i18n/locale';

function readCookie(name: string) {
  return document.cookie.split('; ').find((row) => row.startsWith(`${name}=`))?.split('=')[1];
}

export function useSyncLocale() {
  const router = useRouter();
  useEffect(() => {
    fetch('/backend/api/v1/settings').then(async (response) => {
      if (!response.ok) return;
      const data: { language?: string } = await response.json();
      if (!isLocale(data.language) || data.language === readCookie(LOCALE_COOKIE)) return;
      document.cookie = `${LOCALE_COOKIE}=${data.language}; path=/; max-age=31536000`;
      router.refresh();
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
