import { createTRPCRouter, publicProcedure } from "../trpc";

const ref = createTRPCRouter({
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
});

export default ref;
