import NextAuth, { type NextAuthConfig } from "next-auth";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const providers: NextAuthConfig["providers"] = [];
const emailFallbackEnabled = process.env.AUTH_EMAIL_FALLBACK !== "false";

if (emailFallbackEnabled) {
  providers.push(
    Credentials({
      id: "email-fallback",
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" }
      },
      async authorize(credentials) {
        const parsed = z.string().email().safeParse(credentials?.email);

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

if (process.env.AUTH_RESEND_KEY && process.env.AUTH_EMAIL_FROM) {
  providers.push(
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: process.env.AUTH_EMAIL_FROM
    })
  );
}

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(Google);
}

if (process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET) {
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
    strategy: "jwt"
  },
  pages: {
    signIn: "/login",
    verifyRequest: "/login/check-email"
  },
  providers,
  callbacks: {
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
