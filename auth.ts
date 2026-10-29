import NextAuth, { type NextAuthConfig } from "next-auth";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

import { authAvailability } from "@/lib/auth-config";
import { allowAuthAttempt } from "@/lib/auth-rate-limit";

const providers: NextAuthConfig["providers"] = [];
const { emailFallbackEnabled, magicLinkEnabled, googleEnabled, appleEnabled } = authAvailability();

if (emailFallbackEnabled) {
  providers.push(
    Credentials({
      id: "email-fallback",
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" }
      },
      async authorize(credentials) {
        const parsed = z.string().trim().toLowerCase().email().safeParse(credentials?.email);

        if (!parsed.success) {
          return null;
        }

        const email = parsed.data.trim().toLowerCase();

        return prisma.user.upsert({
          where: { email },
          update: {},
          create: { email }
        });
      }
    })
  );
}

if (magicLinkEnabled) {
  providers.push(
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: process.env.AUTH_EMAIL_FROM
    })
  );
}

if (googleEnabled) {
  providers.push(Google);
}

if (appleEnabled) {
  providers.push(Apple);
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut
} = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret:
    process.env.AUTH_SECRET ??
    (process.env.NODE_ENV === "production" ? undefined : "climbsite-development-auth-secret"),
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60
  },
  pages: {
    signIn: "/login",
    verifyRequest: "/login/check-email"
  },
  providers,
  callbacks: {
    async signIn({ user, email, account }) {
      if (account?.provider === "resend" && email?.verificationRequest) {
        return allowAuthAttempt(`email:${user.email?.trim().toLowerCase()}`, 5);
      }
      return true;
    },
    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? token.sub);
      }

      return session;
    }
  }
});
