import { createTRPCRouter, publicProcedure } from "../trpc";

const exampleRouter = createTRPCRouter({
  hello: publicProcedure.query(() => {
    return {
      hello: "world",
    };
  }),
});

export default exampleRouter;
