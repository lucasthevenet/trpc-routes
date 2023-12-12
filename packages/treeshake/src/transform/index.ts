import type { PluginItem, PluginObj } from "@babel/core";
import { transformAsync } from "@babel/core";
import { declare } from "@babel/helper-plugin-utils";
import * as t from "@babel/types";

import resolveToValue from "./helpers/resolve-to-value";
import type { State } from "./helpers/treeshake";
import { trackProgram, treeShake } from "./helpers/treeshake";

export async function transform(params: {
  code: string;
  id: string;
  filters: { path: string; export: string }[];
}) {
  const { code, id, filters } = params;
  const plugins: PluginItem[] = [["@babel/plugin-syntax-typescript"]];
  plugins.push([
    babelPlugin,
    {
      filters,
    },
  ]);

  return transformAsync(code, {
    plugins,
    filename: id,
  });
}

const babelPlugin = declare<{
  filters: { path: string; export: string }[];
}>((api, options) => {
  api.assertVersion(7);

  const { filters } = options;

  const filterRecord = filters.reduce((acc, filter) => {
    if(acc[filter.path]) {
      acc[filter.path] = [];
    }
    acc[filter.path]!.push(filter.export);

    return acc;
  }, {} as Record<string, string[]>);

  const plugin: PluginObj = {
    name: "trpc-shake",
    visitor: {
      Program: {
        enter(path, state) {
          trackProgram(path, state as State);
          path.traverse({
            CallExpression(path, state) {
              if (t.isIdentifier(path.node.callee)) {
                if (path.node.callee.name === "treeshake$") {
                  transformTreeshake$(path, state as State);
                }
              }
            },
            ExportDeclaration(path) {
              if (filters.length === 0) return;

              const declaration = path.get("declaration") as babel.NodePath;

              // how to check if its export default?
              if (path.isExportDefaultDeclaration()) {
                const routerPaths = filterRecord.default ?? [];

                if (routerPaths.length === 0) return;

                const value = resolveToValue(declaration);

                return transformProcedureOrRouterOrMergeRouters({
                  path: value,
                  state: state as State,
                  filters: routerPaths,
                });
              }

              if (path.isExportNamedDeclaration()) {
                const declaration = path.get(
                  "declaration",
                ) as babel.NodePath<t.Declaration>;

                // do we need to handle other types of declarations?
                if (!declaration.isVariableDeclaration()) return;

                const declarations = declaration.get("declarations");

                const name = declarations[0]!.get(
                  "id",
                ) as babel.NodePath<t.Identifier>;

                const routerPaths = filterRecord[name.node.name] ?? [];

                if (routerPaths.length === 0) return;

                const value = resolveToValue(declarations[0]!);

                return transformProcedureOrRouterOrMergeRouters({
                  path: value,
                  state: state as State,
                  filters: routerPaths,
                });
              }
            },
          });
          treeShake(path, state as State);
        },
      },
    },
  };

  return plugin;
});

function transformProcedureOrRouterOrMergeRouters(params: {
  path: babel.NodePath;
  state: State;
  filters: string[];
}): void {
  const { path, state, filters } = params;
  if (path.isCallExpression()) {
    // if there is only 1 argument, we assume its a createRouter call
    if (path.node.arguments.length === 1) {
      return transformRouter({ path, state, filters });
    }

    if (path.node.arguments.length >= 2) {
      return transformMergeRouters({ path, state, filters });
    }
  }

  if (
    path.isImportSpecifier() ||
    path.isImportDefaultSpecifier() ||
    path.isImportNamespaceSpecifier()
  ) {
    return transformImportedRouter({ path, filters });
  }
}

function transformMergeRouters(params: {
  path: babel.NodePath<t.CallExpression>;
  state: State;
  filters: string[];
}): void {
  const { path, state, filters } = params;

  for (const arg of path.get("arguments")) {
    const router = resolveToValue(arg);

    if (router.isCallExpression()) {
      return transformProcedureOrRouterOrMergeRouters({
        path: router,
        state,
        filters,
      });
    }

    if (
      router.isImportSpecifier() ||
      router.isImportDefaultSpecifier() ||
      router.isImportNamespaceSpecifier()
    ) {
      return transformImportedRouter({ path: router, filters });
    }
  }
}

