import fs from "node:fs";
import path from "node:path";
import type { AnyProcedure, AnyRouter } from "@trpc/server";

import type { NextRoutesConfig, NextRoutesProcedure } from "..";
import { transformConfigFileToRouteHandlerFile } from "./transform";

function hasSrcFolder(cwd: string) {
  return fs.existsSync(path.join(cwd, "src"));
}

async function generateProcedure(params: {
  procedurePath: string;
  configPath: string;
  endpoint: string;
  cwd?: string;
  procedure: NextRoutesProcedure;
}) {
  const {
    procedurePath,
    procedure,
    configPath,
    endpoint,
    cwd = process.cwd(),
  } = params;

  const configSource = await fs.promises.readFile(configPath, "utf-8");

  let appDir;
  if (hasSrcFolder(cwd)) {
    appDir = path.join(cwd, "src", "app");
  } else {
    appDir = path.join(cwd, "app");
  }

  const filename = path.join(
    appDir,
    "(generated)",
    endpoint,
    procedurePath,
    "route.ts",
  );

  const code = await transformConfigFileToRouteHandlerFile({
    code: configSource,
    procedurePath: procedurePath,
    procedureMeta: procedure._def.meta?.next,
    configPath: configPath,
    targetPath: filename,
  });

  return {
    filename,
    code,
  };
}

export const buildGenerator = <TRouter extends AnyRouter>(
  opts: NextRoutesConfig<TRouter>,
) => {
  const { router } = opts;
  return {
    build: async (params: {
      configPath: string;
      cwd?: string;
    }): Promise<{ code: string; filename: string }[]> => {
      const files: { code: string; filename: string }[] = [];
      for (const [procedurePath, procedure] of Object.entries(
        router._def.procedures as Record<string, AnyProcedure>,
      )) {
        const result = await generateProcedure({
          procedurePath,
          procedure,
          endpoint: opts.endpoint,
          configPath: params.configPath,
          cwd: params.cwd,
        });
        files.push(result);
      }
      return files;
    },

    clean: async (params: { cwd?: string }) => {
      const { cwd = process.cwd() } = params;

      let appDir;
      if (hasSrcFolder(cwd)) {
        appDir = path.join(cwd, "src", "app");
      } else {
        appDir = path.join(cwd, "app");
      }

      const generatedDir = path.join(appDir, "(generated)");

      if (fs.existsSync(generatedDir)) {
        await fs.promises.rm(generatedDir, {
          recursive: true,
        });
      }
    },
  };
};
