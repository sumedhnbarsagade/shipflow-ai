import { z } from "zod";
import { router, protectedProcedure, enforceOrgMembership, enforceProjectMembership } from "../trpc";
import { TRPCError } from "@trpc/server";

export const projectRouter = router({
  list: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!input.organizationId) {
        return [];
      }
      await enforceOrgMembership(ctx, input.organizationId);
      return ctx.prisma.project.findMany({
        where: { organizationId: input.organizationId },
        orderBy: { createdAt: "desc" },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      await enforceProjectMembership(ctx, input.id);
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.id },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
      }
      return project;
    }),

  create: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        name: z.string().min(1),
        description: z.string().optional(),
        githubRepo: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await enforceOrgMembership(ctx, input.organizationId);
      if (input.githubRepo) {
        let sub = await ctx.prisma.orgSubscription.findUnique({
          where: { organizationId: input.organizationId },
        });
        if (!sub) {
          sub = await ctx.prisma.orgSubscription.create({
            data: { organizationId: input.organizationId, plan: "FREE", aiCredits: 5, repoLimit: 1 },
          });
        }

        const projectsWithRepo = await ctx.prisma.project.count({
          where: {
            organizationId: input.organizationId,
            githubRepo: { not: null },
          },
        });

        if (projectsWithRepo >= sub.repoLimit) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Workspace repository limit reached (${sub.repoLimit}). Upgrade your plan to connect more repositories.`,
          });
        }
      }

      return ctx.prisma.project.create({
        data: {
          organizationId: input.organizationId,
          name: input.name,
          description: input.description,
          githubRepo: input.githubRepo || null,
        },
      });
    }),

  updateRepo: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        githubRepo: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await enforceProjectMembership(ctx, input.projectId);
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.projectId },
      });

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
      }

      if (input.githubRepo) {
        let sub = await ctx.prisma.orgSubscription.findUnique({
          where: { organizationId: project.organizationId },
        });
        if (!sub) {
          sub = await ctx.prisma.orgSubscription.create({
            data: { organizationId: project.organizationId, plan: "FREE", aiCredits: 5, repoLimit: 1 },
          });
        }

        const projectsWithRepo = await ctx.prisma.project.count({
          where: {
            organizationId: project.organizationId,
            githubRepo: { not: null },
            id: { not: input.projectId },
          },
        });

        if (projectsWithRepo >= sub.repoLimit) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Workspace repository limit reached (${sub.repoLimit}). Upgrade your plan to connect more repositories.`,
          });
        }
      }

      return ctx.prisma.project.update({
        where: { id: input.projectId },
        data: { githubRepo: input.githubRepo },
      });
    }),

  listGithubRepos: protectedProcedure
    .query(async ({ ctx }) => {
      const githubAccount = await ctx.prisma.account.findFirst({
        where: {
          userId: ctx.session.user.id,
          providerId: "github",
        },
      });

      if (!githubAccount || !githubAccount.accessToken) {
        return { connected: false, repos: [] };
      }

      try {
        const response = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated", {
          headers: {
            Authorization: `token ${githubAccount.accessToken}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "ShipFlow-AI",
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            return { connected: false, repos: [] };
          }
          throw new Error(`GitHub API returned status ${response.status}`);
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
          return { connected: true, repos: [] };
        }

        const repos = data.map((repo: any) => ({
          id: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description || "",
          private: repo.private,
          htmlUrl: repo.html_url,
        }));

        return { connected: true, repos };
      } catch (err) {
        console.error("Error fetching repositories from GitHub:", err);
        return { connected: false, repos: [] };
      }
    }),
});
