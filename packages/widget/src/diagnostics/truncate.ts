/**
 * `text` cut to at most `maxLength` code units, the last one `…`. The cut
 * never splits a surrogate pair: half an emoji is a lone surrogate, which a
 * PostgreSQL `jsonb` column refuses — with it the whole feedback was lost.
 */
export function truncateWithEllipsis(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  let end = maxLength - 1;
  const last = text.charCodeAt(end - 1);
  if (last >= 0xd800 && last <= 0xdbff) end -= 1;
  return `${text.slice(0, end)}…`;
}
