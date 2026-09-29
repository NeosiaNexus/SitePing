import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { build, transformSync } from "esbuild";
import { describe, expect, it } from "vitest";
import { cssLiteralsPlugin, minifyCssLiterals, templateLiterals } from "../../scripts/css-literals.js";
import type * as Styles from "../../src/styles/base.js";
import { buildStyles } from "../../src/styles/base.js";
import { buildThemeColors } from "../../src/styles/theme.js";

const srcDir = fileURLToPath(new URL("../../src/", import.meta.url));
const sources = readdirSync(srcDir, { recursive: true, encoding: "utf8" })
  .filter((file) => file.endsWith(".ts"))
  .map((file) => ({ file, text: readFileSync(join(srcDir, file), "utf8") }));

/** The marked literal of a one-line source, minified. */
function minify(css: string): string {
  const out = minifyCssLiterals(`const a = /* css */ \`${css}\`;`);
  return out.slice(out.indexOf("`") + 1, out.lastIndexOf("`"));
}

/** esbuild's CSS minifier as the oracle: equal output means equal CSS. */
function canonical(css: string): string {
  return transformSync(css.includes("{") ? css : `a{${css}}`, { loader: "css", minify: true, logLevel: "silent" }).code;
}

/** A literal's CSS with each interpolation replaced by the same identifier on both sides. */
const withStandIns = (quasis: readonly string[]) => quasis.reduce((css, quasi, i) => `${css}x${i - 1}${quasi}`);

describe("minifyCssLiterals", () => {
  it("drops comments and indentation, keeping the whitespace CSS reads", () => {
    const css = `
      /* Banner */
      .a  .b :hover , .c > .d {
        border: 1px  solid red ;
        margin: calc( 1px + 2px ) 0 !important;
      }
      @media (min-width: 600px) and (hover: hover) {
        .e { color: red; }
      }
    `;
    expect(minify(css)).toBe(
      ".a .b :hover,.c > .d{border:1px solid red;margin:calc(1px + 2px) 0 !important;}" +
        "@media (min-width: 600px) and (hover: hover){.e{color:red;}}",
    );
    expect(canonical(minify(css))).toBe(canonical(css));
  });

  it("keeps quoted strings verbatim, interpolations inside them included", () => {
    expect(minify(`content: "  a  /* b */  " ; font-family: 'Inter' , system-ui; x: "\${q}  y";`)).toBe(
      `content:"  a  /* b */  ";font-family:'Inter',system-ui;x:"\${q}  y";`,
    );
  });

  it("keeps the space between a value and an interpolation, and nothing else", () => {
    expect(minify(`border: 1px solid \${c} ; color: \${a} \${b}; background: \${c}25;`)).toBe(
      `border:1px solid \${c};color:\${a} \${b};background:\${c}25;`,
    );
    expect(minify(`all: initial;\n  \${declarations}\n  /* next */\n  --x: 1;`)).toBe(
      `all:initial;\${declarations} --x: 1;`,
    );
  });

  it("keeps whitespace where CSS keeps the text as written", () => {
    // Custom property values, var() fallbacks and at-rule preludes: one space per run.
    const css = `
      .a {
        --a:  1px ,  2px ;
        b: var( --a ,  rgba(0, 0, 0, 0.5) ) calc(1px + 2px) ;
      }
      @supports not ( (a: b) or (c:d) ) {
        .b { c: d }
      }
    `;
    expect(minify(css)).toBe(
      ".a{--a: 1px , 2px ;b:var( --a , rgba(0, 0, 0, 0.5) ) calc(1px + 2px);}@supports not ( (a: b) or (c:d) ){.b{c:d}}",
    );
    expect(canonical(minify(css))).toBe(canonical(css));
  });

  it("keeps a comment that separates two tokens", () => {
    expect(minify("a/**/b{x:y}")).toBe("a/**/b{x:y}");
    expect(minify("a /**/b{x:y} a/**/ b{x:y} a/**/{x:y}")).toBe("a b{x:y}a b{x:y}a{x:y}");
  });

  it("copies interpolation code verbatim and leaves unmarked literals alone", () => {
    const source = [
      "const a = /* css */ `",
      // biome-ignore lint/suspicious/noTemplateCurlyInString: TypeScript source under test
      '  box-shadow: ${on ? "0 0  1px red" : `0 2px ${c}25,  0 1px x`};',
      "`;",
      "const b = `",
      "  keep:   this;",
      "`;",
    ].join("\n");
    const out = minifyCssLiterals(source);
    // biome-ignore lint/suspicious/noTemplateCurlyInString: TypeScript source under test
    expect(out).toContain('`box-shadow:${on ? "0 0  1px red" : `0 2px ${c}25,  0 1px x`};`');
    expect(out).toContain("const b = `\n  keep:   this;\n`;");
  });

  it("puts the removed line breaks back after the literal", () => {
    const source = ["const a = { style: /* css */ `", "  color: red;", "  top: 0;", "`, next: 1 };", "call();"].join(
      "\n",
    );
    expect(minifyCssLiterals(source).split("\n")).toEqual([
      "const a = { style: /* css */ `color:red;top:0;`",
      "",
      "",
      ", next: 1 };",
      "call();",
    ]);
  });

  it("rejects what it cannot minify safely, naming the literal", () => {
    const at = (css: string) => () => minifyCssLiterals(`\nconst a = /* css */ \`${css}\`;`, "x.ts");
    expect(at(String.raw`content: "\201C";`)).toThrow("x.ts:2: backslash escapes are not supported");
    expect(at(`content: "a;`)).toThrow("x.ts:2: unterminated CSS string");
    expect(at(`a { /* \${x} */ }`)).toThrow("x.ts:2: a CSS comment cannot span an interpolation");
    expect(() => minifyCssLiterals("const a = css /* css */ `a{}`;", "x.ts")).toThrow(
      "x.ts:1: /* css */ cannot mark a tagged template",
    );
  });
});

