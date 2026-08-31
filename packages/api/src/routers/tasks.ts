import { z } from "zod";
import { router, protectedProcedure, enforceFeatureMembership, enforceTaskMembership } from "../trpc";
import { TRPCError } from "@trpc/server";

export const tasksRouter = router({
  list: protectedProcedure
    .input(z.object({ featureRequestId: z.string() }))
    .query(async ({ ctx, input }) => {
      await enforceFeatureMembership(ctx, input.featureRequestId);
      return ctx.prisma.task.findMany({
        where: { featureRequestId: input.featureRequestId },
        orderBy: { createdAt: "asc" },
      });
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await enforceTaskMembership(ctx, input.taskId);
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.taskId },
      });
      if (!task) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Task not found." });
      }

      const updated = await ctx.prisma.task.update({
        where: { id: input.taskId },
        data: { status: input.status },
      });

      return updated;
    }),
});
