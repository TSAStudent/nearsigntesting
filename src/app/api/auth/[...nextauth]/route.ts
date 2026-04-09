import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';

async function verifyFirebaseEmailPassword(email: string, password: string) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    throw new Error('Firebase API key is not configured');
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    }
  );

  const payload = await response.json();
  if (!response.ok) {
    const message = payload?.error?.message || 'Invalid email or password';
    throw new Error(message);
  }
  return payload as {
    localId: string;
    email: string;
    displayName?: string;
    emailVerified?: boolean;
  };
}

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      authorization: {
        params: {
          // Always show account chooser instead of silently reusing last account.
          prompt: 'select_account',
        },
      },
    }),
    CredentialsProvider({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'you@example.com' },
        password: { label: 'Password', type: 'password' },
        name: { label: 'Name', type: 'text', placeholder: 'Your name' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase() || '';
        const password = credentials?.password || '';
        if (!email || !password) return null;

        try {
          const authUser = await verifyFirebaseEmailPassword(email, password);
          if (!authUser.emailVerified) {
            throw new Error('Please verify your email before signing in.');
          }

          return {
            id: authUser.localId,
            email: authUser.email,
            name: authUser.displayName || credentials?.name || authUser.email.split('@')[0],
          };
        } catch (error) {
          console.error('Email credentials sign-in failed:', error);
          return null;
        }
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/',
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        (session.user as Record<string, unknown>).id = token.sub;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };
