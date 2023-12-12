import { next } from "@trpc-routes/treeshake/next";

/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import("./src/env.mjs");

// import plugin from "unplugin-glob/webpack"

/** @type {import("next").NextConfig} */
const config = next({});

export default config;
