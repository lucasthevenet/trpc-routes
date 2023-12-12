import type { AnyRouter } from "@trpc/server";
import { loadConfig } from "c12";

import type { NextRoutesResolvedConfig } from "../adapters/next/config";
import { getPathAliasesFromTSConfig } from "../utils/get-paths-alias";

export type AnyRoutesConfig = NextRoutesResolvedConfig<AnyRouter>;

export interface ResolveConfigOptions {
  configFile?: string;
}

export const retrieveConfig = async (opts: ResolveConfigOptions) => {
  const { configFile } = opts;
  const alias = await getPathAliasesFromTSConfig(process.cwd());

  const result = await loadConfig<AnyRoutesConfig>({
    name: "trpc-routes",
    configFile,
    jitiOptions: {
      alias: alias,
      esmResolve: true,
    },
  });

  if (!result.config) throw new Error("No config found");

  return result;
};
