import { router } from "./trpc";
import { workspaceRouter } from "./routers/workspace";
import { projectRouter } from "./routers/project";
import { featureRequestRouter } from "./routers/featureRequest";
import { tasksRouter } from "./routers/tasks";
import { githubRouter } from "./routers/github";
import { billingRouter } from "./routers/billing";
import { releaseRouter } from "./routers/release";

export const appRouter = router({
  workspace: workspaceRouter,
  project: projectRouter,
  featureRequest: featureRequestRouter,
  tasks: tasksRouter,
  github: githubRouter,
  billing: billingRouter,
  release: releaseRouter,
});

export type AppRouter = typeof appRouter;
