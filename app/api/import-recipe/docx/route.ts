import { NextResponse } from 'next/server';
import { parseRecipeFromText } from '@/lib/recipe-parser';

// mammoth reads .docx (a zip of XML) and needs the Node runtime.
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
        { error: 'That document is too large (max 15 MB).' },
        { status: 413 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Extract the document text (mammoth handles .docx / Office Open XML).
    const mammoth = (await import('mammoth')).default;
    const { value } = await mammoth.extractRawText({ buffer });
    const content = (value ?? '').trim();

    if (!content) {
      return NextResponse.json(
        {
          error:
            "Couldn't read any text from that document. If it's an old .doc file, save it as .docx or PDF and try again.",
        },
        { status: 422 },
      );
    }

    const fallbackTitle = file.name.replace(/\.[^.]+$/, '').trim();
    const recipe = parseRecipeFromText(content, { fallbackTitle });
    return NextResponse.json({ recipe });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to read document';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
