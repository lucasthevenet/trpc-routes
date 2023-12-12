import { createNextRoutesConfig } from "../../packages/generate/dist/adapters/next";

import { createTRPCContext } from "~/server/api/trpc";
import { appRouter } from "./src/server/api/root";

const config = createNextRoutesConfig({
  router: appRouter,
  endpoint: "/api/trpc",
  createContext: createTRPCContext,
  onError: ({ path, error }) => {
    console.error(`❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`);
  },
});

export default config;
