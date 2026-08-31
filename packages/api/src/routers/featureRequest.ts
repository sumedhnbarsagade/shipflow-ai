import { z } from "zod";
import { router, protectedProcedure, enforceProjectMembership, enforceFeatureMembership } from "../trpc";
import { TRPCError } from "@trpc/server";
import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { inngest } from "@repo/inngest";

export const featureRequestRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      await enforceProjectMembership(ctx, input.projectId);
      return ctx.prisma.featureRequest.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: "desc" },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      await enforceFeatureMembership(ctx, input.id);
      const feature = await ctx.prisma.featureRequest.findUnique({
        where: { id: input.id },
        include: {
          chatMessages: { orderBy: { createdAt: "asc" } },
          tasks: { orderBy: { createdAt: "asc" } },
          pullRequests: {
            orderBy: { createdAt: "desc" },
            include: {
              reviews: {
                orderBy: { createdAt: "desc" },
                include: { issues: true },
              },
            },
          },
          releases: { orderBy: { createdAt: "desc" } },
        },
      });
      if (!feature) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Feature request not found" });
      }
      return feature;
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        title: z.string().min(1),
        description: z.string().min(1),
        source: z.string().default("MANUAL"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await enforceProjectMembership(ctx, input.projectId);
      const existingFeatures = await ctx.prisma.featureRequest.findMany({
        where: { projectId: input.projectId },
        select: { title: true, description: true },
      });

      let aiDuplicationWarning = null;

      if (existingFeatures.length > 0) {
        try {
          const listStr = existingFeatures.map((f) => `- ${f.title}: ${f.description}`).join("\n");
          const { text } = await generateText({
            model: groq("groq/compound") as any,
            prompt: `
You are an AI Product Owner assistant. A user wants to submit a new feature request:
Title: ${input.title}
Description: ${input.description}

Here are the existing feature requests in this project:
${listStr}

Check if this new request is a duplicate of or significantly overlaps with an existing one.
If it is a duplicate or highly similar, output a friendly message educating the user about the existing feature and explaining the overlap.
If it is not a duplicate and is a new, unique request, output exactly "UNIQUE".
`,
          });

          if (text.trim() !== "UNIQUE") {
            aiDuplicationWarning = text.trim();
          }
        } catch (e) {
          console.error("Failed to run duplication check: ", e);
        }
      }

      const initialStatus = aiDuplicationWarning ? "DRAFT" : "CLARIFYING";

      const feature = await ctx.prisma.featureRequest.create({
        data: {
          projectId: input.projectId,
          title: input.title,
          description: input.description,
          source: input.source,
          status: initialStatus,
        },
      });

      if (initialStatus === "CLARIFYING") {
        const clarificationPrompt = `
You are an AI Product Owner. A user has submitted a new feature request:
Title: ${input.title}
Description: ${input.description}

Analyze the request and write a professional, encouraging response. Ask 2-3 targeted, high-value follow-up questions to gather necessary context (such as goals, audience, specific details, or edge cases) to help write a great Product Requirements Document (PRD). Keep it under 150 words.
`;
        try {
          const { text: followUp } = await generateText({
            model: groq("groq/compound") as any,
            prompt: clarificationPrompt,
          });

          await ctx.prisma.featureRequestChat.create({
            data: {
              featureRequestId: feature.id,
              role: "assistant",
              content: followUp,
            },
          });
        } catch (e) {
          console.error("Failed to generate initial clarification: ", e);
        }
      } else if (aiDuplicationWarning) {
        await ctx.prisma.featureRequestChat.create({
          data: {
            featureRequestId: feature.id,
            role: "assistant",
            content: `⚠️ **Potential Duplicate Detected**\n\n${aiDuplicationWarning}\n\nDo you still want to proceed with creating this feature request? If so, please tell me how this is different or what additional goals it has.`,
          },
        });
      }

      return feature;
    }),

  sendChatMessage: protectedProcedure
    .input(
      z.object({
        featureRequestId: z.string(),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await enforceFeatureMembership(ctx, input.featureRequestId);
      await ctx.prisma.featureRequestChat.create({
        data: {
          featureRequestId: input.featureRequestId,
          role: "user",
          content: input.content,
        },
      });

      const feature = await ctx.prisma.featureRequest.findUnique({
        where: { id: input.featureRequestId },
        include: { chatMessages: { orderBy: { createdAt: "asc" } } },
      });

      if (!feature) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Feature request not found" });
      }

      if (feature.status === "DRAFT") {
        await ctx.prisma.featureRequest.update({
          where: { id: input.featureRequestId },
          data: { status: "CLARIFYING" },
        });
      }

      const chatContext = feature.chatMessages
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n\n");

      const prompt = `
You are an AI Product Owner. You are clarifying requirements for:
Title: ${feature.title}
Original Description: ${feature.description}

Here is the conversation history:
${chatContext}

USER'S LATEST UPDATE:
${input.content}

Write a professional response. If you have enough context to generate a robust PRD, summarize what you understand, and tell the user they can now click "Finalize and Generate PRD".
If you still need details, ask 1-2 concise questions. Keep the reply friendly, actionable, and under 150 words.
`;

      const { text: aiReply } = await generateText({
        model: groq("groq/compound") as any,
        prompt,
      });

      const savedReply = await ctx.prisma.featureRequestChat.create({
        data: {
          featureRequestId: input.featureRequestId,
          role: "assistant",
          content: aiReply,
        },
      });

      return savedReply;
    }),

  finalizeAndGenerate: protectedProcedure
    .input(z.object({ featureRequestId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await enforceFeatureMembership(ctx, input.featureRequestId);
      const feature = await ctx.prisma.featureRequest.findUnique({
        where: { id: input.featureRequestId },
      });

      if (!feature) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Feature request not found" });
      }

      const project = await ctx.prisma.project.findUnique({
        where: { id: feature.projectId },
      });
      if (project) {
        const sub = await ctx.prisma.orgSubscription.findUnique({
          where: { organizationId: project.organizationId },
        });

        if (sub && sub.aiCredits <= 0) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You have run out of AI credits. Please upgrade to Premium or purchase more credits.",
          });
        }

        if (sub) {
          await ctx.prisma.orgSubscription.update({
            where: { id: sub.id },
            data: { aiCredits: { decrement: 1 } },
          });
        }
      }

      await ctx.prisma.featureRequest.update({
        where: { id: input.featureRequestId },
        data: { status: "PRD_GENERATING" },
      });

      await inngest.send({
        name: "prd.generate",
        data: { featureRequestId: input.featureRequestId },
      });

      return { status: "PRD generation started" };
    }),
});
