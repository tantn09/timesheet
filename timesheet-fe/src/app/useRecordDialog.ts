'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export function useRecordDialog() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [creating, setCreating] = useState(false);
  const [openedHere, setOpenedHere] = useState(false);
  const itemId = params.get('item');
  function openItem(id: string) { setCreating(false); setOpenedHere(true); router.push(`${pathname}?item=${encodeURIComponent(id)}`, { scroll: false }); }
  function close() {
    if (creating) { setCreating(false); return; }
    if (itemId) {
      if (openedHere) router.back(); else router.replace(pathname, { scroll: false });
      setOpenedHere(false);
    }
  }
  return { itemId, creating, openItem, openCreate: () => setCreating(true), close };
}
