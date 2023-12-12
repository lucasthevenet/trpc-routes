/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Procedure, ProcedureParams, RootConfig } from "@trpc/server";

export type NextRoutesMeta<TMeta = Record<string, unknown>> = TMeta & {
  next?: {
    dynamic?: boolean;
    revalidate?: false | "force-cache" | number;
    fetchCache?:
      | "auto"
      | "default-cache"
      | "only-cache"
      | "force-cache"
      | "force-no-store"
      | "default-no-store"
      | "only-no-store";
    runtime?: "edge" | "nodejs";
    preferredRegion?: "auto" | "global" | "home" | string[];
    maxDuration?: number;
  };
};

export type NextRoutesProcedure<TMeta = Record<string, unknown>> = Procedure<
  "query" | "mutation" | "subscription",
  ProcedureParams<
    RootConfig<{
      transformer: any;
      errorShape: any;
      ctx: any;
      meta: NextRoutesMeta<TMeta>;
    }>,
    any,
    any,
    any,
    any,
    any,
    NextRoutesMeta<TMeta>
  >
>;
