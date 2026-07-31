/**
 * Whether a media source (upload data URI or URL) is a video rather than an image.
 */
export function isVideoSource(src: string): boolean {
  if (!src) return false;
  return (
    /^data:video\//i.test(src) || /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(src)
  );
}
