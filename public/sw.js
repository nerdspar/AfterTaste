// Service worker: PWA install, basic offline via a network-first runtime
// cache, and web push. Registered only in production (see AppShell).
const CACHE = 'aftertaste-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  // Only same-origin GETs; leave everything else (POST, cross-origin) alone.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      try {
        const res = await fetch(req);
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      } catch {
        const cached = await caches.match(req);
        return cached || Response.error();
      }
    })(),
  );
});

// ---------------------------------------------------------------------------
// Push
// ---------------------------------------------------------------------------

// The payload is JSON from lib/push-server. Defaults cover the case where a
// push service delivers an empty message — some send a bare wake-up, and the
// spec requires a visible notification regardless, or the browser shows its
// own "this site was updated in the background" instead.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || 'AfterTaste';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/app-icon/192',
      badge: '/static/favicons/android-chrome-96x96.png',
      tag: data.tag || 'aftertaste',
      // A replaced notification should not buzz a second time.
      renotify: false,
      data: { url: data.url || '/' },
    }),
  );
});

// Focus an already-open window rather than piling up new ones, and get it to
// wherever the notification points.
//
// Getting there is the fiddly part. client.navigate() is unreliable inside an
// installed iOS PWA — it can reject, or resolve without moving — and an earlier
// version swallowed that failure, so tapping a notification focused the app and
// then visibly did nothing. There are three ways in, tried in order of how
// dependable they are:
//   1. postMessage, and let the app's own router handle it. Works whenever the
//      page is alive and listening, and it is a client-side route so it keeps
//      the app's state.
//   2. client.navigate(), for a page too old to be listening.
//   3. openWindow(), when there is no window at all.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      const client = all.find(
        (c) => new URL(c.url).origin === self.location.origin,
      );

      if (!client) {
        await self.clients.openWindow(target);
        return;
      }

      // Focus first: on iOS the window has to be foregrounded before anything
      // it does is visible.
      await client.focus().catch(() => {});

      // Ask the page to route itself, and wait briefly for it to confirm.
      const routed = await new Promise((resolve) => {
        const channel = new MessageChannel();
        const timer = setTimeout(() => resolve(false), 600);
        channel.port1.onmessage = (e) => {
          clearTimeout(timer);
          resolve(!!(e.data && e.data.ok));
        };
        try {
          client.postMessage({ type: 'aftertaste:navigate', url: target }, [
            channel.port2,
          ]);
        } catch {
          clearTimeout(timer);
          resolve(false);
        }
      });
      if (routed) return;

      // Nobody answered — fall back to a hard navigation, then to a new window.
      try {
        if ('navigate' in client) {
          await client.navigate(target);
          return;
        }
      } catch {
        // fall through
      }
      await self.clients.openWindow(target);
    })(),
  );
});
