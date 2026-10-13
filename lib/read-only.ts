// The web app's last weeks: read-only while the native app takes over.
//
// Set READ_ONLY=1 on the container and nothing can change any more — every
// server action is refused — while everything can still be read, signed in to,
// and exported (the native app's import reads /api/export with a session). A
// fallback you can look at, but not one that drifts from the phones.

/** Whether the deployment is read-only (READ_ONLY=1 or true). */
export function isReadOnly(env: Record<string, string | undefined> = process.env): boolean {
  const v = env.READ_ONLY?.trim().toLowerCase();
  return v === '1' || v === 'true';
}

/**
 * Whether a request would change something, and so is refused when read-only.
 *
 * Reads (GET, HEAD) always pass. Server actions are POSTs to a page carrying a
 * `Next-Action` header; the sign-in page's is the one allowed, so you can still
 * get in to look. The recipe-import API only parses and answers, so it passes.
 */
export function refusedWhenReadOnly(method: string, path: string, headers: Headers): boolean {
  const m = method.toUpperCase();
  if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return false;
  if (path.startsWith('/api/auth/') || path.startsWith('/api/import-recipe')) return false;
  if (headers.has('next-action') && (path === '/login' || path.startsWith('/login/'))) return false;
  return true;
}

export const READ_ONLY_MESSAGE =
  'AfterTaste on the web is read-only now. Make changes in the AfterTaste app on your iPhone.';
