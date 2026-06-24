import { prisma } from "@repo/db";
import { auth } from "@repo/auth";

export async function createContext(opts: { req: Request }) {
  const session = await auth.api.getSession({
    headers: opts.req.headers,
  });

  return {
    prisma,
    session,
    req: opts.req,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
