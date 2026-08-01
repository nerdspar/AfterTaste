// Fixed brand palette + mark for the generated PNG app icons. Home-screen /
// PWA icons can't read the in-app theme, so these bake the light variant.
const DISC_DARK = '#b3502c';
const DISC_LIGHT = '#e5a184';
export const TILE_LIGHT = '#f0d9cd';

// The split disc as a standalone SVG, embedded as a data URI so next/og
// (Satori + resvg) rasterizes it — resvg supports the clipPath the split needs.
const DISC_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 608 608"><defs><clipPath id="d"><circle cx="304" cy="304" r="304"/></clipPath></defs><g clip-path="url(#d)"><rect width="608" height="608" fill="${DISC_DARK}"/><rect x="-1408" y="-1408" width="1662.7" height="3400" fill="${DISC_LIGHT}" transform="rotate(58 304 304)"/></g></svg>`;

export const DISC_DATA_URI = `data:image/svg+xml;base64,${btoa(DISC_SVG)}`;
