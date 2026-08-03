import { NextResponse } from 'next/server';
import { parseRecipeFromText } from '@/lib/recipe-parser';

// pdf.js (via unpdf) needs the Node runtime, not Edge.
export const runtime = 'nodejs';

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: 'That PDF is too large (max 15 MB).' },
        { status: 413 },
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());

    // Extract the text layer (unpdf wraps pdf.js; works headless in Node).
    const { extractText, getDocumentProxy } = await import('unpdf');
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true });
    const content = (Array.isArray(text) ? text.join('\n') : (text ?? '')).trim();

    if (!content) {
      return NextResponse.json(
        {
          error:
            "Couldn't read any text from that PDF — it may be a scanned image. Try \"Import from Text\" and paste the recipe instead.",
        },
        { status: 422 },
      );
    }

    // The filename is usually the best title source (PDFs often start with
    // metadata like "Prep Time: ...").
    const fallbackTitle = file.name.replace(/\.[^.]+$/, '').trim();
    const recipe = parseRecipeFromText(content, { fallbackTitle });
    return NextResponse.json({ recipe });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to read PDF';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
