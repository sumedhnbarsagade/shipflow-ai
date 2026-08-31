import { z } from "zod";
import { router, protectedProcedure, enforceFeatureMembership } from "../trpc";
import { TRPCError } from "@trpc/server";

export const releaseRouter = router({
  approve: protectedProcedure
    .input(
      z.object({
        featureRequestId: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await enforceFeatureMembership(ctx, input.featureRequestId);
      const feature = await ctx.prisma.featureRequest.findUnique({
        where: { id: input.featureRequestId },
      });

      if (!feature) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Feature request not found" });
      }

      // Add approval record
      const release = await ctx.prisma.release.create({
        data: {
          featureRequestId: input.featureRequestId,
          status: "APPROVED",
          notes: input.notes || "Approved by human reviewer",
          approvedBy: ctx.session.user.id,
        },
      });

      // Update status to SHIPPED
      await ctx.prisma.featureRequest.update({
        where: { id: input.featureRequestId },
        data: {
          status: "SHIPPED",
        },
      });

      return release;
    }),

  reject: protectedProcedure
    .input(
      z.object({
        featureRequestId: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await enforceFeatureMembership(ctx, input.featureRequestId);
      const feature = await ctx.prisma.featureRequest.findUnique({
        where: { id: input.featureRequestId },
      });

      if (!feature) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Feature request not found" });
      }

      // Add rejection record
      const release = await ctx.prisma.release.create({
        data: {
          featureRequestId: input.featureRequestId,
          status: "REJECTED",
          notes: input.notes || "Rejected by human reviewer",
          approvedBy: ctx.session.user.id,
        },
      });

      // Return to DEVELOPING
      await ctx.prisma.featureRequest.update({
        where: { id: input.featureRequestId },
        data: {
          status: "DEVELOPING",
        },
      });

      return release;
    }),
});
