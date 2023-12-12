import type { NextRequest } from "next/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { treeshake$ } from "../../../../../../../../packages/treeshake/dist/runtime";

import { createTRPCContext } from "~/server/api/trpc";
import { appRouter } from "../../../../../server/api/root";

export const runtime = "edge";
const handler = (req: NextRequest) =>
  fetchRequestHandler({
    req,
    router: treeshake$(appRouter, "post.hello"),
    endpoint: "/api/trpc",
    createContext: createTRPCContext,
    onError: ({ path, error }) => {
      console.error(
        `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
      );
    },
    batching: {
      enabled: false,
    },
  });
export { handler as GET, handler as POST };
