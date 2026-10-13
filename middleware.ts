import NextAuth from 'next-auth';
import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server';
import { authConfig } from './auth.config';
import { isReadOnly, READ_ONLY_MESSAGE, refusedWhenReadOnly } from './lib/read-only';

// Gate every app route behind a session (the `authorized` callback in
// auth.config.ts decides). Uses the edge-safe config only — no Prisma here.
const { auth } = NextAuth(authConfig);

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  // Read-only (READ_ONLY=1): refuse anything that would change data, before auth.
  if (isReadOnly() && refusedWhenReadOnly(request.method, request.nextUrl.pathname, request.headers)) {
    return new NextResponse(READ_ONLY_MESSAGE, { status: 403 });
  }
  return (auth as unknown as (req: NextRequest, ev: NextFetchEvent) => Promise<Response>)(request, event);
}

export const config = {
  // Run on everything except API routes, Next internals, and public PWA assets.
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|icon\\.svg|sw\\.js|manifest\\.webmanifest|apple-icon|app-icon).*)',
  ],
};