describe("the widget's CSS literals", () => {
  it("are all marked for minification", () => {
    const declaration = /^\s*-?[a-z][a-z-]*\s*:[^;{}]*;/m;
    const unmarked = sources.flatMap(({ file, text }) =>
      templateLiterals(text, file)
        .filter(({ marked, quasis }) => !marked && quasis.join("").includes("\n") && declaration.test(quasis.join("")))
        .map(({ line }) => `${file}:${line}`),
    );
    expect(unmarked, "multi-line CSS literals without a /* css */ marker").toEqual([]);
  });

  it("minify to the same CSS, literal by literal", () => {
    let compared = 0;
    for (const { file, text } of sources) {
      const before = templateLiterals(text, file).filter(({ marked }) => marked);
      const after = templateLiterals(minifyCssLiterals(text, file), file).filter(({ marked }) => marked);
      expect(after).toHaveLength(before.length);
      before.forEach((literal, i) => {
        const minified = after[i]?.quasis ?? [];
        expect(minified.join("").length, `${file}:${literal.line}`).toBeLessThanOrEqual(literal.quasis.join("").length);
        expect(canonical(withStandIns(minified)), `${file}:${literal.line}`).toBe(
          canonical(withStandIns(literal.quasis)),
        );
        compared++;
      });
    }
    expect(compared).toBeGreaterThanOrEqual(30);
  });

  it("keep every line outside a marked literal where it was", () => {
    for (const { file, text } of sources) {
      const lines = text.split("\n");
      const out = minifyCssLiterals(text, file).split("\n");
      expect(out, file).toHaveLength(lines.length);
      const literalLines = new Set(
        templateLiterals(text, file)
          .filter(({ marked }) => marked)
          .flatMap(({ start, end }) => {
            const first = text.slice(0, start).split("\n").length - 1;
            const last = text.slice(0, end).split("\n").length - 1;
            return Array.from({ length: last - first + 1 }, (_, k) => first + k);
          }),
      );
      lines.forEach((line, i) => {
        if (!literalLines.has(i)) expect(out[i], `${file}:${i + 1}`).toBe(line);
      });
    }
  });

  it("bundle into the source stylesheet, minified", async () => {
    const { outputFiles } = await build({
      stdin: { contents: 'export { buildStyles } from "./styles/base.ts";', resolveDir: srcDir, loader: "ts" },
      bundle: true,
      format: "iife",
      globalName: "styles",
      write: false,
      plugins: [cssLiteralsPlugin],
      logLevel: "silent",
    });
    const bundled = runInNewContext(`${outputFiles[0]?.text}\nstyles`) as typeof Styles;
    for (const theme of ["light", "dark"] as const) {
      const colors = buildThemeColors("#0066ff", theme);
      const shipped = bundled.buildStyles(colors);
      expect(shipped.length).toBeLessThan(buildStyles(colors).length * 0.75);
      expect(canonical(shipped)).toBe(canonical(buildStyles(colors)));
    }
  });
});
