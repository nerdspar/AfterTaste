/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  // Self-contained server bundle for a slim Docker image.
  output: 'standalone',
  experimental: {
    // Recipe imports/edits carry base64 images in the action payload; the
    // default 1 MB cap is too small for a bulk Crouton import.
    serverActions: { bodySizeLimit: '25mb' },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};
