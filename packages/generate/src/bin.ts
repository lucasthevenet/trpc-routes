#!/usr/bin/env node
import cac from "cac";

import { retrieveConfig } from "./core/config";
import { createContext } from "./core/context";

const cli = cac("trpc-routes");

interface GlobalCLIOptions {
  config?: string;
}

cli.option("-c, --config <file>", `[string] use specified config file`);

interface GenerateCLIOptions extends GlobalCLIOptions {
  // watch?: boolean;
  clean?: boolean;
}

cli
  .command("[root]", "generate routes")
  .alias("g")
  .alias("generate")
  // .option("-w, --watch", `[boolean] watch for changes`)
  .option("--clean", `[boolean] clean generated routes on rerun`)
  .action(async (_root: string, options: GenerateCLIOptions) => {
    const config = await retrieveConfig({
      configFile: options.config,
    });

    const ctx = createContext(config);

    await ctx.callHook("generate:routes", { clean: options.clean });
  });

cli.help();
// cli.version(VERSION);

cli.parse();
