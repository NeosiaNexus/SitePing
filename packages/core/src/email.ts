/**
 * The one email pattern every Siteping surface validates against.
 *
 * The widget's identity modal and the HTTP handler's schema used to disagree
 * (a permissive regex on one side, an ASCII-only default on the other), so an
 * address the modal accepted — and persisted in localStorage for good — came
 * back as a 400 on every submission afterwards. One pattern, imported on both
 * sides, makes that drift impossible.
 *
 * Deliberately Unicode-aware: internationalised local parts and domains
 * (`françois@exemple.fr`, `user@münchen.de`) are real addresses and common in
 * the audience this widget serves. Structure follows the usual rules — a
 * local part of 1 to 64 characters with no leading, trailing or doubled dot,
 * dot-separated domain labels of at most 63 characters that neither start nor
 * end with a hyphen, and a final label of at least two characters.
 */
export const EMAIL_PATTERN =
  /^(?!\.)(?!.*\.\.)[\p{L}\p{N}!#$%&'*+/=?^_`{|}~.-]{0,63}[\p{L}\p{N}!#$%&'*+/=?^_`{|}~-]@(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?\.)+[\p{L}\p{N}-]{2,63}$/u;

/** Whether `value` is an email address Siteping accepts — see {@link EMAIL_PATTERN}. */
export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}
