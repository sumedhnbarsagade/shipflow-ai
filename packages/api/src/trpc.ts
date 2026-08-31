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

export async function enforceOrgMembership(ctx: Context, organizationId: string) {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in to perform this action." });
  }
  const member = await ctx.prisma.member.findFirst({
    where: {
      organizationId,
      userId: ctx.session.user.id,
    },
  });
  if (!member) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this organization." });
  }
  return member;
}

export async function enforceProjectMembership(ctx: Context, projectId: string) {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in to perform this action." });
  }
  const project = await ctx.prisma.project.findUnique({
    where: { id: projectId },
    select: { organizationId: true },
  });
  if (!project) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
  }
  await enforceOrgMembership(ctx, project.organizationId);
  return project;
}

export async function enforceFeatureMembership(ctx: Context, featureRequestId: string) {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in to perform this action." });
  }
  const feature = await ctx.prisma.featureRequest.findUnique({
    where: { id: featureRequestId },
    select: { project: { select: { organizationId: true } } },
  });
  if (!feature) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Feature request not found." });
  }
  await enforceOrgMembership(ctx, feature.project.organizationId);
  return feature;
}

export async function enforceTaskMembership(ctx: Context, taskId: string) {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in to perform this action." });
  }
  const task = await ctx.prisma.task.findUnique({
    where: { id: taskId },
    select: { featureRequest: { select: { project: { select: { organizationId: true } } } } },
  });
  if (!task) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Task not found." });
  }
  await enforceOrgMembership(ctx, task.featureRequest.project.organizationId);
  return task;
}
