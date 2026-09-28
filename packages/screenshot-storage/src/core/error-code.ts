/**
 * Whether `error` carries the stable `code` — a structural match that holds
 * across bundle copies of the same error class, unlike `instanceof`.
 *
 * @param error - Any thrown value.
 * @param code - One of the codes in `constants/errors.ts`.
 */
export function hasErrorCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}
