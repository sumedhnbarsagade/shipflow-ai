import { Inngest, EventSchemas } from "inngest";

type Events = {
  "prd.generate": {
    data: {
      featureRequestId: string;
    };
  };
  "tasks.generate": {
    data: {
      featureRequestId: string;
    };
  };
  "pr.review": {
    data: {
      pullRequestId: string;
    };
  };
};

export const inngest = new Inngest({
  id: "shipflow-ai",
  schemas: new EventSchemas().fromRecord<Events>(),
});

export type InngestClient = typeof inngest;
export * from "inngest";
