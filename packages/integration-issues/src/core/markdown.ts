/**
 * Visitor text, rendered where Markdown cannot act on it. Feedback fields
 * are typed by anonymous visitors: raw in an issue, `@user` or `@org/team`
 * would notify, `#12` would cross-link, `<!--` would hide the rest of the
 * body and `[x](…)` or `![](…)` would render links and remote images. GitHub
 * and GitLab process none of that inside code spans and fenced blocks.
 */

const longestBacktickRun = (text: string): number =>
  (text.match(/`+/g) ?? []).reduce((longest, run) => Math.max(longest, run.length), 0);

/** Multi-line text as a fenced block, its fence longer than any backtick run inside. */
export function codeBlock(text: string): string {
  const fence = "`".repeat(Math.max(3, longestBacktickRun(text) + 1));
  return `${fence}text\n${text}\n${fence}`;
}

/**
 * Single-line text as a code span. Line breaks collapse to spaces: block
 * structure is parsed before code spans, so a line break would let the next
 * line start a heading or a list.
 */
export function codeSpan(text: string): string {
  const value = text.replace(/\s*[\r\n]+\s*/g, " ");
  const delimiter = "`".repeat(longestBacktickRun(value) + 1);
  // A space on both sides is stripped by the parser, and keeps an edge
  // backtick from merging with the delimiter.
  const padded = /^[` ]|[` ]$/.test(value) ? ` ${value} ` : value;
  return `${delimiter}${padded}${delimiter}`;
}

/**
 * Plain-text issue titles still render references: `@user` mentions, `#12`
 * and `GH-12` on GitHub, and GitLab's `!12` (merge request), `&12` (epic),
 * `~label`, `%milestone` and `$12` (snippet). GitLab also autolinks the URLs
 * in a title, then resolves one pointing at an issue, merge request or commit
 * as a reference. A zero-width space after each sigil, and inside each `://`,
 * defuses them. Bare commit SHAs are left alone: GitLab
 * only links those of the project's own commits, and splitting every 7-to-40
 * character hex word would also break order numbers and error codes.
 */
export function defuseReferences(text: string): string {
  return text.replace(/[@#!&~%$]|\bGH-|:(?=\/\/)/gi, "$&\u200B");
}
