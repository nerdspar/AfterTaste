import type { DefaultSession } from 'next-auth';

// Extend Auth.js types with our custom fields (userId + householdId) so the
// session and JWT are strongly typed across the app.
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      householdId: string | null;
    } & DefaultSession['user'];
  }

  interface User {
    householdId?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
    householdId?: string | null;
  }
}
