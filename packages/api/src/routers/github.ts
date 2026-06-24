import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { Octokit } from "octokit";
import { inngest } from "@repo/inngest";

export const githubRouter = router({
  listPRs: protectedProcedure
    .input(z.object({ featureRequestId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.pullRequest.findMany({
        where: { featureRequestId: input.featureRequestId },
        orderBy: { createdAt: "desc" },
        include: {
          reviews: {
            orderBy: { createdAt: "desc" },
            include: { issues: true },
          },
        },
      });
    }),

  submitPR: protectedProcedure
    .input(
      z.object({
        featureRequestId: z.string(),
        prNumber: z.number(),
        githubRepo: z.string(), // e.g. "owner/repo"
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [owner, repo] = input.githubRepo.split("/");
      if (!owner || !repo) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid GitHub repository format. Use 'owner/repo'" });
      }

      const token = process.env.GITHUB_TOKEN;
      let title = `Pull Request #${input.prNumber}`;
      let diff = "";
      let htmlUrl = `https://github.com/${input.githubRepo}/pull/${input.prNumber}`;

      if (token) {
        try {
          const octokit = new Octokit({ auth: token });
          
          const prResponse = await octokit.rest.pulls.get({
            owner,
            repo,
            pull_number: input.prNumber,
          });
          title = prResponse.data.title;
          htmlUrl = prResponse.data.html_url;

          const diffResponse = await octokit.rest.pulls.get({
            owner,
            repo,
            pull_number: input.prNumber,
            headers: {
              accept: "application/vnd.github.v3.diff",
            },
          });
          diff = typeof diffResponse.data === "string" ? diffResponse.data : "";
        } catch (e: any) {
          console.error("Octokit error:", e);
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Failed to fetch PR from GitHub: ${e.message || "Unknown error"}`,
          });
        }
      } else {
        // Fallback mock diff if no github token is configured
        diff = `diff --git a/src/index.js b/src/index.js
index 7283b9..4a3f4d 100644
--- a/src/index.js
+++ b/src/index.js
@@ -5,4 +5,8 @@
-console.log("Hello");
+console.log("Hello World");
+
+// TODO: add security checks
+const token = "MOCK_EXPOSED_API_KEY_12345"; 
+console.log("token set: " + token);
`;
      }

      // Check if PR already registered
      let pr = await ctx.prisma.pullRequest.findFirst({
        where: {
          featureRequestId: input.featureRequestId,
          prNumber: input.prNumber,
        },
      });

      if (pr) {
        pr = await ctx.prisma.pullRequest.update({
          where: { id: pr.id },
          data: {
            title,
            diff,
            state: "OPEN",
          },
        });
      } else {
        pr = await ctx.prisma.pullRequest.create({
          data: {
            featureRequestId: input.featureRequestId,
            prNumber: input.prNumber,
            title,
            diff,
            state: "OPEN",
            htmlUrl,
          },
        });
      }

      // Transition feature status to QA_REVIEWING
      await ctx.prisma.featureRequest.update({
        where: { id: input.featureRequestId },
        data: { status: "QA_REVIEWING" },
      });

      // Send to Inngest for AI code review
      await inngest.send({
        name: "pr.review",
        data: { pullRequestId: pr.id },
      });

      return pr;
    }),

  triggerMockPR: protectedProcedure
    .input(
      z.object({
        featureRequestId: z.string(),
        type: z.enum(["WITH_ERRORS", "CLEAN"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const prNumber = Math.floor(Math.random() * 1000) + 1;
      const title = input.type === "WITH_ERRORS" 
        ? "Feat: Add API keys (Draft)" 
        : "Feat: Add fully validated key verification layer";
      
      const diff = input.type === "WITH_ERRORS"
        ? `diff --git a/src/auth.ts b/src/auth.ts
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -1,5 +1,8 @@
 export function verifyUser(id: string) {
-  return true;
+  // Hardcoded key bypass for testing
+  if (id === "admin") return true;
+  const apiKey = "AIzaSyD-mock-google-key-exposed-in-code";
+  return id.startsWith("user_");
 }
`
        : `diff --git a/src/auth.ts b/src/auth.ts
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -1,5 +1,8 @@
+import { db } from "./db";
+
 export async function verifyUser(id: string) {
-  return true;
+  if (!id) return false;
+  const user = await db.user.findUnique({ where: { id } });
+  return !!user;
 }
`;

      const pr = await ctx.prisma.pullRequest.create({
        data: {
          featureRequestId: input.featureRequestId,
          prNumber,
          title,
          diff,
          state: "OPEN",
          htmlUrl: `https://github.com/mock-owner/mock-repo/pull/${prNumber}`,
        },
      });

      await ctx.prisma.featureRequest.update({
        where: { id: input.featureRequestId },
        data: { status: "QA_REVIEWING" },
      });

      await inngest.send({
        name: "pr.review",
        data: { pullRequestId: pr.id },
      });

      return pr;
    }),
});
