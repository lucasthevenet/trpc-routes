import { resolve } from "path";
import { findAll, parse } from "tsconfck";
import type ts from "typescript";

export const getPathAliasesFromTSConfig = async (cwd: string) => {
  const [configPath] = await findAll(cwd);
  const result = await parse(configPath ?? "");

  if (result.tsconfigFile === null) {
    return {};
  }

  const config = result.tsconfig as { compilerOptions?: ts.CompilerOptions };
  const baseUrl = config.compilerOptions?.baseUrl;
  const paths = config.compilerOptions?.paths;
  const aliases: Record<string, string> = {};

  if (baseUrl && paths) {
    for (const [key, value] of Object.entries(paths)) {
      const alias = key.replace("/*", "");
      const path = value[0]?.replace("/*", "") ?? "";
      aliases[alias] = resolve(baseUrl, path);
    }
  }

  return aliases;
};
