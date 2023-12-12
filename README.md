<div align="center">
  <h1>trpc-routes</h1>
  <a href="https://www.npmjs.com/package/@trpc-routes/treeshake"><img src="https://img.shields.io/npm/v/@trpc-routes/treeshake.svg?style=flat&color=brightgreen" target="_blank" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-black" /></a>
  <a href="https://trpc.io/discord" target="_blank"><img src="https://img.shields.io/badge/chat-discord-blue.svg" /></a>
  <br />
  <hr />
</div>

## **TODO**

- [ ] Improve router traversing
- [ ] Test on other platforms (vite, rollup)
- [ ] Investigate wheter it's posible to have "virtual routes" on nextjs to not have to generate route files

## **Route treeshaking and generation support for [tRPC](https://trpc.io/)**

- Allows you to treeshake your routers and remove unused procedures.
- Route handler generator allows you to specify handler config for each procedure separately.
- Ideal for big procedures where you get an unnecessarily slow initial load.

## Router treeshake plugin usage

**1. Install `@trpc-routes/treeshake`.**

```bash
# npm
npm install --save-dev @trpc-routes/treeshake
# yarn
yarn add @trpc-routes/treeshake
# pnpm
pnpm add --save-dev @trpc-routes/treeshake
```

**2. Add plugin to your nextjs/vite/etc config.**

```typescript
import { next } from "@trpc-routes/treeshake/next";

/** @type {import("next").NextConfig} */
const config = next({}); /* 👈 */

export default config;
```

**3. Use treeshake$ on a router.**

```typescript
const appRouter = t.router({
  sayHello: t.procedure
    .query(({ input }) => {
      return { greeting: `Hello ${input.name}!` };
    });
  bye: t.procedure
    .query(({ input }) => {
      return { response: `Bye ${input.name}!` };
    });
});

console.log(treeshake$(appRouter, 'sayHello')) /* 👈 output will remove all procedures except sayHello */
```

## Route generation usage

**1. Install `@trpc-routes/generate`.**

```bash
# npm
npm install --save-dev @trpc-routes/generate
# yarn
yarn add @trpc-routes/generate
# pnpm
pnpm add --save-dev @trpc-routes/generate
```

**2. Add `NextRoutesMeta` to your tRPC instance.**

```typescript
import { initTRPC } from '@trpc/server';
import { NextRoutesMeta } from '@trpc-routes/generate/adapters/next';

const t = initTRPC.meta<NextRoutesMeta>().create(); /* 👈 */
```

**3. Add config options for a procedure.**

```typescript
export const appRouter = t.router({
  sayHello: t.procedure
    .meta({ /* 👉 */ next: { runtime: 'edge', revalidate: 3600 } })
    .input(z.object({ name: z.string() }))
    .output(z.object({ greeting: z.string() }))
    .query(({ input }) => {
      return { greeting: `Hello ${input.name}!` };
    });
});
```

**4. Define trpc-routes.config.ts.**

```typescript
import { createNextRoutesConfig } from "@trpc-routes/generate/adapters/next";

import { createTRPCContext } from "~/server/api/trpc";
import { appRouter } from "~/server/api/root";

/* 👇 */
export default createNextRoutesConfig({
  router: appRouter,
  endpoint: "/api/trpc",
  createContext: createTRPCContext,
  onError: ({ path, error }) => {
    console.error(`❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`);
  },
});
```

**5. Run route generation.**

```bash
$ trpc-routes generate
```

**Example of generated code**

```typescript
// /app/(generated)/api/trpc/example.hello/route.ts
import type { NextRequest } from "next/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { treeshake$ } from "@trpc-routes/treeshake/runtime";
import { createTRPCContext } from "~/server/api/trpc";
import { appRouter } from "~/server/api/root";

export const runtime = "edge";

const handler = (req: NextRequest) => fetchRequestHandler({
  req,
  router: treeshake$(appRouter, "example.hello"),
  endpoint: "/api/trpc",
  createContext: createTRPCContext,
  onError: ({
    path,
    error
  }) => {
    console.error(`❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`);
  },
  batching: {
    enabled: false
  }
});

export { handler as GET, handler as POST };
```

---

## License

Distributed under the MIT License. See LICENSE for more information.

## Mentions

Built with [create-t3-turbo](https://github.com/t3-oss/create-t3-turbo) starter project
