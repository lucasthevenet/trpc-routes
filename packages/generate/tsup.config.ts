import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts", "src/bin.ts", "src/adapters/*/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
  },
]);
