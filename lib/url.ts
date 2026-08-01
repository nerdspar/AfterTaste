import 'server-only';
import { headers } from 'next/headers';

/**
 * Public origin for building links in emails. Prefer an explicit APP_URL;
 * otherwise derive it from the (proxy-forwarded) request headers.
 */
export async function resolveOrigin(): Promise<string> {
  const configured = process.env.APP_URL?.replace(/\/$/, '');
  if (configured) return configured;
  const h = await headers();
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('x-forwarded-host') ?? h.get('host');
  return host ? `${proto}://${host}` : 'http://localhost:3000';
}
