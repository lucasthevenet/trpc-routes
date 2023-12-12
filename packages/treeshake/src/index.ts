import { createUnplugin } from "unplugin";

import { transform } from "./transform";

export default createUnplugin(() => {
  return {
    name: "@trpc-routes/treeshake",
    enforce: "pre",
    transformInclude(id) {
      const [path] = id.split("?");

      return /\.[jt]s$/.test(path!);
    },
    async transform(code, id) {
      const params = new URLSearchParams(id.split("?")[1] ?? "");
      const filters = params
        .getAll("trpc")
        .map((v) => JSON.parse(v) as { path: string; export: string });

      const result = await transform({ code, id, filters });

      return result?.code ?? null;
    },
  };
});
