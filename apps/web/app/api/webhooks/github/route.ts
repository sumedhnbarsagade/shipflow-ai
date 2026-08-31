import { NextResponse } from "next/server";
import { prisma } from "@repo/db";
import { inngest } from "@repo/inngest";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");
    const secret = process.env.GITHUB_WEBHOOK_SECRET;

    if (secret && signature) {
      const hmac = crypto.createHmac("sha256", secret);
      const digest = "sha256=" + hmac.update(rawBody).digest("hex");
      if (signature !== digest) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    const event = req.headers.get("x-github-event");

    if (event === "pull_request") {
      const { action, pull_request, repository } = payload;
      const prNumber = pull_request.number;
      const repoFullName = repository.full_name;
      const title = pull_request.title;
      const htmlUrl = pull_request.html_url;
      const state = pull_request.state.toUpperCase();

      const project = await prisma.project.findFirst({
        where: { githubRepo: repoFullName },
      });

      if (project) {
        // Fetch PR diff from GitHub directly
        let diff = "";
        const token = process.env.GITHUB_TOKEN;
        try {
          const headers: Record<string, string> = {
            "Accept": "application/vnd.github.v3.diff",
            "User-Agent": "ShipFlow-AI-Webhook",
          };
          if (token) {
            headers["Authorization"] = `token ${token}`;
          }
          const response = await fetch(`https://api.github.com/repos/${repoFullName}/pulls/${prNumber}`, {
            headers,
          });
          if (response.ok) {
            diff = await response.text();
          } else {
            console.error(`GitHub API responded with status ${response.status} when fetching diff`);
          }
        } catch (err) {
          console.error("Failed to fetch PR diff from GitHub API:", err);
        }

        let pr = await prisma.pullRequest.findFirst({
          where: {
            prNumber,
            featureRequest: { projectId: project.id },
          },
        });

        if (!pr) {
          const latestFeature = await prisma.featureRequest.findFirst({
            where: {
              projectId: project.id,
              status: { in: ["DEVELOPING", "QA_REVIEWING"] },
            },
            orderBy: { updatedAt: "desc" },
          });

          if (latestFeature) {
            pr = await prisma.pullRequest.create({
              data: {
                featureRequestId: latestFeature.id,
                prNumber,
                title,
                state: state === "OPEN" ? "OPEN" : "CLOSED",
                htmlUrl,
                diff: diff || null,
              },
            });
          }
        } else {
          pr = await prisma.pullRequest.update({
            where: { id: pr.id },
            data: {
              title,
              state: state === "OPEN" ? "OPEN" : "CLOSED",
              diff: diff || pr.diff || null,
            },
          });
        }

        if (pr && (action === "opened" || action === "synchronize")) {
          await prisma.featureRequest.update({
            where: { id: pr.featureRequestId },
            data: { status: "QA_REVIEWING" },
          });

          await inngest.send({
            name: "pr.review",
            data: { pullRequestId: pr.id },
          });
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
