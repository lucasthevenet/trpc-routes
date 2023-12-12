import type { NodePath } from "@babel/core";

function minIndent(s: string) {
  const match = s.match(/^[ \t]*(?=\S)/gm);

  if (!match) {
    return 0;
  }

  return match.reduce((r, a) => Math.min(r, a.length), Infinity);
}

function strip(s: string) {
  const indent = minIndent(s);

  if (indent === 0) {
    return s;
  }

  const regex = new RegExp(`^[ \\t]{${indent}}`, "gm");

  return s.replace(regex, "");
}

function deindent(code: string): string {
  const firstNewLine = code.indexOf("\n");

  return (
    code.slice(0, firstNewLine + 1) +
    // remove indentation from all lines except first.
    strip(code.slice(firstNewLine + 1))
  );
}

/**
 * Prints the given path without leading or trailing comments.
 */
export default function printValue(path: NodePath): string {
  let source = path.getSource();

  // variable declarations and interface/type/class members might end with one of these
  if (source.endsWith(",") || source.endsWith(";")) {
    source = source.slice(0, -1);
  }

  return deindent(source);
}
