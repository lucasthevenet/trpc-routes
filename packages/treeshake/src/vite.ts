import unplugin from ".";
import type { VitePlugin } from "unplugin"

export default unplugin.vite as (options?: unknown) => VitePlugin
