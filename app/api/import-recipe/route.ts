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

async function fetchWithWaybackFallback(
  url: string,
): Promise<string | null> {
  const direct = await fetchHtml(url);
  if (direct) return direct;

  const waybackUrl = `https://web.archive.org/web/2024/${url}`;
  const cached = await fetchHtml(waybackUrl);
  if (cached) return cached;

  return null;
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

    const html = await fetchWithWaybackFallback(url);

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
