import { NextResponse } from "next/server";
import { prisma } from "@repo/db";
import { inngest } from "@repo/inngest";

export async function POST(req: Request) {
  try {
    const payload = await req.json();
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
              },
            });
          }
        } else {
          pr = await prisma.pullRequest.update({
            where: { id: pr.id },
            data: {
              title,
              state: state === "OPEN" ? "OPEN" : "CLOSED",
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
