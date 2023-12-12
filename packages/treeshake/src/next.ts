/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
import webpack from "./webpack";

export const next = (
  nextConfig: Record<string, unknown> = {},
  // overrideOptions: Record<string, unknown> = {},
) => {
  return {
    ...nextConfig,
    webpack(
      config: Record<string, any>,
      webpackOptions: Record<string, unknown>,
    ) {
      config.plugins.unshift(webpack({}));

      if (typeof nextConfig.webpack === "function") {
        return nextConfig.webpack(config, webpackOptions);
      }

      return config;
    },
  };
};
