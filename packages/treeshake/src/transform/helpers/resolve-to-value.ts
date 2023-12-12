// Copied from react-docgen (https://github.com/reactjs/react-docgen/blob/main/packages/react-docgen/src/utils/resolveToValue.ts)

import type { NodePath } from "@babel/core";

import { toArray } from "./expression-to";
import getMemberExpressionRoot from "./get-member-expression";
import getPropertyValuePath from "./get-property-value-path";

// TODO: Maybe there is a better way to do this?
/**
 * If the path is an identifier, it is resolved in the scope chain.
 * If it is an assignment expression, it resolves to the right hand side.
 * If it is a member expression it is resolved to it's initialization value.
 *
 * Else the path itself is returned.
 */
export default function resolveToValue(path: NodePath): NodePath {
  if (path.isIdentifier()) {
    const binding = path.scope.getBinding(path.node.name);

    if (binding) {
      return resolveToValue(binding.path);
    }

    throw new ReferenceError(`Could not find reference for ${path.node.name}`);
  } else if (path.isVariableDeclarator()) {
    const init = path.get("init");

    if (init.hasNode()) {
      return resolveToValue(init);
    }
  } else if (path.isMemberExpression()) {
    const root = getMemberExpressionRoot(path);
    const resolved = resolveToValue(root);

    if (resolved.isObjectExpression()) {
      let propertyPath: NodePath | null = resolved;

      for (const propertyName of toArray(path).slice(1)) {
        if (propertyPath && propertyPath.isObjectExpression()) {
          propertyPath = getPropertyValuePath(propertyPath, propertyName);
        }
        if (!propertyPath) {
          return path;
        }
        propertyPath = resolveToValue(propertyPath);
      }

      return propertyPath;
    }
  }
  // else if (isSupportedDefinitionType(resolved)) {
  //       const property = path.get("property");

  //       if (property.isIdentifier() || property.isStringLiteral()) {
  //         const memberPath = getMemberValuePath(
  //           resolved,
  //           property.isIdentifier() ? property.node.name : property.node.value,
  //         );

  //         if (memberPath) {
  //           return resolveToValue(memberPath);
  //         }
  //       }
  //     } else if (
  //       resolved.isImportSpecifier() ||
  //       resolved.isImportDefaultSpecifier() ||
  //       resolved.isImportNamespaceSpecifier()
  //     ) {
  //       const declaration = resolved.parentPath as NodePath<ImportDeclaration>;

  //       // Handle references to namespace imports, e.g. import * as foo from 'bar'.
  //       // Try to find a specifier that matches the root of the member expression, and
  //       // find the export that matches the property name.
  //       for (const specifier of declaration.get("specifiers")) {
  //         const property = path.get("property");
  //         let propertyName: string | undefined;

  //         if (property.isIdentifier() || property.isStringLiteral()) {
  //           propertyName = getNameOrValue(property) as string;
  //         }

  //         if (
  //           specifier.isImportNamespaceSpecifier() &&
  //           root.isIdentifier() &&
  //           propertyName &&
  //           specifier.node.local.name === root.node.name
  //         ) {
  //           const resolvedPath = path.hub.import(declaration, propertyName);

  //           if (resolvedPath) {
  //             return resolveToValue(resolvedPath);
  //           }
  //         }
  //       }
  //     }
  //   }

  return path;
}
