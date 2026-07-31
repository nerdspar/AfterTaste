/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  // Self-contained server bundle for a slim Docker image.
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};
