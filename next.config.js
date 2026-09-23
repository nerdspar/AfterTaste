/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  // Self-contained server bundle for a slim Docker image.
  output: 'standalone',
  // unpdf wraps pdf.js and mammoth reads .docx; keep them external so webpack
  // doesn't mangle their internals. web-push is here for a different reason:
  // it reaches for node's https/net, and instrumentation.ts is compiled for the
  // Edge runtime as well (middleware.ts puts us on edge), where those do not
  // exist. Left to webpack the whole build fails on "Can't resolve 'https'".
  // File tracing still pulls all three into the standalone build.
  serverExternalPackages: ['unpdf', 'mammoth', 'web-push'],
  experimental: {
    // Recipe imports/edits carry base64 images in the action payload; the
    // default 1 MB cap is too small for a bulk Crouton import.
    serverActions: { bodySizeLimit: '25mb' },
  },
  // instrumentation.ts is compiled for BOTH runtimes, and middleware.ts puts
  // this app on the Edge runtime — where node's https/net/tls do not exist, so
  // webpack fails resolving web-push's transitive deps and takes the whole
  // build down. The scheduler never runs on edge (register() returns early
  // unless NEXT_RUNTIME is nodejs), so the edge bundle is given an empty
  // module instead of the real one. serverExternalPackages covers the node
  // side; there is no equivalent for edge.
  webpack: (config, { nextRuntime }) => {
    if (nextRuntime === 'edge') {
      config.resolve.alias = { ...config.resolve.alias, 'web-push': false };
    }
    return config;
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
