// A recipe counts as having a real photo only when its image is set and isn't
// the old stock fallback (Unsplash photo id 1495521821757) that earlier
// versions injected for photo-less recipes. Those now show the brand tile.
export function hasRecipePhoto(image?: string | null): boolean {
  if (!image) return false;
  return !image.includes('photo-1495521821757');
}