function transformRouter(params: {
  path: babel.NodePath<t.CallExpression>;
  state: State;
  filters: string[];
}) {
  const { path, state, filters } = params;

  if (path.node.arguments.length !== 1) {
    throw new Error("Expected a single argument to router");
  }

  const router = resolveToValue(path.get("arguments")[0]!);

  if (router.isObjectExpression()) {
    const properties = router.get("properties") as babel.NodePath[];

    properties.forEach((p) => {
      if (p.isObjectProperty()) {
        const key = p.get("key") as babel.NodePath;
        if (key.isIdentifier()) {
          const matchedFilters = filters.filter((f) =>
            f.startsWith(key.node.name),
          );

          if (matchedFilters.length === 0) {
            return p.remove();
          }

          const value = resolveToValue(p.get("value") as babel.NodePath);

          const newFilters = matchedFilters
            .map((f) => f.replace(key.node.name, "").replace(/^\./, ""))
            .filter((f) => f.length > 0);

          if (newFilters.length === 0) return;

          return transformProcedureOrRouterOrMergeRouters({
            path: value,
            state,
            filters: newFilters,
          });
        }
      }
    });
  }

  if (router.isImportSpecifier()) {
    console.log("imported router");
    transformImportedRouter({
      path: router,
      filters,
    });
  }
}

function transformTreeshake$(
  path: babel.NodePath<t.CallExpression>,
  state: State,
) {
  const args = path.get("arguments");

  if (args.length !== 2) {
    throw new Error(
      "Expected treeshake$ call to have 2 arguments but got " + args.length,
    );
  }

  const [router, routerPath] = args as [babel.NodePath, babel.NodePath];

  if (!routerPath.isStringLiteral()) {
    throw new Error(
      "Expected treeshake$ call to have a string literal as second argument",
    );
  }

  const routerValue = resolveToValue(router);

  const routerFilter = routerPath.node.value;

  if (
    routerValue.isImportSpecifier() ||
    routerValue.isImportDefaultSpecifier() ||
    routerValue.isImportNamespaceSpecifier()
  ) {
    return transformImportedRouter({
      path: routerValue,
      filters: [routerFilter],
    });
  }

  if (routerValue.isCallExpression()) {
    console.warn(
      "WARNING: you're calling treeshake$ on a router that is defined in the same file as said call. This can cause unexpected behaviors. To solve this, move the router to a separate file and import it.",
    );
    return transformProcedureOrRouterOrMergeRouters({
      path: routerValue,
      state,
      filters: [routerFilter],
    });
  }
}

function transformImportedRouter(params: {
  path:
    | babel.NodePath<t.ImportSpecifier>
    | babel.NodePath<t.ImportDefaultSpecifier>
    | babel.NodePath<t.ImportNamespaceSpecifier>;
  filters: string[];
}) {
  const { path, filters } = params;
  const importDeclaration = path.findParent((p) =>
    p.isImportDeclaration(),
  ) as babel.NodePath<t.ImportDeclaration>;
  const source = importDeclaration.get(
    "source",
  ) as babel.NodePath<t.StringLiteral>;
  const value = source.node.value;

  let exportName = "default";

  if (path.isImportSpecifier()) {
    const imported = path.get("imported") as babel.NodePath<t.Identifier>;
    exportName = imported.node.name;
  } else if (path.isImportDefaultSpecifier()) {
    exportName = "default";
  } else if (path.isImportNamespaceSpecifier()) {
    // I have no idea what kind of import this is
    return;
  }

  const filtersToAppend = filters.map((f) => {
    return {
      path: f,
      export: exportName,
    };
  });

  const searchParams = new URLSearchParams(value.split("?")[1]! ?? "");

  for (const filter of filtersToAppend) {
    searchParams.append("trpc", JSON.stringify(filter));
  }

  source.replaceWith(
    t.stringLiteral(value.split("?")[0] + "?" + searchParams.toString()),
  );
}
