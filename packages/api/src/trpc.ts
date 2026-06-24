import { initTRPC, TRPCError } from "@trpc/server";
import { Context } from "./context";

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const middleware = t.middleware;

export const publicProcedure = t.procedure;

const enforceUserIsAuthed = middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in to perform this action." });
  }
  return next({
    ctx: {
      ...ctx,
      session: {
        ...ctx.session,
        user: ctx.session.user,
      },
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);
