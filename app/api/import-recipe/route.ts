import { NextRequest, NextResponse } from 'next/server';
import { parseRecipeFromHtml } from '@/lib/recipe-parser';

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

    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; AfterTaste/1.0; recipe-importer)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL (${response.status})` },
        { status: 422 },
      );
    }

    const html = await response.text();
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
