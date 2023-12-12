import type { NodePath } from "@babel/core";
import type {
  ClassMethod,
  ClassProperty,
  Expression,
  ObjectExpression,
  ObjectMethod,
  ObjectProperty,
  ObjectTypeProperty,
  ObjectTypeSpreadProperty,
  SpreadElement,
  TSMethodSignature,
  TSPropertySignature,
} from "@babel/types";

import getNameOrValue from "./get-name-or-value";
import resolveToValue from "./resolve-to-value";

export const COMPUTED_PREFIX = "@computed#";

/**
 * In an ObjectExpression, the name of a property can either be an identifier
 * or a literal (or dynamic, but we don't support those). This function simply
 * returns the value of the literal or name of the identifier.
 */
export function getPropertyName(
  propertyPath: NodePath<
    | ClassMethod
    | ClassProperty
    | ObjectMethod
    | ObjectProperty
    | ObjectTypeProperty
    | ObjectTypeSpreadProperty
    | SpreadElement
    | TSMethodSignature
    | TSPropertySignature
  >,
): string | null {
  if (propertyPath.isObjectTypeSpreadProperty()) {
    const argument = propertyPath.get("argument");

    if (argument.isGenericTypeAnnotation()) {
      return getNameOrValue(argument.get("id")) as string;
    }

    return null;
  } else if (propertyPath.has("computed")) {
    const key = propertyPath.get("key") as NodePath<Expression>;

    // Try to resolve variables and member expressions
    if (key.isIdentifier() || key.isMemberExpression()) {
      const valuePath = resolveToValue(key);

      if (valuePath.isStringLiteral() || valuePath.isNumericLiteral()) {
        return `${valuePath.node.value}`;
      }
    }

    // generate name for identifier
    if (key.isIdentifier()) {
      return `${COMPUTED_PREFIX}${key.node.name}`;
    }

    if (key.isStringLiteral() || key.isNumericLiteral()) {
      return `${key.node.value}`;
    }

    return null;
  }

  return `${getNameOrValue(propertyPath.get("key") as NodePath)}`;
}

/**
 * Given an ObjectExpression, this function returns the path of the value of
 * the property with name `propertyName`. if the property is an ObjectMethod we
 * return the ObjectMethod itself.
 */
export default function getPropertyValuePath(
  path: NodePath<ObjectExpression>,
  propertyName: string,
): NodePath<Expression | ObjectMethod> | null {
  const property = path
    .get("properties")
    .find(
      (propertyPath) =>
        !propertyPath.isSpreadElement() &&
        getPropertyName(propertyPath) === propertyName,
    );

  if (property) {
    return property.isObjectMethod()
      ? property
      : (property.get("value") as NodePath<Expression>);
  }

  return null;
}
