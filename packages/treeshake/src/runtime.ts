import type { AnyRouter } from "@trpc/server";

export const treeshake$ = <TRouter extends AnyRouter>(
  router: TRouter,
  _path: string,
) => {
  return router;
};
