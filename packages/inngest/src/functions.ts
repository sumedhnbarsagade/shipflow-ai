import { z } from "zod";
import { google } from "@ai-sdk/google";
import { generateText, generateObject } from "ai";
import { prisma } from "@repo/db";
import { inngest } from "./client";

export const generatePRDWorkflow = inngest.createFunction(
  { id: "generate-prd-workflow" },
  { event: "prd.generate" },
  async ({ event, step }) => {
    const { featureRequestId } = event.data;

    const featureRequest = await step.run("fetch-feature-request", async () => {
      return prisma.featureRequest.findUnique({
        where: { id: featureRequestId },
        include: { chatMessages: { orderBy: { createdAt: "asc" } } },
      });
    });

    if (!featureRequest) return { error: "Feature request not found" };

    const chatContext = featureRequest.chatMessages
      .map((m: any) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n\n");

    const prompt = `
You are an expert Principal Product Manager. Your task is to generate a comprehensive, highly-structured Product Requirements Document (PRD) for the following feature request based on the developer and user discussion.

Feature Request Title: ${featureRequest.title}
Feature Request Initial Description: ${featureRequest.description}

Here is the context gathered through requirement clarification:
${chatContext}

Your generated PRD MUST be in Markdown format and include exactly the following sections:
1. Problem Statement
2. Goals
3. Non-Goals
4. User Stories
5. Acceptance Criteria
6. Edge Cases
7. Success Metrics

Write clean, precise, and professional PM specifications.
`;

    const prdText = await step.run("generate-prd-with-ai", async () => {
      const { text } = await generateText({
        model: google("gemini-1.5-flash") as any,
        prompt,
      });
      return text;
    });

    await step.run("save-prd-to-db", async () => {
      await prisma.featureRequest.update({
        where: { id: featureRequestId },
        data: {
          prd: prdText,
          status: "PRD_GENERATED",
        },
      });
    });

    await step.sendEvent("trigger-task-generation", {
      name: "tasks.generate",
      data: { featureRequestId },
    });

    return { status: "PRD generated successfully" };
  }
);

export const generateTasksWorkflow = inngest.createFunction(
  { id: "generate-tasks-workflow" },
  { event: "tasks.generate" },
  async ({ event, step }) => {
    const { featureRequestId } = event.data;

    const featureRequest = await step.run("fetch-feature-request-with-prd", async () => {
      return prisma.featureRequest.findUnique({
        where: { id: featureRequestId },
      });
    });

    if (!featureRequest || !featureRequest.prd) {
      return { error: "Feature request or PRD not found" };
    }

    const tasks = await step.run("generate-tasks-with-ai", async () => {
      const { object } = await generateObject({
        model: google("gemini-1.5-flash") as any,
        schema: z.object({
          tasks: z.array(
            z.object({
              title: z.string(),
              description: z.string(),
            })
          ),
        }),
        prompt: `
Based on the following Product Requirements Document (PRD), break down the requirements into clear, actionable engineering tasks for a Kanban board (TODO).

PRD:
${featureRequest.prd}

Each task should have:
1. An engineering-focused Title (e.g. "Database migration for User settings", "Implement Razorpay checkout webhook endpoint").
2. A detailed Description specifying what to implement, API specifications, or logic required.
`,
      });
      return object.tasks;
    });

    await step.run("create-tasks-in-db", async () => {
      await prisma.task.deleteMany({
        where: { featureRequestId },
      });

      await Promise.all(
        tasks.map((task) =>
          prisma.task.create({
            data: {
              featureRequestId,
              title: task.title,
              description: task.description,
              status: "TODO",
            },
          })
        )
      );

      await prisma.featureRequest.update({
        where: { id: featureRequestId },
        data: {
          status: "DEVELOPING",
        },
      });
    });

    return { status: "Tasks generated and transitioned to DEVELOPING" };
  }
);

export const reviewPullRequestWorkflow = inngest.createFunction(
  { id: "review-pull-request-workflow" },
  { event: "pr.review" },
  async ({ event, step }) => {
    const { pullRequestId } = event.data;

    const pullRequest = await step.run("fetch-pr-details", async () => {
      return prisma.pullRequest.findUnique({
        where: { id: pullRequestId },
        include: {
          featureRequest: {
            include: {
              tasks: true,
            },
          },
        },
      });
    });

    if (!pullRequest) return { error: "Pull request not found" };
    const { featureRequest } = pullRequest;
    if (!featureRequest) return { error: "Feature request not found" };

    const reviewResult = await step.run("run-ai-code-review", async () => {
      const { object } = await generateObject({
        model: google("gemini-1.5-flash") as any,
        schema: z.object({
          status: z.enum(["APPROVED", "CHANGES_REQUESTED"]),
          feedback: z.string(),
          issues: z.array(
            z.object({
              title: z.string(),
              description: z.string(),
              severity: z.enum(["BLOCKING", "NON_BLOCKING"]),
            })
          ),
        }),
        prompt: `
You are an advanced AI QA & Senior Engineering Reviewer. Your role is to evaluate whether the code changes in the Pull Request satisfy the Product Requirements Document (PRD) and engineering tasks, and verify that the implementation is ready for production.

PRD:
${featureRequest.prd}

Tasks:
${featureRequest.tasks.map((t: any) => `- [${t.status}] ${t.title}: ${t.description}`).join("\n")}

Pull Request Title: ${pullRequest.title}
Code Diff:
${pullRequest.diff || "No code changes found in diff."}

Your evaluation must check:
1. Requirements satisfaction: does this actually implement the user stories and acceptance criteria in the PRD?
2. Technical quality: are there any security bugs, race conditions, or major performance bottlenecks?
3. Task completion: are the tasks covered?

Determine the status (APPROVED if only minor non-blocking issues or no issues exist; CHANGES_REQUESTED if there are critical security, functional, or logical bugs).
Provide high-quality Markdown feedback summarizing your review.
Generate a list of specific issues with details and severity (BLOCKING for must-fix bugs, NON_BLOCKING for suggestions/refactoring).
`,
      });
      return object;
    });

    await step.run("save-review-to-db", async () => {
      const qaReview = await prisma.qAReview.create({
        data: {
          pullRequestId,
          status: reviewResult.status,
          feedback: reviewResult.feedback,
        },
      });

      if (reviewResult.issues.length > 0) {
        await Promise.all(
          reviewResult.issues.map((issue) =>
            prisma.qAIssue.create({
              data: {
                qaReviewId: qaReview.id,
                title: issue.title,
                description: issue.description,
                severity: issue.severity,
                status: "OPEN",
              },
            })
          )
        );
      }

      const blockingCount = reviewResult.issues.filter((i) => i.severity === "BLOCKING").length;

      let newFeatureStatus = "HUMAN_APPROVAL";
      if (blockingCount > 0) {
        newFeatureStatus = "DEVELOPING"; // Returns to fix-needed state
      }

      await prisma.featureRequest.update({
        where: { id: featureRequest.id },
        data: {
          status: newFeatureStatus,
        },
      });
    });

    return { status: "Review completed successfully" };
  }
);
