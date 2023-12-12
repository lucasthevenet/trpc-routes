import { readFile } from "fs/promises";
import { resolve } from "path";
import { beforeEach, describe, expect, it } from "vitest";

import { transform } from "../src/transform";

interface TestContext {
  code: string;
  id: string;
}

describe("transform", () => {
  beforeEach<TestContext>(async (ctx) => {
    ctx.id = resolve(__dirname, "./fixtures/trpc/routers/example.ts");
    ctx.code = await readFile(ctx.id, "utf-8");
  });

  it<TestContext>("should work", async (ctx) => {
    const result = await transform({
      code: ctx.code,
      id: ctx.id,
      filters: [
        {
          path: "value.hello",
          export: "exampleRouter",
        },
      ],
    });

    const code = result?.code;

    console.log(code);
    expect(true).toBe(true);
  });
});
