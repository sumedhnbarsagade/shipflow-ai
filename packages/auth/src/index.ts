import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization } from "better-auth/plugins";
import { prisma } from "@repo/db";

declare const process: any;

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret: process.env.BETTER_AUTH_SECRET || "fallback-secret-for-build-purposes-only-12345",
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    organization(),
  ],
});

export type Auth = typeof auth;
