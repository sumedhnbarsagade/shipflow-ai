import { z } from "zod";
import { groq } from "@ai-sdk/groq";
import { generateText, generateObject } from "ai";
import { prisma } from "@repo/db";
import { inngest } from "./client";
import { Octokit } from "octokit";

declare const process: any;

const prdSystemPrompt = `
You are an Elite Principal Product Manager Agent. Your sole output must be a highly structured, enterprise-grade Product Requirements Document (PRD).

You must analyze the feature request and any supplemental context to generate a comprehensive document containing:
- Problem Statement: A clear definition of the pain point being addressed.
- Goals: Clear, measurable outcomes we aim to achieve.
- Non-Goals: Explicit boundaries outlining what will NOT be built in this iteration.
- User Stories: Standard "As a... I want to... So that..." format mapping out the features.
- Acceptance Criteria: Technical specifications defining completeness for engineers.
- Edge Cases: Scenarios involving error states, network drops, or rate limits.
- Success Metrics: Tangible KPI indicators to trace post-release.

Ensure all criteria are highly detailed, technically accurate, and formatted as clean string blocks.
`;

const taskPlannerSystemPrompt = `
You are an expert Technical Project Manager and Agile Scrum Master. Your job is to break down a comprehensive Product Requirements Document (PRD) into discrete, highly actionable, atomic engineering tasks.

CRITICAL IMPLEMENTATION RULES:
1. Every task must be self-contained and clear enough for an engineer to implement without seeking external clarity.
2. Group tasks logically: Frontend (UI/UX components), Backend (Database changes, API endpoints, tRPC routes), and Integration (Third-party platforms, Webhooks).
3. Assign an estimated complexity score (Story Points using standard Fibonacci sequence: 1, 2, 3, 5, 8) and a logical priority ('LOW', 'MEDIUM', 'HIGH').
`;

const qaReviewerSystemPrompt = `
You are an elite, highly critical Staff QA Engineer and Code Reviewer. Your task is to evaluate a pull request code diff against the official Product Requirements Document (PRD) and acceptance criteria.

Do not merely check for basic linting syntax errors. You must perform deep semantic analysis:
1. Verify if the code changes actually implement the exact features specified in the user stories and acceptance criteria.
2. Call out any missing implementations or half-baked code blocks.
3. Classify bugs as 'BLOCKING' (security flaws, broken logic, unmet core acceptance criteria) or 'NON_BLOCKING' (minor style inconsistencies, potential performance optimizations).
4. Provide the exact file path and line number context for any flagged issues so comments can be precision-targeted to the GitHub timeline.
`;

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

    const prdText = await step.run("generate-prd-with-ai", async () => {
      const { text } = await generateText({
        model: groq("groq/compound") as any,
        system: prdSystemPrompt,
        prompt: `
Generate a Product Requirements Document (PRD) based on this feature request:
Title: ${featureRequest.title}
Initial Description: ${featureRequest.description}

Here is the context gathered through requirement clarification:
${chatContext}
`,
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
        model: groq("groq/compound") as any,
        schema: z.object({
          tasks: z.array(
            z.object({
              title: z.string(),
              description: z.string(),
              points: z.number().describe("Story points (Fibonacci sequence: 1, 2, 3, 5, 8)"),
              priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
            })
          ),
        }),
        system: taskPlannerSystemPrompt,
        prompt: `
Based on the following Product Requirements Document (PRD), break down the requirements into clear, actionable engineering tasks for a Kanban board.

PRD:
${featureRequest.prd}
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
              points: task.points,
              priority: task.priority,
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
              project: true,
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
        model: groq("groq/compound") as any,
        schema: z.object({
          status: z.enum(["APPROVED", "CHANGES_REQUESTED"]),
          feedback: z.string(),
          issues: z.array(
            z.object({
              title: z.string(),
              description: z.string(),
              severity: z.enum(["BLOCKING", "NON_BLOCKING"]),
              filePath: z.string().optional().describe("Relative path to the file containing this issue"),
              lineNumber: z.number().optional().describe("Line number in the file containing this issue"),
            })
          ),
        }),
        system: qaReviewerSystemPrompt,
        prompt: `
Evaluate whether the code changes in the Pull Request satisfy the Product Requirements Document (PRD) and engineering tasks, and verify that the implementation is ready for production.

PRD:
${featureRequest.prd}

Tasks:
${featureRequest.tasks.map((t: any) => `- [${t.status}] ${t.title}: ${t.description}`).join("\n")}

Pull Request Title: ${pullRequest.title}
Code Diff:
${pullRequest.diff || "No code changes found in diff."}
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
                filePath: issue.filePath || null,
                lineNumber: issue.lineNumber || null,
                status: "OPEN",
              },
            })
          )
        );
      }

      const blockingCount = reviewResult.issues.filter((i) => i.severity === "BLOCKING").length;

      let newFeatureStatus = "HUMAN_APPROVAL";
      if (blockingCount > 0) {
        newFeatureStatus = "DEVELOPING";
      }

      await prisma.featureRequest.update({
        where: { id: featureRequest.id },
        data: {
          status: newFeatureStatus,
        },
      });
    });

    await step.run("post-github-review", async () => {
      const token = process.env.GITHUB_TOKEN;
      const repoPath = featureRequest.project.githubRepo;
      if (!token || !repoPath) {
        console.log("Skipping posting review to GitHub: Token or Repo path not available.");
        return;
      }

      const [owner, repo] = repoPath.split("/");
      if (!owner || !repo) {
        console.log("Skipping posting review to GitHub: Invalid Repo path structure.");
        return;
      }

      const octokit = new Octokit({ auth: token });
      
      const comments = reviewResult.issues
        .filter((issue) => issue.filePath && issue.lineNumber)
        .map((issue) => ({
          path: issue.filePath!,
          line: issue.lineNumber!,
          body: `**[${issue.severity}] ${issue.title}**\n\n${issue.description}`,
        }));

      try {
        await octokit.rest.pulls.createReview({
          owner,
          repo,
          pull_number: pullRequest.prNumber,
          event: reviewResult.status === "APPROVED" ? "APPROVE" : "REQUEST_CHANGES",
          body: `### ShipFlow AI QA Code Review\n\n${reviewResult.feedback}`,
          comments: comments.length > 0 ? comments : undefined,
        });
      } catch (err: any) {
        console.error("Failed to create review on GitHub:", err);
      }
    });

    return { status: "Review completed successfully and posted to GitHub" };
  }
);
