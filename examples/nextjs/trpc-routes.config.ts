import { createNextRoutesConfig } from "@trpc-routes/generate/adapters/next";

import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

const config = createNextRoutesConfig({
  router: appRouter,
  endpoint: "/api/trpc",
  createContext: createTRPCContext,
  onError: ({ path, error }) => {
    console.error(`❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`);
  },
});

export default config;
