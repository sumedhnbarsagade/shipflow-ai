import { serve } from "inngest/next";
import { inngest, generatePRDWorkflow, generateTasksWorkflow, reviewPullRequestWorkflow } from "@repo/inngest";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    generatePRDWorkflow,
    generateTasksWorkflow,
    reviewPullRequestWorkflow,
  ],
});
