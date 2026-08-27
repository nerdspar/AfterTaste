// Downscale + JPEG-compress an image File into a small data URL fit for storage.
// Phone photos are multi-megapixel and several MB; storing them raw blows past
// the browser storage quota (and our old hard 2 MB cap rejected them outright).
// We draw the image to a canvas capped at `maxDim` on its longest edge and
// re-encode as JPEG, which brings a typical iPhone photo down to a few hundred
// KB. Runs in the browser (needs canvas); rejects if the image can't be decoded
// (e.g. a HEIC opened somewhere without native HEIC support).

export interface DownscaleOptions {
  /** Longest edge, in pixels, of the output. */
  maxDim?: number;
  /** JPEG quality, 0–1. */
  quality?: number;
}

export function fileToDownscaledDataUrl(
  file: File,
  { maxDim = 1600, quality = 0.82 }: DownscaleOptions = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('Image processing is only available in the browser.'));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      if (!w || !h) {
        reject(new Error('Could not read that image.'));
        return;
      }
      const scale = Math.min(1, maxDim / Math.max(w, h));
      const cw = Math.max(1, Math.round(w * scale));
      const ch = Math.max(1, Math.round(h * scale));
      const canvas = document.createElement('canvas');
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not process that image.'));
        return;
      }
      ctx.drawImage(img, 0, 0, cw, ch);
      try {
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Could not process that image.'));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image.'));
    };
    img.src = url;
  });
}
