import type { VitePlugin } from "unplugin";

import unplugin from ".";

export default unplugin.vite as (options?: unknown) => VitePlugin;
