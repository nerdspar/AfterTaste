import fs from 'node:fs/promises';
import path from 'node:path';
import { UPLOADS_DIR, mimeForExt } from '@/lib/uploads';

export const dynamic = 'force-dynamic';

// Serves a media file from the uploads volume. Filenames are content hashes,
// so responses are immutable and cacheable. Not gated: recipe images render
// through next/image, whose optimizer fetches server-side without cookies.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  // Only a bare filename — no path traversal.
  if (!name || name.includes('/') || name.includes('\\') || name.includes('..')) {
    return new Response('Bad request', { status: 400 });
  }

  try {
    const file = await fs.readFile(path.join(UPLOADS_DIR, name));
    const ext = name.split('.').pop() ?? '';
    return new Response(new Uint8Array(file), {
      headers: {
        'Content-Type': mimeForExt(ext),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
