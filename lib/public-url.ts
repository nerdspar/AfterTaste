import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

// Guards server-side fetches of user-supplied URLs (recipe import) so they
// can't be pointed at the LAN, the host itself, or cloud metadata endpoints.

/** IPv4 ranges that aren't the public internet, as [network, prefix length]. */
const PRIVATE_V4: Array<[number, number]> = [
  [0x00000000, 8], // 0.0.0.0/8 "this network"
  [0x0a000000, 8], // 10/8
  [0x64400000, 10], // 100.64/10 carrier-grade NAT
  [0x7f000000, 8], // loopback
  [0xa9fe0000, 16], // link-local, incl. 169.254.169.254 metadata
  [0xac100000, 12], // 172.16/12
  [0xc0000000, 24], // 192.0.0/24 IETF protocol assignments
  [0xc0a80000, 16], // 192.168/16
  [0xc6120000, 15], // 198.18/15 benchmarking
  [0xe0000000, 3], // 224/4 multicast + 240/4 reserved + broadcast
];

function v4ToInt(ip: string): number {
  return ip.split('.').reduce((n, part) => (n << 8) + Number(part), 0) >>> 0;
}

function isPrivateV4(ip: string): boolean {
  const n = v4ToInt(ip);
  return PRIVATE_V4.some(([net, prefix]) => {
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    return (n & mask) >>> 0 === net;
  });
}

/** Expand an IPv6 address to its eight 16-bit groups. */
function v6Groups(ip: string): number[] {
  let addr = ip.toLowerCase();
  // A dotted IPv4 tail (::ffff:1.2.3.4) becomes two hex groups.
  const dotted = addr.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) {
    const n = v4ToInt(dotted[1]);
    addr = addr.slice(0, -dotted[1].length) + `${(n >>> 16).toString(16)}:${(n & 0xffff).toString(16)}`;
  }
  const [head, tail] = addr.split('::');
  const parse = (s: string | undefined) => (s ? s.split(':').map((g) => parseInt(g, 16)) : []);
  const h = parse(head);
  const t = parse(tail);
  if (tail === undefined) return h;
  return [...h, ...Array(8 - h.length - t.length).fill(0), ...t];
}

function isPrivateV6(ip: string): boolean {
  const g = v6Groups(ip);
  const allZeroUpTo = (i: number) => g.slice(0, i).every((x) => x === 0);
  if (allZeroUpTo(7) && (g[7] === 0 || g[7] === 1)) return true; // :: and ::1
  // IPv4-mapped (::ffff:a.b.c.d): judge the embedded IPv4 address.
  if (allZeroUpTo(5) && g[5] === 0xffff) {
    return isPrivateV4(`${g[6] >> 8}.${g[6] & 0xff}.${g[7] >> 8}.${g[7] & 0xff}`);
  }
  if ((g[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((g[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((g[0] & 0xff00) === 0xff00) return true; // ff00::/8 multicast
  return false;
}

/** True for loopback, private, link-local and other non-public addresses. */
export function isPrivateAddress(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateV4(ip);
  if (version === 6) return isPrivateV6(ip);
  // Not an IP at all: refuse rather than guess.
  return true;
}

/**
 * True when the URL is http(s) and every address its host resolves to is
 * public. (A host that fails to resolve is refused.)
 */
export async function isPublicUrl(url: URL): Promise<boolean> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(host)) return !isPrivateAddress(host);
  try {
    const addrs = await lookup(host, { all: true, verbatim: true });
    return addrs.length > 0 && addrs.every((a) => !isPrivateAddress(a.address));
  } catch {
    return false;
  }
}

export class PrivateUrlError extends Error {
  constructor(url: string) {
    super(`Refusing to fetch a private address: ${url}`);
    this.name = 'PrivateUrlError';
  }
}

/**
 * fetch() that re-checks every redirect hop, so a public page can't bounce the
 * server onto a LAN address. Throws PrivateUrlError when a hop is private.
 *
 * Note: the host is resolved here and again by fetch, so a DNS-rebinding host
 * could still race it; this stops the straightforward cases.
 */
export async function fetchPublic(
  input: string,
  init: RequestInit = {},
  maxRedirects = 5,
): Promise<Response> {
  let current = new URL(input);
  for (let hop = 0; ; hop++) {
    if (!(await isPublicUrl(current))) throw new PrivateUrlError(current.href);
    const res = await fetch(current.href, { ...init, redirect: 'manual' });
    const location = res.headers.get('location');
    if (res.status < 300 || res.status >= 400 || !location) return res;
    if (hop >= maxRedirects) throw new Error('Too many redirects');
    current = new URL(location, current);
  }
}
