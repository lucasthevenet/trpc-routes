import { dirname, relative, resolve } from "path";
import type { NodePath, PluginObj } from "@babel/core";
import { template, transformAsync } from "@babel/core";
import * as t from "@babel/types";

import type { NextRoutesMeta } from "..";

const buildImports = template.ast(
  `
  import type { NextRequest } from "next/server";
  import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
  import { treeshake$ } from "@trpc-routes/treeshake/runtime";
  `,
  {
    plugins: ["typescript"],
  },
);

const buildRouteSegmentConfig = template.statement(
  `export const CONFIG_NAME = CONFIG_VALUE;`,
);

const generateStatementsFromMeta = (meta: NextRoutesMeta["next"]) => {
  const result: t.Statement[] = [];

  if (!meta) return result;

  for (const [key, value] of Object.entries(meta)) {
    let values: Record<string, unknown> = {
      CONFIG_NAME: t.identifier(key),
      CONFIG_VALUE: t.stringLiteral(value.toString()),
    };
    switch (true) {
      case typeof value === "string":
        values = {
          CONFIG_NAME: t.identifier(key),
          CONFIG_VALUE: t.stringLiteral(value.toString()),
        };
        break;
      case typeof value === "number":
        values = {
          CONFIG_NAME: t.identifier(key),
          CONFIG_VALUE: t.numericLiteral(Number(value)),
        };
        break;
      case typeof value === "boolean":
        values = {
          CONFIG_NAME: t.identifier(key),
          CONFIG_VALUE: t.booleanLiteral(!!value),
        };
        break;
      case Array.isArray(value):
        values = {
          CONFIG_NAME: t.identifier(key),
          CONFIG_VALUE: t.arrayExpression(
            new Array(value).map((v) => t.stringLiteral(v.toString())),
          ),
        };
        break;
    }

    result.push(buildRouteSegmentConfig(values));
  }
  return result;
};

const buildHandler = template(
  `
  const handler = (req: NextRequest) =>
    fetchRequestHandler(%%handlerConfig%%);
  
  export { handler as GET, handler as POST };  
  `,
  {
    syntacticPlaceholders: true,
    plugins: ["typescript"],
  },
);

const buildTreeshake = template.expression(
  "treeshake$(ROUTER_NAME, PROCEDURE_PATH)",
);

function rewriteImport(params: {
  importPath: string;
  src: string;
  target: string;
}) {
  // rewrite relative import paths
  const { importPath, src, target } = params;

  if (!importPath.startsWith(".")) {
    return importPath;
  }

  const relativePath = resolve(dirname(src), importPath);

  const relativeToTarget = relative(dirname(target), relativePath);

  return relativeToTarget;
}

function transformImport(params: {
  path: NodePath<t.ImportDeclaration>;
  src: string;
  target: string;
}) {
  const { path, src, target } = params;

  // we remove the defineConfig import since it's not needed on the route file
  if (path.node.source.value.includes("@trpc-routes/generate")) {
    path.remove();
    return;
  }

  // we need to transform relative paths so they resolve correctly on the route file
  path.node.source.value = rewriteImport({
    importPath: path.node.source.value,
    src,
    target: target,
  });
}

function transformConfigToHandler(params: {
  path: NodePath<t.ExportDefaultDeclaration>;
  procedurePath: string;
}) {
  const { path, procedurePath } = params;
  let configCallExpression: t.CallExpression | undefined;

  // if it's a reference to a variable, we need to find the declaration
  if (t.isIdentifier(path.node.declaration)) {
    const binding = path.scope.getBinding(path.node.declaration.name);
    if (binding) {
      if (binding.path.isVariableDeclarator()) {
        const init = binding.path.get("init");
        if (init.hasNode() && init.isCallExpression()) {
          configCallExpression = init.node;
        }
      }
      binding.path.remove();
    }
  } // else it's a direct export
  else if (t.isCallExpression(path.node.declaration)) {
    configCallExpression = path.node.declaration;
  }

  const config = configCallExpression?.arguments[0];

  if (!configCallExpression || !config) {
    throw new Error("Could not retrieve config params");
  }

  if (!t.isObjectExpression(config)) {
    throw new Error(
      `Expected defineConfig argument to be an object, but got ${config.type}`,
    );
  }

  for (const property of config.properties) {
    if (!t.isObjectProperty(property)) {
      continue;
    }

    // wrap the router in treeshake function call
    if (t.isIdentifier(property.key) && property.key.name === "router") {
      property.value = buildTreeshake({
        ROUTER_NAME: property.value,
        PROCEDURE_PATH: t.stringLiteral(procedurePath),
      });
    }
  }
  // add request parameter to the handler
  config.properties.unshift(
    t.objectProperty(t.identifier("req"), t.identifier("req"), false, true),
  );

  // disable batching
  config.properties.push(
    t.objectProperty(
      t.identifier("batching"),
      t.objectExpression([
        t.objectProperty(t.identifier("enabled"), t.booleanLiteral(false)),
      ]),
    ),
  );

  const program = path.findParent((p) => p.isProgram()) as NodePath<t.Program>;

  // add the handler code
  program.pushContainer(
    "body",
    buildHandler({
      handlerConfig: configCallExpression.arguments[0],
    }),
  );

  // remove the originial config export
  path.remove();
}

function addRouteSegmentConfigs(
  path: NodePath<t.Program>,
  meta: NextRoutesMeta["next"],
) {
  // add statements after last import
  const afterLastImport = path
    .get("body")
    .find((p) => !p.isImportDeclaration());
  if (afterLastImport) {
    return afterLastImport.insertBefore(generateStatementsFromMeta(meta));
  }
  return path.pushContainer("body", generateStatementsFromMeta(meta));
}

function addRouteImports(path: NodePath<t.Program>) {
  return path.unshiftContainer("body", buildImports);
}

export async function transformConfigFileToRouteHandlerFile(params: {
  code: string;
  procedurePath: string;
  procedureMeta: NextRoutesMeta["next"];
  configPath: string;
  targetPath: string;
}) {
  const { code, configPath, targetPath, procedurePath, procedureMeta } = params;

  const plugin: PluginObj = {
    visitor: {
      Program: {
        enter(programPath) {
          programPath.traverse({
            ImportDeclaration(path) {
              transformImport({
                path,
                src: configPath,
                target: targetPath,
              });
            },
            ExportDefaultDeclaration(path) {
              transformConfigToHandler({
                path,
                procedurePath,
              });
            },
          });
        },
        exit(programPath) {
          addRouteImports(programPath);
          addRouteSegmentConfigs(programPath, procedureMeta);
        },
      },
    },
  };

  const result = await transformAsync(code, {
    plugins: ["@babel/plugin-syntax-typescript", [plugin]],
  });

  if (!result?.code) {
    throw new Error("Could not parse config file");
  }

  return result.code;
}
