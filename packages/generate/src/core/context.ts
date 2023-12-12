import fs from "fs";
import path from "path";
import type { ResolvedConfig } from "c12";
import { consola } from "consola";
import { createHooks } from "hookable";
import type { Hookable } from "hookable";

import type { AnyRoutesConfig } from "./config";
import type { PluginHooks } from "./types";

export interface Context {
  options: ResolvedConfig<AnyRoutesConfig>;
  hooks: Hookable<PluginHooks>;
  hook: Context["hooks"]["hook"];
  callHook: Context["hooks"]["callHook"];
  addHooks: Context["hooks"]["addHooks"];
}

let setup = true;

export function createContext(options: ResolvedConfig<AnyRoutesConfig>) {
  const hooks = createHooks<PluginHooks>();

  const context: Context = {
    options,
    hooks,
    callHook: (...args) => hooks.callHook(...args),
    addHooks: (configHooks) => hooks.addHooks(configHooks),
    hook: (name, fn, opts) => hooks.hook(name, fn, opts),
  };

  context.hook("generate:routes", async ({ clean }) => {
    if (setup) {
      setup = false;
      const config = context.options.config!;
      const { $$generator } = config;

      if (clean) {
        consola.start("Cleaning previous routes...");
        await $$generator.clean({
          cwd: context.options.cwd,
        });
        consola.success("Cleaned previous routes!");
      }

      consola.start(
        `Generating routes using config: ${context.options.configFile}`,
      );

      const files = await $$generator.build({
        configPath: context.options.configFile!,
        cwd: context.options.cwd,
      });

      consola.success(`Generated ${files.length} routes!`);

      consola.start("Writing routes to folder...");

      for (const { filename, code } of files) {
        if (!fs.existsSync(path.dirname(filename))) {
          fs.mkdirSync(path.dirname(filename), {
            recursive: true,
          });
        }

        await fs.promises.writeFile(filename, code, "utf-8");
      }

      consola.success("Finished writing routes");
    }
  });

  return context;
}
