import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db/client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    MicrosoftEntraID({
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  session: {
    strategy: "database",
    maxAge: 8 * 60 * 60, // 8 hours absolute max
    updateAge: 60 * 60, // Extend session every 1 hour of activity
  },
  pages: {
    signIn: "/login",
    error: "/unauthorized",
  },
  callbacks: {
    async signIn({ user }) {
      // Only allow sign-in if the user was pre-created by admin and is active
      if (!user.email) return false;

      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
      });

      if (!existingUser || !existingUser.active) {
        return "/unauthorized?error=no_account";
      }

      // Update login stats
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          lastLoginAt: new Date(),
          loginCount: { increment: 1 },
        },
      });

      return true;
    },
    async session({ session, user }) {
      // Attach custom fields to the session for easy access
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      if (dbUser) {
        session.user.id = dbUser.id;
        session.user.role = dbUser.role;
        session.user.portId = dbUser.portId;
        session.user.title = dbUser.title;
        session.user.active = dbUser.active;
      }

      return session;
    },
  },
});
