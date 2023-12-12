import { createTRPCRouter, publicProcedure } from "../trpc";
import ref from "./exampleb";

export const exampleRouter = createTRPCRouter({
  hello: publicProcedure.query(() => {
    return {
      hello: "world",
    };
  }),
  bye: publicProcedure.query(() => {
    return {
      bye: "world",
    };
  }),
  value: ref,
});
