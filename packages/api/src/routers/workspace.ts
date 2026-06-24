import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

export const workspaceRouter = router({
  getSubscription: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      let sub = await ctx.prisma.orgSubscription.findUnique({
        where: { organizationId: input.organizationId },
      });

      if (!sub) {
        sub = await ctx.prisma.orgSubscription.create({
          data: {
            organizationId: input.organizationId,
            plan: "FREE",
            aiCredits: 5,
            repoLimit: 1,
          },
        });
      }

      return sub;
    }),
});
