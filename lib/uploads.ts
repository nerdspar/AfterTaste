import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Recipe } from '@/data/sample/recipes';

// Image/video files live on a mounted volume (see docker-compose), NOT as
// data-URIs in the database. Uploaded/imported media is written here and
// referenced by a hashed URL; external http(s) URLs are left untouched.
export const UPLOADS_DIR =
  process.env.UPLOADS_DIR ?? path.join(process.cwd(), 'uploads');

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

export function extForMime(mime: string): string {
  return MIME_EXT[mime.toLowerCase()] ?? 'bin';
}

export function mimeForExt(ext: string): string {
  const found = Object.entries(MIME_EXT).find(([, e]) => e === ext);
  return found?.[0] ?? 'application/octet-stream';
}

function parseDataUrl(s: string): { mime: string; buffer: Buffer } | null {
  const match = /^data:([^;,]+)(;base64)?,([\s\S]*)$/.exec(s);
  if (!match) return null;
  const mime = match[1];
  const isBase64 = !!match[2];
  const buffer = isBase64
    ? Buffer.from(match[3], 'base64')
    : Buffer.from(decodeURIComponent(match[3]));
  return { mime, buffer };
}

/**
 * If `value` is a data-URI, write it to the uploads dir (content-addressed,
 * so identical media dedupes) and return its `/api/uploads/<file>` URL.
 * Anything else (http URL, existing upload path, empty) is returned as-is.
 */
export async function persistDataUrl(
  value: string | undefined | null,
): Promise<string> {
  if (!value || !value.startsWith('data:')) return value ?? '';
  const parsed = parseDataUrl(value);
  if (!parsed) return value;

  const ext = extForMime(parsed.mime);
  const hash = createHash('sha256').update(parsed.buffer).digest('hex').slice(0, 32);
  const filename = `${hash}.${ext}`;
  const filePath = path.join(UPLOADS_DIR, filename);

  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, parsed.buffer);
  }
  return `/api/uploads/${filename}`;
}

/** Move any data-URI images/videos on a recipe onto the volume. */
export async function persistRecipeImages(recipe: Recipe): Promise<Recipe> {
  const [image, instructions, ingredients] = await Promise.all([
    persistDataUrl(recipe.image),
    Promise.all(
      (recipe.instructions ?? []).map(async (ins) => ({
        ...ins,
        videoThumb: await persistDataUrl(ins.videoThumb),
      })),
    ),
    Promise.all(
      (recipe.ingredients ?? []).map(async (ing) => ({
        ...ing,
        image: await persistDataUrl(ing.image),
      })),
    ),
  ]);
  return { ...recipe, image, instructions, ingredients };
}

/** Same as persistRecipeImages but for a partial update payload. */
export async function persistRecipeUpdateImages(
  updates: Partial<Recipe>,
): Promise<Partial<Recipe>> {
  const next: Partial<Recipe> = { ...updates };
  if (updates.image !== undefined) {
    next.image = await persistDataUrl(updates.image);
  }
  if (updates.instructions !== undefined) {
    next.instructions = await Promise.all(
      updates.instructions.map(async (ins) => ({
        ...ins,
        videoThumb: await persistDataUrl(ins.videoThumb),
      })),
    );
  }
  if (updates.ingredients !== undefined) {
    next.ingredients = await Promise.all(
      updates.ingredients.map(async (ing) => ({
        ...ing,
        image: await persistDataUrl(ing.image),
      })),
    );
  }
  return next;
}
