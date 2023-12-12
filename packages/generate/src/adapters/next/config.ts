import type { AnyRouter } from "@trpc/server";
import type { FetchHandlerOptions } from "@trpc/server/adapters/fetch";

import { buildGenerator } from "./generator";

export type NextRoutesConfig<TRouter extends AnyRouter> = Omit<
  FetchHandlerOptions<TRouter>,
  "batching"
> & {
  endpoint: string;
};

export type NextRoutesResolvedConfig<TRouter extends AnyRouter> =
  NextRoutesConfig<TRouter> & {
    type: "next";
    $$generator: {
      build: (params: { configPath: string; cwd?: string }) => Promise<
        {
          code: string;
          filename: string;
        }[]
      >;
      clean: (params: { cwd?: string }) => Promise<void>;
    };
  };

export const createNextRoutesConfig = <TRouter extends AnyRouter>(
  config: NextRoutesConfig<TRouter>,
): NextRoutesResolvedConfig<TRouter> => {
  return {
    ...config,
    type: "next",
    $$generator: buildGenerator(config),
  };
};
