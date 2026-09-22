// Browser half of web push: permission, subscription, and working out why it
// cannot be turned on when it cannot.
//
// The last part carries most of the weight. On iOS, push only exists inside a
// PWA that has been added to the Home Screen — in a Safari tab the APIs are
// simply absent. Without an explanation, the toggle looks broken, so this
// reports a reason the UI can show instead of failing silently.

export type PushBlocker =
  | 'ios-needs-install'
  | 'unsupported'
  | 'insecure-context'
  | 'denied'
  | 'not-configured'
  | null;

/** Running as an installed app rather than in a browser tab. */
export function isInstalledPWA(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari's own flag, which predates display-mode.
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS 13+ reports itself as a Mac; the touch points give it away.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/**
 * Why push cannot be enabled here, or null when it can.
 *
 * `publicKey` comes from the server: a self-hosted deploy with no VAPID keys
 * set can't send anything, and saying so beats a toggle that does nothing.
 */
export function pushBlocker(publicKey: string | null): PushBlocker {
  if (typeof window === 'undefined') return 'unsupported';
  if (!publicKey) return 'not-configured';
  // Service workers and push need a secure context. localhost counts.
  if (!window.isSecureContext) return 'insecure-context';
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    // On iOS this is the Add-to-Home-Screen case, which is fixable, rather
    // than a browser that will never support it.
    return isIOS() && !isInstalledPWA() ? 'ios-needs-install' : 'unsupported';
  }
  if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
    return 'denied';
  }
  return null;
}

// VAPID keys travel as base64url; PushManager wants raw bytes. Backed by an
// explicit ArrayBuffer so the result satisfies BufferSource — a plain
// `new Uint8Array(n)` is typed over ArrayBufferLike, which may be shared.
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

/** A human-readable name for this device, for the Settings device list. */
export function deviceLabel(): string {
  if (typeof navigator === 'undefined') return 'This device';
  const ua = navigator.userAgent;
  const os = /iPhone/.test(ua)
    ? 'iPhone'
    : /iPad/.test(ua)
      ? 'iPad'
      : /Android/.test(ua)
        ? 'Android'
        : /Mac OS X/.test(ua)
          ? 'Mac'
          : /Windows/.test(ua)
            ? 'Windows'
            : 'Device';
  const browser = /CriOS|Chrome/.test(ua)
    ? 'Chrome'
    : /Firefox/.test(ua)
      ? 'Firefox'
      : /Edg/.test(ua)
        ? 'Edge'
        : /Safari/.test(ua)
          ? 'Safari'
          : 'browser';
  return `${os} · ${browser}`;
}

export interface SubscribeResult {
  ok: boolean;
  /** Set when the browser refused, so the caller can explain. */
  blocker?: PushBlocker;
  subscription?: { endpoint: string; keys: { p256dh: string; auth: string } };
}

/**
 * Ask for permission and subscribe this browser.
 *
 * Must be called straight from a click: Safari only honours a permission
 * request that comes from a user gesture, and an await before the prompt is
 * enough to lose that.
 */
export async function subscribeToPush(
  publicKey: string,
): Promise<SubscribeResult> {
  const blocked = pushBlocker(publicKey);
  if (blocked) return { ok: false, blocker: blocked };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, blocker: permission === 'denied' ? 'denied' : null };
  }

  // The app only registers the worker in production, so make sure it is there
  // before asking it for a subscription.
  const reg =
    (await navigator.serviceWorker.getRegistration()) ??
    (await navigator.serviceWorker.register('/sw.js'));
  await navigator.serviceWorker.ready;

  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  const json = sub.toJSON() as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, blocker: 'unsupported' };
  }
  return {
    ok: true,
    subscription: {
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    },
  };
}

/** Unsubscribe this browser; returns the endpoint that was removed, if any. */
export async function unsubscribeFromPush(): Promise<string | null> {
  if (!('serviceWorker' in navigator)) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return null;
  const { endpoint } = sub;
  await sub.unsubscribe().catch(() => {});
  return endpoint;
}
