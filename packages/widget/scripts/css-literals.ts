import { readFile } from "node:fs/promises";
import type { Plugin } from "esbuild";
import ts from "typescript";

// The widget writes its CSS — the Shadow DOM stylesheet and the inline styles
// of the elements it mounts on the host page — as template literals, which
// the JS minifier ships verbatim: comments, indentation and all. A literal
// marked with a leading `/* css */` comment is minified here instead, before
// esbuild compiles the file. Only comments and insignificant whitespace go:
// interpolations stay where they are and every CSS token is kept as written.
// The line breaks taken out of a literal are put back right after it, so the
// code that follows keeps its line numbers in the source maps.

const MARKER = "/* css */";
const WHITESPACE = new Set([" ", "\t", "\n", "\r", "\f"]);
// Whitespace after or before these never changes the CSS token stream. `:`
// only counts on its right: the space in `.a :hover` is a combinator.
const TIGHT_AFTER = new Set(["{", "}", ";", ",", ":", "("]);
const TIGHT_BEFORE = new Set(["{", "}", ";", ",", ")"]);
// Stand-ins for `last` where no CSS character precedes (never a single char).
const START = "start";
const INTERPOLATION = "interpolation";

/** Minify the raw text around a literal's interpolations, in order. */
function minifyCss(quasis: readonly string[]): string[] {
  let quote = "";
  let last = START;
  let space = false;
  // The statement being written, to spot at-rule preludes, custom property
  // values and `var()` fallbacks: CSS keeps those as written, so each run of
  // whitespace in them stays, as one space (`@supports (a: b)`, `--a: 1px, 2px`,
  // `var(--a, 1px, 2px)`).
  let statement = "";
  let prelude = false;
  let custom = false;
  let fallback = 0;
  const tightAfter = () => last === START || TIGHT_AFTER.has(last);
  const keepSpace = (next: string) =>
    custom || fallback > 0 || (prelude ? next !== "{" : !tightAfter() && !TIGHT_BEFORE.has(next));

  return quasis.map((raw, index) => {
    const final = index === quasis.length - 1;
    if (index > 0) {
      last = INTERPOLATION;
      statement = "";
    }
    let out = "";
    for (let i = 0; i < raw.length; i++) {
      const c = raw.charAt(i);
      // `\\` is a template escape in the raw text and a CSS escape once cooked.
      if (c === "\\") throw new Error("backslash escapes are not supported");
      if (quote) {
        out += c;
        if (c === quote) {
          quote = "";
          last = c;
        }
        continue;
      }
      if (WHITESPACE.has(c)) {
        space = true;
        continue;
      }
      if (c === "/" && raw.charAt(i + 1) === "*") {
        const close = raw.indexOf("*/", i + 2);
        if (close === -1) throw new Error("a CSS comment cannot span an interpolation");
        const next = raw.charAt(close + 2);
        const nextIsBoundary = next === "" ? final : WHITESPACE.has(next) || TIGHT_BEFORE.has(next);
        // The comment in `a/**/b` separates two tokens: dropping it would merge them.
        if (!space && !tightAfter() && !nextIsBoundary) {
          out += raw.slice(i, close + 2);
          last = "/";
        }
        i = close + 1;
        continue;
      }
      if (space && keepSpace(c)) out += " ";
      space = false;
      out += c;
      last = c;
      if (c === "{" || c === "}" || c === ";") {
        statement = "";
        prelude = custom = false;
        fallback = 0;
        continue;
      }
      statement += c;
      if (c === '"' || c === "'") quote = c;
      else if (c === "@" && statement === "@") prelude = true;
      else if (c === ":" && statement.startsWith("--")) custom = true;
      else if (c === "(" && (fallback > 0 || statement.endsWith("var("))) fallback++;
      else if (c === ")" && fallback > 0) fallback--;
    }
    if (!final) {
      if (space && keepSpace(INTERPOLATION)) out += " ";
      space = false;
    } else if (quote) {
      throw new Error("unterminated CSS string");
    }
    return out;
  });
}

/** An untagged template literal: its raw text around each interpolation. */
export interface TemplateLiteral {
  start: number;
  end: number;
  line: number;
  marked: boolean;
  quasis: string[];
  interpolations: string[];
}

/**
 * The untagged template literals of a TypeScript source, in order. A marked
 * literal's interpolations are not searched: its text is replaced as a whole.
 */
export function templateLiterals(source: string, fileName = "source.ts"): TemplateLiteral[] {
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  const literals: TemplateLiteral[] = [];
  const isMarked = (node: ts.Node) => source.slice(node.pos, node.getStart(file)).trimEnd().endsWith(MARKER);
  const visit = (node: ts.Node): void => {
    const line = () => file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1;
    if (ts.isTaggedTemplateExpression(node)) {
      if (isMarked(node.template)) {
        throw new Error(
          `${fileName}:${line()}: ${MARKER} cannot mark a tagged template (the tag would get minified strings)`,
        );
      }
      // The tag reads the strings itself: its literal is never a candidate.
      ts.forEachChild(node, (child) => (child === node.template ? ts.forEachChild(child, visit) : visit(child)));
      return;
    }
    if (ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node)) {
      const literal: TemplateLiteral = {
        start: node.getStart(file),
        end: node.end,
        line: line(),
        marked: isMarked(node),
        quasis: [],
        interpolations: [],
      };
      if (ts.isNoSubstitutionTemplateLiteral(node)) {
        literal.quasis.push(source.slice(literal.start + 1, node.end - 1));
      } else {
        literal.quasis.push(source.slice(literal.start + 1, node.head.end - 2));
        let from = node.head.end;
        for (const { literal: part } of node.templateSpans) {
          const start = part.getStart(file);
          literal.interpolations.push(source.slice(from, start));
          literal.quasis.push(source.slice(start + 1, part.end - (ts.isTemplateTail(part) ? 1 : 2)));
          from = part.end;
        }
      }
      literals.push(literal);
      if (literal.marked) return;
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return literals;
}

const lineBreaks = (texts: readonly string[]) => texts.join("").split("\n").length - 1;

/** Minify every `/* css *\/`-marked template literal of a TypeScript source. */
export function minifyCssLiterals(source: string, fileName = "source.ts"): string {
  if (!source.includes(MARKER)) return source;
  return templateLiterals(source, fileName).reduceRight(
    (text, { start, end, line, marked, quasis, interpolations }) => {
      if (!marked) return text;
      let minified: string[];
      try {
        minified = minifyCss(quasis);
      } catch (error) {
        throw new Error(`${fileName}:${line}: ${(error as Error).message}`);
      }
      const body = minified.map((quasi, i) => (i === 0 ? quasi : `\${${interpolations[i - 1]}}${quasi}`)).join("");
      const literal = `\`${body}\`${"\n".repeat(lineBreaks(quasis) - lineBreaks(minified))}`;
      return text.slice(0, start) + literal + text.slice(end);
    },
    source,
  );
}

/** esbuild plugin running {@link minifyCssLiterals} over the TypeScript files it loads. */
export const cssLiteralsPlugin: Plugin = {
  name: "minify-css-literals",
  setup(build) {
    build.onLoad({ filter: /\.ts$/ }, async (args) => {
      const source = await readFile(args.path, "utf8");
      if (!source.includes(MARKER)) return undefined;
      return { contents: minifyCssLiterals(source, args.path), loader: "ts" };
    });
  },
};
