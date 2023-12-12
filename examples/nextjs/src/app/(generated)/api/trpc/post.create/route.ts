import type { NextRequest } from "next/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { treeshake$ } from "@trpc-routes/treeshake/runtime";

import { createTRPCContext } from "~/server/api/trpc";
import { appRouter } from "../../../../../server/api/root";

export const runtime = "edge";
export const revalidate = 3600;
const handler = (req: NextRequest) =>
  fetchRequestHandler({
    req,
    router: treeshake$(appRouter, "post.create"),
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
