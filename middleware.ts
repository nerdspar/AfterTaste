import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

// Gate every app route behind a session (the `authorized` callback in
// auth.config.ts decides). Uses the edge-safe config only — no Prisma here.
export const { auth: middleware } = NextAuth(authConfig);

export default middleware;

export const config = {
  // Run on everything except API routes, Next internals, and public PWA assets.
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|icon\\.svg|sw\\.js|manifest\\.webmanifest|apple-icon|app-icon).*)',
  ],
};
