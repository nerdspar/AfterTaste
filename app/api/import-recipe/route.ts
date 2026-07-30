import { NextRequest, NextResponse } from 'next/server';
import { parseRecipeFromHtml } from '@/lib/recipe-parser';

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
};

async function fetchHtml(targetUrl: string): Promise<string | null> {
  try {
    const res = await fetch(targetUrl, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
    });
    if (res.ok) return res.text();
  } catch {}
  return null;
}

// A parseable recipe page carries JSON-LD or at least Open Graph metadata; a
// bot/consent interstitial served with a 200 status has neither, so we should
// fall through to an archived copy rather than trust it.
function looksParseable(html: string): boolean {
  return (
    /application\/ld\+json/i.test(html) ||
    /<meta[^>]+(?:property|name)\s*=\s*["']og:title["']/i.test(html)
  );
}

async function fetchLatestWaybackSnapshot(
  url: string,
): Promise<string | null> {
  // Ask the Wayback Machine for the most recent snapshot. (Pinning to a fixed
  // year served stale, sometimes differently structured versions of a recipe.)
  try {
    const availRes = await fetch(
      `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`,
      { headers: FETCH_HEADERS, signal: AbortSignal.timeout(10000) },
    );
    if (availRes.ok) {
      const data = (await availRes.json()) as {
        archived_snapshots?: {
          closest?: { available?: boolean; url?: string };
        };
      };
      const closest = data.archived_snapshots?.closest;
      if (closest?.available && closest.url) {
        // `id_` returns the original page without the Wayback toolbar/rewriting.
        const rawUrl = closest.url
          .replace(/^http:/, 'https:')
          .replace(/\/web\/(\d+)\//, '/web/$1id_/');
        const html = await fetchHtml(rawUrl);
        if (html) return html;
      }
    }
  } catch {}

  // Fallback: a date-addressed snapshot resolves to the most recent capture on
  // or before today, without depending on the availability API.
  const now = new Date();
  const stamp =
    `${now.getUTCFullYear()}` +
    `${String(now.getUTCMonth() + 1).padStart(2, '0')}` +
    `${String(now.getUTCDate()).padStart(2, '0')}`;
  return fetchHtml(`https://web.archive.org/web/${stamp}/${url}`);
}

async function fetchRecipeHtml(url: string): Promise<string | null> {
  const direct = await fetchHtml(url);
  if (direct && looksParseable(direct)) return direct;

  const archived = await fetchLatestWaybackSnapshot(url);
  if (archived) return archived;

  // Last resort: return whatever the direct fetch produced so meta parsing can
  // still take a shot.
  return direct;
}

export async function POST(request: NextRequest) {
  try {
    const { url } = (await request.json()) as { url: string };

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { error: 'Only HTTP/HTTPS URLs are supported' },
        { status: 400 },
      );
    }

    const html = await fetchRecipeHtml(url);

    if (!html) {
      return NextResponse.json(
        {
          error:
            'Could not access this URL. Try "Import from Text" instead — visit the recipe page, copy the content, and paste it.',
        },
        { status: 422 },
      );
    }

    const recipe = parseRecipeFromHtml(html);

    if (!recipe) {
      return NextResponse.json(
        { error: 'Could not find recipe data on this page' },
        { status: 422 },
      );
    }

    return NextResponse.json({ recipe });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to import recipe';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
