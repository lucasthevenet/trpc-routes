import type { PluginPass } from "@babel/core";
import * as t from "@babel/types";

export interface State extends PluginPass {
  refs: Set<unknown>;
}

export function trackProgram(path: babel.NodePath, state: State) {
  state.refs = new Set();

  path.traverse(
    {
      VariableDeclarator(variablePath, variableState) {
        if (variablePath.node.id.type === "Identifier") {
          const local = variablePath.get("id");
          if (isIdentifierReferenced(local)) {
            variableState.refs.add(local);
          }
        } else if (variablePath.node.id.type === "ObjectPattern") {
          const pattern = variablePath.get("id");
          const properties = pattern.get(
            "properties",
          ) as babel.NodePath<babel.types.Node>[];
          properties.forEach((p) => {
            const local = p.get(
              p.node.type === "ObjectProperty"
                ? "value"
                : p.node.type === "RestElement"
                  ? "argument"
                  : (() => {
                      throw new Error("invariant");
                    })(),
            ) as babel.NodePath<babel.types.Node>;

            if (isIdentifierReferenced(local)) {
              variableState.refs.add(local);
            }
          });
        } else if (variablePath.node.id.type === "ArrayPattern") {
          const pattern = variablePath.get("id");
          const elements = pattern.get(
            "elements",
          ) as babel.NodePath<babel.types.Node>[];
          elements.forEach((e) => {
            let local: babel.NodePath;

            if (e.node && e.node.type === "Identifier") {
              local = e;
            } else if (e.node && e.node.type === "RestElement") {
              local = e.get("argument") as babel.NodePath;
            } else {
              return;
            }

            if (isIdentifierReferenced(local)) {
              variableState.refs.add(local);
            }
          });
        }
      },
      FunctionDeclaration: markFunction,
      FunctionExpression: markFunction,
      ArrowFunctionExpression: markFunction,
      ImportSpecifier: markImport,
      ImportDefaultSpecifier: markImport,
      ImportNamespaceSpecifier: markImport,
    },
    state,
  );
}

export function treeShake(path: babel.NodePath, state: State) {
  const refs = state.refs;

  let count = 0;

  function shouldRemove(node: babel.NodePath<t.Node>) {
    return refs.has(node) && !isIdentifierReferenced(node);
  }

  function sweepFunction(sweepPath: babel.NodePath<t.Function>) {
    const ident = getIdentifier(sweepPath) as babel.NodePath<t.Identifier>;
    if (ident?.node && shouldRemove(ident)) {
      ++count;
      if (
        t.isAssignmentExpression(sweepPath.parentPath as t.Node) ||
        t.isVariableDeclarator(sweepPath.parentPath as t.Node)
      ) {
        sweepPath.parentPath.remove();
      } else {
        sweepPath.remove();
      }
    }
  }

  function sweepImport(
    sweepPath: babel.NodePath<
      t.ImportSpecifier | t.ImportDefaultSpecifier | t.ImportNamespaceSpecifier
    >,
  ) {
    const local = sweepPath.get("local");
    if (shouldRemove(local)) {
      ++count;
      sweepPath.remove();
    }
  }

  do {
    path.scope.crawl();
    count = 0;
    path.traverse({
      VariableDeclarator(variablePath) {
        if (variablePath.node.id.type === "Identifier") {
          const local = variablePath.get("id");
          if (shouldRemove(local)) {
            ++count;
            variablePath.remove();
          }
        } else if (variablePath.node.id.type === "ObjectPattern") {
          const pattern = variablePath.get("id");
          const beforeCount = count;
          const properties = pattern.get("properties") as babel.NodePath[];
          properties.forEach((p) => {
            const local = p.get(
              p.node.type === "ObjectProperty"
                ? "value"
                : p.node.type === "RestElement"
                  ? "argument"
                  : (() => {
                      throw new Error("invariant");
                    })(),
            ) as babel.NodePath;

            if (shouldRemove(local)) {
              ++count;
              p.remove();
            }
          });
          if (
            beforeCount !== count &&
            (pattern.get("properties") as babel.NodePath[]).length < 1
          ) {
            variablePath.remove();
          }
        } else if (variablePath.node.id.type === "ArrayPattern") {
          const pattern = variablePath.get("id");
          const beforeCount = count;
          const elements = pattern.get("elements") as babel.NodePath[];
          for (const e of elements) {
            let local: babel.NodePath;

            if (e.node && e.node.type === "Identifier") {
              local = e;
            } else if (e.node && e.node.type === "RestElement") {
              local = e.get("argument") as babel.NodePath;
            } else {
              return;
            }
            if (shouldRemove(local)) {
              ++count;
              e.remove();
            }
          }
          if (
            beforeCount !== count &&
            (pattern.get("elements") as babel.NodePath[]).length < 1
          ) {
            variablePath.remove();
          }
        }
      },
      FunctionDeclaration: sweepFunction,
      FunctionExpression: sweepFunction,
      ArrowFunctionExpression: sweepFunction,
      ImportSpecifier: sweepImport,
      ImportDefaultSpecifier: sweepImport,
      ImportNamespaceSpecifier: sweepImport,
    });
  } while (count);
}

function getIdentifier(path: babel.NodePath) {
  const parentPath = path.parentPath!;
  if (t.isVariableDeclarator(parentPath.node)) {
    const pp = parentPath;
    const name = pp.get("id") as babel.NodePath;
    return name.node.type === "Identifier" ? name : null;
  }
  if (t.isAssignmentExpression(parentPath.node)) {
    const pp = parentPath;
    const name = pp.get("left") as babel.NodePath;
    return name.node.type === "Identifier" ? name : null;
  }
  if (t.isArrowFunctionExpression(path.node)) {
    return null;
  }

  if ("id" in path.node && t.isIdentifier(path.node.id)) {
    return path.get("id");
  }

  return null;
}

function isIdentifierReferenced(ident: babel.NodePath<t.Node>) {
  if (!("name" in ident.node)) return false;
  const b = ident.scope.getBinding(ident.node.name as string);
  if (b && b.referenced) {
    if (b.path.type === "FunctionDeclaration") {
      return !b.constantViolations
        .concat(b.referencePaths)
        .every((ref) => ref.findParent((p) => p === b.path));
    }
    return true;
  }
  return false;
}
function markFunction(path: babel.NodePath<t.Function>, state: State) {
  const ident = getIdentifier(path) as babel.NodePath<t.Identifier> | null;
  if (ident?.node && isIdentifierReferenced(ident)) {
    state.refs.add(ident);
  }
}

function markImport(path: babel.NodePath, state: State) {
  const local = path.get("local");
  // if (isIdentifierReferenced(local)) {
  state.refs.add(local);
  // }
}
