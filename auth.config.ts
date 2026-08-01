import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-safe Auth.js config. This file must NOT import Prisma or bcrypt so it
 * can run in the middleware (Edge) runtime. The Credentials provider — which
 * needs the database — is added in `auth.ts`, which runs in Node.
 */
export const authConfig = {
  // Behind a reverse proxy on TrueNAS; trust the forwarded host.
  trustHost: true,
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;
      const isSignInPage =
        path.startsWith('/login') || path.startsWith('/signup');
      const isPublicAuthRoute =
        isSignInPage ||
        path.startsWith('/forgot-password') ||
        path.startsWith('/reset-password');

      if (isPublicAuthRoute) {
        // Bounce signed-in users off the sign-in/up pages, but still let them
        // open the password-reset pages (e.g. from an email link).
        if (isLoggedIn && isSignInPage) {
          return Response.redirect(new URL('/dashboard', nextUrl));
        }
        return true;
      }
      // Everything else requires a session.
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.householdId = user.householdId ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.userId as string | undefined) ?? session.user.id;
        session.user.householdId =
          (token.householdId as string | null | undefined) ?? null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
