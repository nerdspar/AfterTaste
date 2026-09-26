'use client';

// Routes the app when a notification is tapped.
//
// The service worker cannot navigate an installed PWA reliably — on iOS
// client.navigate() can reject, or resolve without going anywhere. So it asks
// the page instead, and this is the page answering: a client-side route, which
// works wherever the app is running and keeps its state rather than reloading
// the whole thing.
//
// Replying on the message port is what tells the worker not to fall back to a
// hard navigation. Staying silent is the signal that nobody was listening.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface NavigateMessage {
  type: 'aftertaste:navigate';
  url: string;
}

function isNavigateMessage(data: unknown): data is NavigateMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { type?: unknown }).type === 'aftertaste:navigate' &&
    typeof (data as { url?: unknown }).url === 'string'
  );
}

export function NotificationRouter() {
  const router = useRouter();

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }
    const onMessage = (event: MessageEvent) => {
      if (!isNavigateMessage(event.data)) return;
      // Same-origin paths only. The worker is ours, but a relative push is the
      // only thing that should ever come out of a message handler.
      const url = event.data.url;
      if (!url.startsWith('/')) return;
      router.push(url);
      event.ports?.[0]?.postMessage({ ok: true });
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () =>
      navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [router]);

  return null;
}
